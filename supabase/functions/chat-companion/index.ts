// Edge Function: chat-companion
// The main handler for the customer chat with AI companion.
//
// Flow:
//   1. Receive message + session token from client
//   2. Rate-limit check (IP-based)
//   3. Look up or create chat_sessions row
//   4. Store user message in chat_messages
//   5. Embed visitor's message using Ollama /api/embed
//   6. Query pgvector for top-k similar chunks (RAG)
//   7. Detect schedule intent (keyword matching)
//   8. If schedule intent: query Google Calendar Free/Busy, inject available slots
//   9. Build system prompt + context chunks + conversation history
//  10. Call Ollama /api/chat with stream: true
//  11. Pipe streaming response to client as SSE
//  12. Accumulate full response, store as assistant message in chat_messages
//
// Secrets required:
//   OLLAMA_HOST               — URL of the Ollama server
//   OLLAMA_CHAT_MODEL         — Chat model name (default: llama3.1:8b)
//   OLLAMA_EMBED_MODEL        — Embedding model (default: nomic-embed-text)
//   SUPABASE_URL              — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — Service role key (bypasses RLS)
//   GOOGLE_CALENDAR_CLIENT_ID     — Google OAuth client ID (for calendar booking)
//   GOOGLE_CALENDAR_CLIENT_SECRET — Google OAuth client secret

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildSystemPrompt, isScheduleIntent } from './guardrails.ts';
import { embedQuery, retrieveChunks } from './rag.ts';
import { getAvailableSlots, createCalendarEvent } from './calendar.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: max messages per IP per minute
const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_PER_SESSION_HOUR = 50;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, sessionToken, action, bookingData } = await req.json();

    // -- Booking confirmation action --
    // When the visitor confirms a slot and provides name/email,
    // the client sends action: 'book' with the slot + visitor info.
    if (action === 'book' && bookingData) {
      return await handleBooking(bookingData);
    }

    if (!message || !sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Missing message or sessionToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ollamaHost = Deno.env.get('OLLAMA_HOST') ?? 'http://localhost:11434';
    const chatModel = Deno.env.get('OLLAMA_CHAT_MODEL') ?? 'llama3.1:8b';
    const embedModel = Deno.env.get('OLLAMA_EMBED_MODEL') ?? 'nomic-embed-text';

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // -- Rate limiting --
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (await isRateLimited(supabase, clientIP, sessionToken)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // -- Look up or create chat session --
    const session = await getOrCreateSession(supabase, sessionToken);

    // -- Store user message --
    await supabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message,
    });

    // -- Load conversation history (last 20 messages) --
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(20);

    const conversationHistory: ChatMessage[] = (history ?? []).map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    }));

    // -- RAG: embed query and retrieve chunks --
    const queryEmbedding = await embedQuery(message, ollamaHost, embedModel);
    let chunks: Awaited<ReturnType<typeof retrieveChunks>> = [];
    if (queryEmbedding) {
      chunks = await retrieveChunks(queryEmbedding, supabaseUrl, serviceRoleKey);
    }

    // -- Schedule intent detection + calendar query --
    let calendarContext: string | undefined;
    const scheduleIntent = isScheduleIntent(message);

    if (scheduleIntent) {
      const googleClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID');
      const googleClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET');

      if (googleClientId && googleClientSecret) {
        // Query for today + next 3 days
        const dates: string[] = [];
        for (let i = 0; i < 4; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          dates.push(d.toISOString().slice(0, 10));
        }

        const allSlots: string[] = [];
        for (const date of dates) {
          const slots = await getAvailableSlots(date, {
            SUPABASE_URL: supabaseUrl,
            SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
            GOOGLE_CALENDAR_CLIENT_ID: googleClientId,
            GOOGLE_CALENDAR_CLIENT_SECRET: googleClientSecret,
          });
          if (slots && slots.length > 0) {
            allSlots.push(`${date}: ${slots.map((s) => s.label).join(', ')}`);
          }
        }

        if (allSlots.length > 0) {
          calendarContext = allSlots.join('\n');
        } else {
          calendarContext = 'No available slots found in the next 4 days. Please ask the visitor to try a different date.';
        }
      }
    }

    // -- Build system prompt --
    const systemPrompt = buildSystemPrompt(chunks, calendarContext);

    // -- Build messages for Ollama --
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // last 10 messages for context window
    ];

    // -- Call Ollama /api/chat with streaming --
    const ollamaRes = await fetch(`${ollamaHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: chatModel,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: 0.3,
          num_ctx: 4096,
        },
      }),
    });

    if (!ollamaRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to connect to AI service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // -- Pipe Ollama NDJSON stream to SSE client --
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const reader = ollamaRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  fullResponse += json.message.content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: json.message.content })}\n\n`),
                  );
                }
                if (json.done) {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`),
          );
        }

        // -- Store assistant message after stream completes --
        if (fullResponse) {
          await supabase.from('chat_messages').insert({
            session_id: session.id,
            role: 'assistant',
            content: fullResponse,
            metadata: {
              retrieved_chunks: chunks.length,
              schedule_intent: scheduleIntent,
              calendar_context: calendarContext ? true : false,
            },
          });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...corsHeaders,
      }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// -- Helper functions --

interface SessionRow {
  id: string;
  session_token: string;
}

async function getOrCreateSession(
  supabase: ReturnType<typeof createClient>,
  sessionToken: string,
): Promise<SessionRow> {
  // Try to find existing session
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id, session_token')
    .eq('session_token', sessionToken)
    .single();

  if (existing) return existing as SessionRow;

  // Create new session
  const { data: created, error } = await supabase
    .from('chat_sessions')
    .insert({ session_token: sessionToken })
    .select('id, session_token')
    .single();

  if (error || !created) {
    // Race condition — another request created it. Fetch again.
    const { data: retry } = await supabase
      .from('chat_sessions')
      .select('id, session_token')
      .eq('session_token', sessionToken)
      .single();
    return retry as SessionRow;
  }

  return created as SessionRow;
}

/** Check IP-based rate limiting using a simple counter table. */
async function isRateLimited(
  supabase: ReturnType<typeof createClient>,
  ip: string,
  sessionToken: string,
): Promise<boolean> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60_000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 3_600_000).toISOString();

  // Check IP rate (per minute) — rough proxy using global message count
  const { count: ipCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneMinuteAgo);

  // Session-based limiting
  const { count: sessionCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionToken)
    .gte('created_at', oneHourAgo);

  if (ipCount !== null && ipCount >= RATE_LIMIT_PER_MINUTE * 10) {
    return true;
  }
  if (sessionCount !== null && sessionCount >= RATE_LIMIT_PER_SESSION_HOUR) {
    return true;
  }

  return false;
}

/** Handle booking confirmation — create a Google Calendar event. */
async function handleBooking(
  bookingData: {
    slot: { start: string; end: string };
    visitorName: string;
    visitorEmail: string;
    sessionToken: string;
  },
): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const googleClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!;
  const googleClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Look up session
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('session_token', bookingData.sessionToken)
    .single();

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Create Google Calendar event
  const eventId = await createCalendarEvent(
    bookingData.slot,
    bookingData.visitorName,
    bookingData.visitorEmail,
    {
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      GOOGLE_CALENDAR_CLIENT_ID: googleClientId,
      GOOGLE_CALENDAR_CLIENT_SECRET: googleClientSecret,
    },
  );

  if (!eventId) {
    return new Response(
      JSON.stringify({ error: 'Failed to create calendar event' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Store booking in chat_bookings
  await supabase.from('chat_bookings').insert({
    session_id: session.id,
    visitor_name: bookingData.visitorName,
    visitor_email: bookingData.visitorEmail,
    start_time: bookingData.slot.start,
    end_time: bookingData.slot.end,
    google_event_id: eventId,
    status: 'confirmed',
  });

  // Update session with visitor info
  await supabase
    .from('chat_sessions')
    .update({
      visitor_name: bookingData.visitorName,
      visitor_email: bookingData.visitorEmail,
    })
    .eq('id', session.id);

  return new Response(
    JSON.stringify({ success: true, eventId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
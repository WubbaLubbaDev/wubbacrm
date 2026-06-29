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
//   OLLAMA_HOST               — URL of the Ollama server (use https://ollama.com for Ollama Cloud)
//   OLLAMA_API_KEY            — Ollama Cloud API key (optional; omit for a local Ollama server)
//   OLLAMA_CHAT_MODEL         — Chat model name (default: llama3.1:8b; e.g. qwen3.5 on Cloud)
//   GEMINI_API_KEY            — Google Gemini API key, used for embeddings (RAG)
//   GEMINI_EMBED_MODEL        — Gemini embedding model (default: gemini-embedding-2, 768-dim)
//   SUPABASE_URL              — Supabase project URL (auto-injected)
//   SUPABASE_SECRET_KEYS      — Auto-injected JSON dict; ['default'] is the
//                               service role key (bypasses RLS). The SUPABASE_
//                               prefix is reserved — do NOT set it as a custom secret.
//   GOOGLE_CLIENT_ID          — Google OAuth client ID (for calendar booking);
//                               SAME secret the Google Calendar integration set.
//   GOOGLE_CLIENT_SECRET      — Google OAuth client secret (same as above).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildSystemPrompt, isScheduleIntent } from './guardrails.ts';
import { embedQuery, retrieveChunks } from './rag.ts';
import { getAvailableSlots, createCalendarEvent } from './calendar.ts';
import { listBookableStaff, resolveStaff } from './staff.ts';

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
    // Service role key: Supabase auto-injects it inside SUPABASE_SECRET_KEYS
    // (a JSON dict; ['default'] is the service role key). The SUPABASE_ prefix
    // is reserved, so SUPABASE_SERVICE_ROLE_KEY cannot be set as a custom secret.
    const serviceRoleKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default'];
    const ollamaHost = Deno.env.get('OLLAMA_HOST') ?? 'http://localhost:11434';
    const ollamaApiKey = Deno.env.get('OLLAMA_API_KEY');
    const chatModel = Deno.env.get('OLLAMA_CHAT_MODEL') ?? 'llama3.1:8b';
    // Embeddings come from Gemini, not Ollama (Ollama Cloud has no embed models).
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;
    const geminiEmbedModel = Deno.env.get('GEMINI_EMBED_MODEL') ?? 'gemini-embedding-2';

    // Ollama Cloud requires a Bearer token on /api/chat; a local server needs none.
    const ollamaHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ollamaApiKey) {
      ollamaHeaders.Authorization = `Bearer ${ollamaApiKey}`;
    }

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
    const queryEmbedding = await embedQuery(message, geminiApiKey, geminiEmbedModel, 'RETRIEVAL_QUERY');
    let chunks: Awaited<ReturnType<typeof retrieveChunks>> = [];
    if (queryEmbedding) {
      chunks = await retrieveChunks(queryEmbedding, supabaseUrl, serviceRoleKey);
    }

    // -- Schedule intent detection + calendar query --
    // A booking spans multiple turns: the visitor first says "I'd like to book"
    // (keyword, no name), then later answers "Andrew" (name, no keyword). If we
    // only looked at the latest message, that follow-up turn would have no
    // schedule keyword and we'd never query the calendar. So detect intent AND
    // resolve the target across the recent user turns, not just this message.
    const recentUserText = conversationHistory
      .filter((m) => m.role === 'user')
      .slice(-5)
      .map((m) => m.content)
      .join('\n');

    let calendarContext: string | undefined;
    const scheduleIntent = isScheduleIntent(message) || isScheduleIntent(recentUserText);

    if (scheduleIntent) {
      // Reuse the same OAuth client secrets the Google Calendar integration
      // already set (GOOGLE_CLIENT_ID/SECRET) — secrets are shared across all
      // Edge Functions in the project, so no separate calendar secrets needed.
      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      if (googleClientId && googleClientSecret) {
        // Bookable people are all registered users who connected their calendar.
        const staff = await listBookableStaff(supabase);
        const names = staff.map((s) => s.name).join(', ');

        if (staff.length === 0) {
          calendarContext =
            'No team members have connected their calendar yet, so availability cannot be checked.';
        } else {
          // Figure out which team member the visitor wants to meet. Resolve
          // across recent turns so a name given in an earlier reply still counts.
          const target = resolveStaff(recentUserText, staff);

          if (!target) {
            calendarContext =
              `The visitor wants to schedule but has not clearly named a person. ` +
              `Bookable team members: ${names}. ` +
              `Ask the visitor which team member they would like to meet with.`;
          } else {
            const env = {
              SUPABASE_URL: supabaseUrl,
              SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
              GOOGLE_CALENDAR_CLIENT_ID: googleClientId,
              GOOGLE_CALENDAR_CLIENT_SECRET: googleClientSecret,
            };

            // Query target's calendar for today + next 3 days. Anchor dates to
            // Asia/Jakarta so "today"/"tomorrow" match the visitor's timezone
            // (the runtime clock is UTC and would drift a day near midnight WIB).
            const todayJakarta = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Jakarta',
            }).format(new Date());
            const base = new Date(`${todayJakarta}T00:00:00Z`);
            const dates: string[] = [];
            for (let i = 0; i < 4; i++) {
              const d = new Date(base);
              d.setUTCDate(d.getUTCDate() + i);
              dates.push(d.toISOString().slice(0, 10));
            }

            const allSlots: string[] = [];
            for (const date of dates) {
              const slots = await getAvailableSlots(date, target.userId, env);
              if (slots && slots.length > 0) {
                allSlots.push(`${date}: ${slots.map((s) => s.label).join(', ')}`);
              }
            }

            // Give the model the date anchor so it can map "tomorrow" → a date,
            // and make clear these are the ONLY genuinely-free slots (a date
            // missing from the list means that day is fully booked).
            const dateAnchor =
              `Today is ${dates[0]} (Asia/Jakarta). These are the only free ` +
              `30-minute slots; any date not listed is fully booked.`;

            if (allSlots.length > 0) {
              calendarContext =
                `${dateAnchor}\nAvailability for ${target.name} (next 4 days):\n${allSlots.join('\n')}`;
            } else {
              calendarContext =
                `${dateAnchor}\n${target.name} has no open slots in the next 4 days. ` +
                `Other bookable team members: ${names}.`;
            }
          }
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
      headers: ollamaHeaders,
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
    // Which team member to book with. Either the explicit user id, or a name
    // the client showed the visitor (resolved against the bookable list).
    staffUserId?: string;
    staffName?: string;
  },
): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default'];
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Resolve which team member's calendar to book on.
  const staff = await listBookableStaff(supabase);
  const target = bookingData.staffUserId
    ? staff.find((s) => s.userId === bookingData.staffUserId)
    : bookingData.staffName
      ? resolveStaff(bookingData.staffName, staff)
      : null;

  if (!target) {
    return new Response(
      JSON.stringify({ error: 'Could not determine which team member to book with' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

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

  // Create the Google Calendar event on the chosen team member's calendar.
  const eventId = await createCalendarEvent(
    bookingData.slot,
    bookingData.visitorName,
    bookingData.visitorEmail,
    target.userId,
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
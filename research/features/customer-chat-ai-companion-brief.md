# Customer Chat with AI Companion — Research Brief

## Objective

Build a public-facing chat widget that allows unauthenticated visitors to converse with an AI companion powered by Ollama. The AI answers only from a company knowledge base (RAG). When a visitor asks about scheduling, the system checks the dashboard user's Google Calendar for available slots and lets the visitor book an appointment. Visitors may chat in Bahasa Indonesia or English.

**Dependency:** This feature depends on Google Calendar Integration being implemented first. The chat UI and RAG pipeline can be built in parallel, but the calendar booking flow will not function until the Google Calendar integration is complete.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Visitor Browser (unauthenticated)                          │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │ Chat Widget   │───▶│ SSE/Fetch to Edge Function      │   │
│  │ (public route)│◀──│ (streaming tokens)               │   │
│  └──────────────┘    └──────────────┬──────────────────┘   │
└──────────────────────────────────────┼──────────────────────┘
                                       │
                         ┌─────────────▼──────────────┐
                         │  Supabase Edge Function     │
                         │  `chat-companion`           │
                         │  (Deno/TypeScript)          │
                         │                             │
                         │  1. Rate-limit check        │
                         │  2. Embed query (Ollama)    │
                         │  3. pgvector similarity     │
                         │     search → top-k chunks   │
                         │  4. Intent detection        │
                         │     (schedule?)             │
                         │  5. If schedule: call       │
                         │     Google Calendar API     │
                         │  6. Build system prompt +   │
                         │     context chunks          │
                         │  7. Ollama /api/chat stream │
                         │  8. Pipe tokens → SSE       │
                         │  9. Save messages to DB     │
                         └──────┬──────────┬───────────┘
                                │          │
                   ┌────────────▼──┐   ┌───▼──────────────┐
                   │  Supabase DB  │   │  Ollama Server    │
                   │  (pgvector)   │   │  (self-hosted or  │
                   │               │   │   cloud GPU)      │
                   │  chat_sessions│   │  /api/chat (stream)│
                   │  chat_messages│   │  /api/embed        │
                   │  kb_documents │   └───────────────────┘
                   │  kb_embeddings│
                   └───────────────┘
```

---

## Findings

### 1. Ollama Integration

#### API Endpoints

Ollama exposes a REST API at `http://<host>:11434`:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Chat completion with message array — **primary endpoint for this feature** |
| `/api/generate` | POST | Text completion (single prompt) |
| `/api/embed` | POST | Generate embeddings (replaces deprecated `/api/embeddings`) |
| `/api/tags` | GET | List locally available models |
| `/api/ps` | GET | List running (loaded) models |
| `/api/version` | GET | Ollama version |

**`/api/chat` request shape:**
```json
{
  "model": "llama3.1:8b",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant..." },
    { "role": "user", "content": "What services do you offer?" }
  ],
  "stream": true,
  "options": {
    "temperature": 0.3,
    "num_ctx": 4096
  }
}
```

**Streaming response:** When `stream: true` (default), Ollama returns a series of JSON objects (newline-delimited), one per token chunk:
```json
{
  "model": "llama3.1:8b",
  "created_at": "2024-01-01T00:00:00Z",
  "message": { "role": "assistant", "content": "We" },
  "done": false
}
```
The final object has `"done": true` and includes stats (`total_duration`, `prompt_eval_count`, `eval_count`, etc.).

Set `"stream": false` for a single non-streamed response.

**`/api/embed` request:**
```json
{
  "model": "nomic-embed-text",
  "input": "Text to embed"
}
```
Returns `{ "embeddings": [[...]] }` — an array of float arrays.

Sources:
- Ollama API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama streaming docs: https://docs.ollama.com/api/streaming

#### Bilingual Model Recommendation

| Model | Size | Bahasa Indonesia | English | Notes |
|---|---|---|---|---|
| **llama3.1:8b** | ~5GB | Good | Excellent | Strong general-purpose, multilingual. Best default choice. |
| **qwen2.5:7b** | ~4.7GB | Good | Excellent | Good multilingual, strong reasoning. Alternative to llama3.1. |
| **csalab/sahabatai1** (Sahabat-AI v1) | 16GB / 4.9GB (Q4) | **Best** (Indonesian-tuned) | Moderate | Purpose-built for Indonesian + Javanese + Sundanese. Highest SEA HELM scores. But 16GB for full model may be too heavy; Q4_K_M (4.9GB) is more practical. |
| mistral:7b | ~4.1GB | Moderate | Excellent | Good but less optimized for Bahasa. |

**Recommendation:** Use `llama3.1:8b` as the default chat model. It provides strong bilingual performance (Bahasa Indonesia + English), runs on modest hardware (8B params), and is the most widely tested with Ollama's tool-calling features. If Bahasa Indonesia quality is insufficient, switch to `csalab/sahabatai1:llama3_instruct_Q4_K_M` (4.9GB quantized) which is specifically tuned for Indonesian.

**Embedding model:** Use `nomic-embed-text` (274MB, 768 dimensions, 2K context). It surpasses OpenAI `text-embedding-ada-002` and `text-embedding-3-small` on benchmark tasks while being small and free. It is the most popular Ollama embedding model (76M+ downloads).

If multilingual embedding quality is critical, consider `nomic-embed-text-v2-moe` (multilingual MoE variant), but `nomic-embed-text` v1.5 is sufficient for bilingual ID/EN since both use Latin script and share much vocabulary.

Sources:
- Sahabat-AI: https://ollama.com/csalab/sahabatai1
- nomic-embed-text: https://ollama.com/library/nomic-embed-text
- Best Ollama models: https://www.morphllm.com/best-ollama-models
- Indonesian LLM guide: https://www.siliconflow.com/articles/en/best-open-source-LLM-for-Indonesian

#### Architecture: Supabase Edge Functions vs Separate Backend

**Recommendation: Use Supabase Edge Functions as the proxy layer.**

Rationale:
1. Edge Functions run on Deno (TypeScript), already integrated with the Supabase ecosystem.
2. Edge Functions support streaming responses via `ReadableStream` + `TextEncoderStream` — confirmed working for SSE.
3. The Edge Function acts as a secure proxy: it holds the Ollama server URL (never exposed to the client), performs RAG retrieval from pgvector, and pipes the Ollama streaming response back to the client as SSE.
4. Rate limiting can be implemented within the Edge Function using Supabase's built-in Redis or a simple DB counter.
5. No need for a separate Node.js backend — keeps the stack lean.

**Ollama server hosting:** Ollama must run on a server with a GPU (or sufficient CPU for small models). Options:
- Self-hosted on a VPS with GPU (e.g., AWS EC2 g4dn, DigitalOcean GPU droplet)
- Ollama Cloud (https://ollama.com/cloud) — managed Ollama hosting
- For development: run Ollama locally

The Edge Function connects to the Ollama server via its REST URL, configured as an Edge Function secret (`OLLAMA_HOST`).

**Edge Function streaming pattern (Deno):**
```typescript
Deno.serve(async (req: Request) => {
  const { messages, sessionId } = await req.json()

  // 1. RAG: embed query, search pgvector, build context
  const context = await retrieveContext(messages[messages.length - 1].content)

  // 2. Build augmented messages with system prompt + context
  const augmentedMessages = buildMessages(context, messages)

  // 3. Call Ollama /api/chat with stream: true
  const ollamaRes = await fetch(`${Deno.env.get('OLLAMA_HOST')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      messages: augmentedMessages,
      stream: true,
    }),
  })

  // 4. Pipe Ollama NDJSON stream → SSE stream to client
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const reader = ollamaRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          const json = JSON.parse(line)
          if (json.message?.content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: json.message.content })}\n\n`))
          }
          if (json.done) {
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
          }
        }
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }),
  })
})
```

Sources:
- Supabase AI inference: https://supabase.com/blog/ai-inference-now-available-in-supabase-edge-functions
- Supabase Edge Function streaming: https://github.com/orgs/supabase/discussions/13124
- Reddit confirmation Edge Functions can stream LLM: https://www.reddit.com/r/Supabase/comments/1ntpyp5/

#### Streaming Transport: SSE vs WebSocket

**Recommendation: SSE (Server-Sent Events).**

Rationale:
- Chat is unidirectional (server → client streaming). SSE is simpler than WebSocket for this.
- SSE works over standard HTTP — no upgrade handshake, easier to proxy.
- `EventSource` API is built into browsers, but since we need POST (to send message array), use `fetch()` with a `ReadableStream` reader on the client side instead.
- WebSocket is overkill for one-directional token streaming. Would only be needed if we wanted real-time bidirectional features (e.g., multiple users typing simultaneously in a shared session).

**Client-side SSE consumption via fetch:**
```typescript
async function streamChat(messages: Message[], onToken: (chunk: string) => void) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-companion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ messages, sessionId }),
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        const json = JSON.parse(data)
        if (json.content) onToken(json.content)
      }
    }
  }
}
```

### 2. Knowledge Base Architecture (RAG)

#### RAG Pipeline

1. **Document ingestion** (dashboard user uploads company knowledge — FAQs, service descriptions, pricing, policies, about us, etc.)
2. **Chunking**: Split documents into ~500-1000 token chunks with overlap (~100-200 tokens) to preserve context across boundaries.
3. **Embedding**: Generate embeddings for each chunk using `nomic-embed-text` via Ollama `/api/embed`.
4. **Storage**: Store chunks + embeddings in Supabase `kb_embeddings` table (pgvector).
5. **Retrieval**: At query time, embed the visitor's message, perform cosine similarity search against `kb_embeddings`, retrieve top-k (3-5) chunks.
6. **Augmentation**: Inject retrieved chunks into the system prompt as context.
7. **Generation**: Ollama generates a response grounded in the provided context.

#### pgvector Setup

Enable the extension (Supabase Dashboard → Database → Extensions → search "vector" → enable):

```sql
create extension if not exists vector;
```

**Embedding dimensions:** `nomic-embed-text` produces 768-dimensional vectors.

```sql
create table kb_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references kb_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz default now()
);
```

**HNSW index** (recommended over IVFFlat for better speed-recall tradeoff):

```sql
create index on kb_embeddings using hnsw (embedding vector_cosine_ops);
```

**Similarity search query:**
```sql
select
  id, document_id, chunk_index, content,
  1 - (embedding <=> $1) as similarity
from kb_embeddings
where 1 - (embedding <=> $1) > 0.7
order by embedding <=> $1
limit 5;
```

The `<=>` operator computes cosine distance. `1 - distance` gives cosine similarity (0 to 1). Filter by a threshold (e.g., 0.7) to exclude irrelevant chunks.

**Important caveat:** When using HNSW index with additional `WHERE` filters, you may get fewer rows than requested. Use iterative index scans if needed. For this feature, we filter only by similarity threshold (computed from the vector itself), so this is not an issue.

Sources:
- Supabase pgvector docs: https://supabase.com/docs/guides/database/extensions/pgvector
- Supabase semantic search: https://supabase.com/docs/guides/ai/semantic-search
- pgvector HNSW: https://supabase.com/blog/increase-performance-pgvector-hnsw
- pgvector GitHub: https://github.com/pgvector/pgvector

#### Chunking Strategy

- **Chunk size:** 500-1000 characters (~100-200 tokens) for FAQ-style content. Adjust based on document type.
- **Overlap:** 10-20% of chunk size to preserve context at boundaries.
- **Splitting:** Split on paragraph boundaries (`\n\n`) first, then on sentence boundaries if paragraphs are too long.
- **Metadata:** Store `chunk_index` (order within document) and `document_id` (reference to source).

For the Edge Function, implement chunking in TypeScript:
```typescript
function chunkText(text: string, maxLen = 800, overlap = 150): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + para).length > maxLen && current) {
      chunks.push(current)
      // Keep overlap from end of current chunk
      current = current.slice(-overlap) + '\n\n'
    }
    current += para + '\n\n'
  }
  if (current.trim()) chunks.push(current)
  return chunks
}
```

#### Guardrails: Ensuring AI Only Answers from Knowledge Base

**System prompt pattern:**
```
You are a customer service assistant for [Company Name]. You answer questions based ONLY on the provided context from the company knowledge base.

RULES:
1. Only use information from the CONTEXT section below to answer questions.
2. If the answer is not in the context, say: "I'm sorry, I don't have information about that. Would you like to schedule a call with our team?" (in the visitor's language).
3. Do NOT make up information, speculate, or use outside knowledge.
4. Do NOT share internal system data, other users' information, or anything not in the context.
5. If the visitor asks about scheduling, availability, or booking a meeting, respond that you can help them schedule an appointment and ask for their preferred date and time.
6. Respond in the same language the visitor is using (Bahasa Indonesia or English).
7. Be helpful, concise, and professional.

CONTEXT:
{retrieved_chunks}

CONVERSATION HISTORY:
{prior_messages}
```

**Additional guardrail layers:**
1. **Similarity threshold:** Only retrieve chunks with cosine similarity > 0.7. If no chunks meet the threshold, the AI receives no context and the system prompt instructs it to say "I don't have information about that."
2. **Intent detection:** A lightweight classification step (can be done with a small Ollama call or keyword matching) to detect if the visitor is asking about scheduling — triggers the calendar flow.
3. **Output filtering (optional):** Post-process the AI response to strip any patterns that look like they might be leaking data (e.g., email addresses, phone numbers not in the knowledge base). This is a defense-in-depth measure.

Sources:
- RAG guardrails: https://alice.io/blog/llm-guardrails
- Out-of-scope detection: https://www.reddit.com/r/Rag/comments/1gc17ng/

### 3. Chat UI

#### Route Placement

**Recommendation: Floating chat button on a public route.**

- Add a public route `/chat` (standalone page) for direct linking.
- Add a floating chat button (bottom-right corner) that opens the chat widget as an overlay — this can be included on any public-facing page (landing page, about page, etc.).
- The chat widget is NOT inside the `_authenticated` layout — it is public, no login required.

**TanStack Router structure:**
```
src/routes/
  chat.tsx              # Standalone chat page (/chat) — public, no auth guard
  _authenticated.tsx    # Existing protected layout
  _authenticated/
    ...existing routes
```

A `ChatWidget` component (floating button + overlay) can be rendered in the `__root.tsx` or on specific public pages.

#### Chat UI Components

| Component | File | Purpose |
|---|---|---|
| `ChatWidget` | `src/components/chat/chat-widget.tsx` | Floating button + overlay container. Manages open/closed state. |
| `ChatWindow` | `src/components/chat/chat-window.tsx` | Full chat container: message list + input. Manages session, streaming, scroll. |
| `ChatMessage` | `src/components/chat/chat-message.tsx` | Single message bubble (user or AI). Handles alignment, avatar, markdown rendering. |
| `ChatInput` | `src/components/chat/chat-input.tsx` | Text input + send button. Auto-resize textarea, Enter to send, Shift+Enter for newline. |
| `TypingIndicator` | `src/components/chat/typing-indicator.tsx` | Three-dot animated bouncing indicator shown while AI is generating. |
| `ChatSuggestions` | `src/components/chat/chat-suggestions.tsx` | Optional: suggested questions shown when chat opens (empty state). |

See `component-patterns.md` for exact Tailwind classes for each component (patched separately).

#### Streaming Rendering

**Recommendation: Chunk-by-chunk rendering (not character-by-character).**

- As SSE tokens arrive, append each token chunk to the current AI message content.
- Use React state (`useState` + `useRef` for accumulation) to re-render the message bubble as tokens stream in.
- Auto-scroll to bottom on each new chunk.
- Show `TypingIndicator` before the first token arrives, then replace with the streaming message.

```typescript
const [messages, setMessages] = useState<Message[]>([])
const [isStreaming, setIsStreaming] = useState(false)

async function sendMessage(text: string) {
  // Add user message
  setMessages(prev => [...prev, { role: 'user', content: text }])

  // Add empty AI message that will be filled as tokens stream
  setMessages(prev => [...prev, { role: 'assistant', content: '' }])
  setIsStreaming(true)

  await streamChat(
    [...messages, { role: 'user', content: text }],
    (chunk) => {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: updated[updated.length - 1].content + chunk,
        }
        return updated
      })
    }
  )
  setIsStreaming(false)
}
```

#### Language Detection

**Recommendation: Auto-detect via the model, no explicit toggle.**

- The system prompt instructs the model to "respond in the same language the visitor is using."
- `llama3.1:8b` and Sahabat-AI both handle Bahasa Indonesia and English well enough to auto-detect.
- No UI toggle needed — the model follows the user's language automatically.
- If a visitor switches mid-conversation, the model will follow the switch.

**Alternative (if auto-detect is unreliable):** Add a small language toggle (ID/EN) in the chat header that sets a `language` hint in the system prompt. Simpler to implement but adds UI complexity.

#### Mobile Responsive Chat

- Chat widget: full-screen on mobile (`fixed inset-0`), floating button on desktop (`fixed bottom-4 right-4`).
- Use Tailwind responsive classes: `max-h-[600px] h-[80vh] sm:h-[600px] w-full sm:w-[400px]`.
- Chat input: full width, sticky at bottom.
- Message bubbles: `max-w-[80%]` to keep them readable on narrow screens.

### 4. Google Calendar Integration Dependency

**This feature depends on Google Calendar Integration being complete.** The research can proceed, but the calendar booking flow cannot be coded until:
1. Dashboard user has authenticated with Google OAuth (Calendar scopes).
2. Google Calendar access tokens are stored (in Supabase or server-side).
3. Google Calendar API client is available (for querying free/busy and creating events).

#### Booking Flow

When a visitor asks about scheduling/availability, the system:

1. **Detects intent:** The Edge Function detects schedule-related intent via keyword matching (`schedule`, `meeting`, `appointment`, `booking`, `janji`, `temu`, `jadwal`) or a lightweight Ollama classification call.

2. **Queries Google Calendar Free/Busy:**
   - Endpoint: `POST https://www.googleapis.com/calendar/v3/freeBusy`
   - Scopes required: `https://www.googleapis.com/auth/calendar` or `https://www.googleapis.com/auth/calendar.readonly` (read-only is sufficient for free/busy query; full calendar scope needed to create events)
   - Request body:
   ```json
   {
     "timeMin": "2026-06-27T00:00:00+07:00",
     "timeMax": "2026-06-27T23:59:59+07:00",
     "timeZone": "Asia/Jakarta",
     "items": [{ "id": "primary" }]
   }
   ```
   - Response: `calendars.primary.busy[]` — array of `{ start, end }` busy blocks.
   - Derive free slots by subtracting busy blocks from the query window, filtering to business hours (e.g., 09:00-17:00 Asia/Jakarta).

3. **Presents available slots:** The AI responds with available time slots (in the visitor's language) and asks the visitor to choose one and provide their name + email.

4. **Creates Google Calendar event:**
   - Endpoint: `POST https://www.googleapis.com/calendar/v3/calendars/primary/events`
   - Scope: `https://www.googleapis.com/auth/calendar` (full calendar scope required for event creation)
   - Request body:
   ```json
   {
     "summary": "Appointment with [visitor name]",
     "description": "Booked via AI Companion chat",
     "start": { "dateTime": "2026-06-27T10:00:00+07:00", "timeZone": "Asia/Jakarta" },
     "end": { "dateTime": "2026-06-27T10:30:00+07:00", "timeZone": "Asia/Jakarta" },
     "attendees": [{ "email": "visitor@example.com" }]
   }
   ```

5. **Confirms booking:** The AI confirms the appointment details to the visitor.

#### Data the Visitor Needs to Provide

- **Name** (required — for the calendar event title)
- **Email** (required — for the calendar event attendee + confirmation)
- **Preferred date/time** (required — the AI extracts this from the conversation and maps it to an available slot)

#### Connecting Chat Flow to Calendar API

The Edge Function handles the calendar integration:
1. When schedule intent is detected, the Edge Function calls the Google Calendar API server-side using the dashboard user's stored OAuth token.
2. The available slots are injected into the Ollama context so the AI can present them naturally.
3. When the visitor confirms a slot + provides name/email, the Edge Function creates the event and returns confirmation.
4. This requires a multi-turn state machine in the Edge Function: `detect_intent → query_calendar → present_slots → collect_info → create_event → confirm`.

Sources:
- Google Calendar Free/Busy API: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Google Calendar OAuth scopes: https://developers.google.com/workspace/calendar/api/auth
- Google Calendar event creation: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert

### 5. Security and Data Privacy

#### Rate Limiting (Unauthenticated Abuse Prevention)

**Approach: IP-based rate limiting in the Edge Function.**

Supabase provides a rate-limiting pattern using Redis (available via Upstash integration) or a simple database counter:

| Limit | Value |
|---|---|
| Messages per IP per minute | 10 |
| Messages per session per hour | 50 |
| Sessions per IP per day | 20 |

Implementation: At the start of the Edge Function, check/increment a counter keyed by IP address. If exceeded, return 429 Too Many Requests.

**Optional: hCaptcha or Cloudflare Turnstile** for the first message (invisible captcha, no user interaction needed for low-suspicion traffic). Add only if spam becomes a problem.

Sources:
- Supabase rate limiting: https://supabase.com/docs/guides/functions/examples/rate-limiting
- Supabase Edge Function auth: https://supabase.com/docs/guides/functions/auth

#### Knowledge Base Isolation

The AI must NOT leak:
- Dashboard user data (contacts, deals, internal notes)
- Other visitors' chat history
- Internal system data (database schema, API keys, internal URLs)

**Enforcement mechanisms:**
1. **RAG-only retrieval:** The Edge Function only queries `kb_embeddings` (knowledge base). It never queries contacts, deals, or any other table. The AI cannot access what is never retrieved.
2. **System prompt guardrails:** Explicit instructions to only use provided context and refuse out-of-scope questions.
3. **Separate schema/RLS:** Knowledge base tables are isolated with RLS policies that only allow the Edge Function (using service role key) to read them. The anon key has no access.
4. **No tool calling for data access:** The Ollama model is not given tools that could query the database. It only receives pre-retrieved context chunks.

#### Supabase RLS Policies

**Knowledge base tables (read-only via service role only):**
```sql
-- kb_documents: no anon access, service role only
alter table kb_documents enable row level security;
-- No policy = no access for anon/authenticated. Service role bypasses RLS.

-- kb_embeddings: no anon access, service role only
alter table kb_embeddings enable row level security;
```

**Chat tables (anonymous but isolated):**
```sql
-- chat_sessions: visitors can only see their own session (by session token)
alter table chat_sessions enable row level security;

create policy "visitors_manage_own_session" on chat_sessions
  for all using (session_token = current_setting('app.session_token', true));

-- chat_messages: visitors can only see messages in their own session
alter table chat_messages enable row level security;

create policy "visitors_read_own_messages" on chat_messages
  for select using (
    session_id in (
      select id from chat_sessions where session_token = current_setting('app.session_token', true)
    )
  );
```

In practice, the Edge Function uses the service role key to insert chat messages (bypassing RLS), and the client never directly queries these tables — all reads go through the Edge Function.

#### Anonymous Visitor Sessions

- On first chat open, the client generates a random `session_token` (UUID v4) stored in `sessionStorage`.
- The `session_token` is sent with every message to the Edge Function.
- The Edge Function creates/looks up a `chat_sessions` row by `session_token`.
- Chat history is tied to the session token, not to an authenticated user.
- Sessions expire after 24 hours of inactivity (can be cleaned up by a scheduled job).

### 6. Supabase Schema

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- ============================================================
-- Chat tables (anonymous visitor sessions)
-- ============================================================

create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,          -- client-generated UUID, stored in sessionStorage
  visitor_name text,                           -- collected during booking flow
  visitor_email text,                          -- collected during booking flow
  language text default 'id',                  -- detected language (id/en)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz default now() + interval '24 hours'
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb,                              -- optional: retrieved chunks, intent, etc.
  created_at timestamptz default now()
);

create index on chat_messages (session_id, created_at);

-- RLS for chat tables
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
-- No policies for anon = no direct client access. Edge Function uses service role key.

-- ============================================================
-- Knowledge base tables
-- ============================================================

create table kb_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,                       -- full document text
  source_type text,                            -- 'faq', 'page', 'manual', 'pdf', etc.
  source_url text,                             -- optional original URL
  metadata jsonb,                              -- optional extra metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table kb_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references kb_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,                       -- the chunk text
  embedding vector(768) not null,              -- nomic-embed-text dimensions
  created_at timestamptz default now()
);

-- HNSW index for fast similarity search
create index on kb_embeddings using hnsw (embedding vector_cosine_ops);

create index on kb_embeddings (document_id);

-- RLS for knowledge base tables
alter table kb_documents enable row level security;
alter table kb_embeddings enable row level security;
-- No policies for anon = no direct client access. Edge Function uses service role key.

-- ============================================================
-- Bookings table (tracks appointments booked via chat)
-- ============================================================

create table chat_bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  visitor_name text not null,
  visitor_email text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  google_event_id text,                        -- ID of created Google Calendar event
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz default now()
);
```

### 7. Edge Function Design

**Single Edge Function: `chat-companion`**

Handles the full flow:
1. Receive message + session token from client.
2. Rate-limit check (IP-based).
3. Look up or create `chat_sessions` row.
4. Store user message in `chat_messages`.
5. Embed visitor's message using Ollama `/api/embed`.
6. Query pgvector for top-k similar chunks.
7. Detect schedule intent (keyword matching or Ollama classification).
8. If schedule intent: query Google Calendar Free/Busy, inject available slots into context.
9. Build system prompt + context chunks + conversation history.
10. Call Ollama `/api/chat` with `stream: true`.
11. Pipe streaming response to client as SSE.
12. Accumulate full response, store as assistant message in `chat_messages` after stream completes.

**Environment variables (Edge Function secrets):**
- `OLLAMA_HOST` — URL of the Ollama server (e.g., `http://localhost:11434` or cloud URL)
- `OLLAMA_CHAT_MODEL` — model name (default: `llama3.1:8b`)
- `OLLAMA_EMBED_MODEL` — embedding model (default: `nomic-embed-text`)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (for DB access, bypassing RLS)
- `GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET` / `GOOGLE_CALENDAR_REFRESH_TOKEN` — for calendar API access (from Google Calendar integration)

---

## Recommendation

### Approach Summary

1. **Ollama hosting:** Self-hosted on a GPU VPS or Ollama Cloud. Use `llama3.1:8b` for chat, `nomic-embed-text` for embeddings.
2. **Proxy:** Supabase Edge Function (`chat-companion`) acts as the middleware — handles RAG retrieval, intent detection, calendar queries, and streams Ollama responses to the client via SSE.
3. **RAG:** Store company knowledge in `kb_documents` + `kb_embeddings` (pgvector, 768-dim, HNSW index). Retrieve top-5 chunks by cosine similarity > 0.7.
4. **Chat UI:** Public floating chat widget + standalone `/chat` route. Components: ChatWidget, ChatWindow, ChatMessage, ChatInput, TypingIndicator. Auto-detect language (ID/EN) via system prompt.
5. **Calendar booking:** Detect schedule intent → query Google Calendar Free/Busy → present slots → collect visitor name/email → create event → confirm. **Depends on Google Calendar Integration being complete.**
6. **Security:** IP-based rate limiting in Edge Function. RLS on all tables (service role only). System prompt guardrails. No tool calling for the model. Knowledge base isolation.
7. **Anonymous sessions:** Client-generated UUID stored in `sessionStorage`. Chat history tied to session token, not user auth.

### Why This Approach

- **Supabase Edge Functions** keep everything in one platform (DB + auth + edge compute). No separate backend to maintain. Streaming is confirmed working.
- **Ollama** is free, self-hostable, and supports streaming via standard HTTP. No per-token API costs.
- **pgvector** stores embeddings in the same database as everything else — no separate vector DB. HNSW index provides fast similarity search.
- **SSE** is simpler than WebSocket for unidirectional streaming and works through standard HTTP.
- **System prompt guardrails + similarity threshold + RLS** provide three layers of data leak prevention.

---

## Implementation Notes for the Coder

### Step 1: Database Setup
1. Enable `vector` extension in Supabase Dashboard.
2. Run the SQL schema above (chat_sessions, chat_messages, kb_documents, kb_embeddings, chat_bookings + indexes + RLS).
3. Verify with a test insert + similarity query.

### Step 2: Ollama Server
1. Install Ollama on the hosting server: `curl -fsSL https://ollama.com/install.sh | sh`
2. Pull models: `ollama pull llama3.1:8b` and `ollama pull nomic-embed-text`
3. Verify: `curl http://<host>:11434/api/version`
4. Set `OLLAMA_HOST` as an Edge Function secret.

### Step 3: Knowledge Base Ingestion
1. Create a script (or dashboard UI) to upload company knowledge documents.
2. For each document: chunk the text → embed each chunk via Ollama `/api/embed` → insert into `kb_embeddings`.
3. This can be a Supabase Edge Function triggered by a database webhook on `kb_documents` insert, or a one-time admin script.

### Step 4: Chat Edge Function
1. Create `supabase/functions/chat-companion/index.ts`.
2. Implement the flow described in section 7.
3. Deploy: `supabase functions deploy chat-companion`.
4. Set secrets: `supabase secrets set OLLAMA_HOST=... OLLAMA_CHAT_MODEL=... etc.`

### Step 5: Chat UI Components
1. Create components in `src/components/chat/`: ChatWidget, ChatWindow, ChatMessage, ChatInput, TypingIndicator.
2. Use the Tailwind classes from `component-patterns.md` (chat section).
3. Create public route `src/routes/chat.tsx`.
4. Add floating ChatWidget to public pages or `__root.tsx`.

### Step 6: Calendar Integration (after Google Calendar Integration is complete)
1. Wire the intent detection → Free/Busy query → slot presentation → event creation flow.
2. Store bookings in `chat_bookings` table.
3. This step is blocked until Google Calendar OAuth + token storage is implemented.

### File Structure
```
src/
  components/
    chat/
      chat-widget.tsx
      chat-window.tsx
      chat-message.tsx
      chat-input.tsx
      typing-indicator.tsx
      chat-suggestions.tsx
      use-chat.ts              # hook: session management, streaming, message state
  routes/
    chat.tsx                   # public standalone chat page
  lib/
    chat-stream.ts             # SSE stream parsing utility
```

### Supabase Edge Function
```
supabase/
  functions/
    chat-companion/
      index.ts                 # main handler
      rag.ts                   # embedding + retrieval logic
      calendar.ts              # Google Calendar Free/Busy + event creation
      guardrails.ts            # system prompt builder, intent detection
```

---

## Open Questions

1. **Ollama hosting:** Where will the Ollama server run? Self-hosted GPU VPS or Ollama Cloud? The Coder needs the `OLLAMA_HOST` URL to configure the Edge Function. — *Needs human decision based on budget and infrastructure.*

2. **Google Calendar Integration status:** When will the Google Calendar Integration feature be implemented? The chat booking flow is blocked on this. — *Needs confirmation from the project planner.*

3. **Knowledge base content:** Who will create/upload the initial company knowledge base documents (FAQs, services, pricing, etc.)? Is there an admin UI for this, or will it be a manual SQL/script process? — *Needs human input on content source.*

4. **Business hours for scheduling:** What are the default business hours for available slots? (e.g., 09:00-17:00 Asia/Jakarta, Monday-Friday?) — *Needs human input.*

5. **Appointment duration:** What is the default appointment duration? (30 minutes? 60 minutes? Configurable?) — *Needs human input.*

6. **Session persistence:** Should chat history persist across browser sessions (localStorage instead of sessionStorage), or is it ephemeral per browser session? — *Low priority, default to sessionStorage for now.*

---

## Sources

- Ollama API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama streaming: https://docs.ollama.com/api/streaming
- Sahabat-AI (Indonesian model): https://ollama.com/csalab/sahabatai1
- nomic-embed-text: https://ollama.com/library/nomic-embed-text
- Best Ollama models: https://www.morphllm.com/best-ollama-models
- Supabase pgvector: https://supabase.com/docs/guides/database/extensions/pgvector
- Supabase semantic search: https://supabase.com/docs/guides/ai/semantic-search
- pgvector HNSW: https://supabase.com/blog/increase-performance-pgvector-hnsw
- Supabase AI inference: https://supabase.com/blog/ai-inference-now-available-in-supabase-edge-functions
- Supabase Edge Function streaming: https://github.com/orgs/supabase/discussions/13124
- Supabase rate limiting: https://supabase.com/docs/guides/functions/examples/rate-limiting
- Supabase Edge Function auth: https://supabase.com/docs/guides/functions/auth
- Google Calendar Free/Busy: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Google Calendar OAuth scopes: https://developers.google.com/workspace/calendar/api/auth
- RAG guardrails: https://alice.io/blog/llm-guardrails
- Out-of-scope detection: https://www.reddit.com/r/Rag/comments/1gc17ng/
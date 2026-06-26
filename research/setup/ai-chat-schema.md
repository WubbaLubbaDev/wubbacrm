# Supabase Schema: pgvector, Chat & Knowledge Base Tables

Schema patterns for the Customer Chat with AI Companion feature. These tables are in addition to any existing CRM tables.

## pgvector Extension

Enable the `vector` extension (Supabase Dashboard → Database → Extensions → search "vector" → enable):

```sql
create extension if not exists vector;
```

The extension name is `vector` (not `pgvector`). Once enabled, the `vector(N)` column type is available.

## Vector Dimensions by Embedding Model

| Model | Dimensions | Source |
|---|---|---|
| nomic-embed-text (Ollama) | 768 | https://ollama.com/library/nomic-embed-text |
| gte-small (Supabase built-in) | 384 | Supabase Edge Functions AI inference |
| text-embedding-3-small (OpenAI) | 1536 | OpenAI API |

For this project: **nomic-embed-text** (768 dimensions) — self-hosted via Ollama, no API cost.

## HNSW Index (recommended over IVFFlat)

HNSW provides better speed-recall tradeoff than IVFFlat. Create the index after inserting data for best build quality (or before — HNSW supports incremental inserts):

```sql
create index on kb_embeddings using hnsw (embedding vector_cosine_ops);
```

Available operators for different distance functions:
- `vector_cosine_ops` — cosine distance (`<=>`)
- `vector_l2_ops` — L2/Euclidean distance (`<->`)
- `vector_ip_ops` — inner product (`<#>`)

Use `vector_cosine_ops` with nomic-embed-text (embeddings are normalized, cosine similarity is appropriate).

## Similarity Search Query

```sql
-- $1 is the query embedding (vector(768))
select
  id,
  document_id,
  chunk_index,
  content,
  1 - (embedding <=> $1) as similarity
from kb_embeddings
where 1 - (embedding <=> $1) > 0.7   -- similarity threshold
order by embedding <=> $1             -- ascending distance = descending similarity
limit 5;                              -- top-k chunks
```

**Caveat:** When using HNSW index with additional `WHERE` filters on other columns, you may get fewer rows than `LIMIT`. For this feature, the only filter is the similarity threshold (computed from the vector itself), so this is not an issue. If adding metadata filters, use [iterative index scans](https://github.com/pgvector/pgvector#iterative-index-scans).

## Full Schema

See the feature brief (`features/customer-chat-ai-companion-brief.md` → section 6) for the complete SQL schema including:
- `chat_sessions` — anonymous visitor sessions (session_token, visitor_name, visitor_email, language, expiry)
- `chat_messages` — message history (session_id, role, content, metadata)
- `kb_documents` — knowledge base source documents (title, content, source_type, source_url)
- `kb_embeddings` — chunked embeddings (document_id, chunk_index, content, embedding vector(768))
- `chat_bookings` — appointments booked via chat (session_id, visitor info, time, google_event_id, status)

## RLS Strategy

| Table | Anon access | Authenticated access | Service role |
|---|---|---|---|
| chat_sessions | None | None | Full (bypass RLS) |
| chat_messages | None | None | Full (bypass RLS) |
| kb_documents | None | None | Full (bypass RLS) |
| kb_embeddings | None | None | Full (bypass RLS) |
| chat_bookings | None | None | Full (bypass RLS) |

**No RLS policies for anon/authenticated users.** All access goes through the Edge Function using the service role key, which bypasses RLS. The client never directly queries these tables.

This is the strongest isolation pattern:
1. The visitor's browser only talks to the Edge Function.
2. The Edge Function uses the service role key to read/write DB rows.
3. The anon key (used by the browser) has zero access to chat/knowledge base tables.
4. The AI model only receives pre-retrieved context chunks — it cannot query the database.

## Edge Function Environment Variables

Set as Supabase Edge Function secrets:

| Variable | Purpose |
|---|---|
| `OLLAMA_HOST` | URL of the Ollama server (e.g., `http://localhost:11434`) |
| `OLLAMA_CHAT_MODEL` | Chat model name (default: `llama3.1:8b`) |
| `OLLAMA_EMBED_MODEL` | Embedding model name (default: `nomic-embed-text`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (DB access, bypasses RLS) |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google OAuth client ID (for calendar booking) |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALENDAR_REFRESH_TOKEN` | Dashboard user's refresh token (from Google Calendar integration) |

## Sources

- Supabase pgvector docs: https://supabase.com/docs/guides/database/extensions/pgvector
- Supabase semantic search: https://supabase.com/docs/guides/ai/semantic-search
- pgvector HNSW blog: https://supabase.com/blog/increase-performance-pgvector-hnsw
- pgvector GitHub: https://github.com/pgvector/pgvector
- Supabase AI inference: https://supabase.com/blog/ai-inference-now-available-in-supabase-edge-functions
- Supabase Edge Function auth: https://supabase.com/docs/guides/functions/auth
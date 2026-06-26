-- Customer Chat with AI Companion: pgvector, chat sessions, knowledge base, bookings
-- Run this migration via Supabase SQL Editor or `supabase db push`
--
-- Requires the `vector` extension (pgvector). Enable it in:
--   Supabase Dashboard → Database → Extensions → search "vector" → enable

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Chat tables (anonymous visitor sessions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,          -- client-generated UUID, stored in sessionStorage
  visitor_name TEXT,                           -- collected during booking flow
  visitor_email TEXT,                          -- collected during booking flow
  language TEXT DEFAULT 'id',                  -- detected language (id/en)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours'
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,                              -- optional: retrieved chunks, intent, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON public.chat_messages (session_id, created_at);

-- RLS for chat tables — no direct client access.
-- The Edge Function uses the service role key (bypasses RLS).
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Knowledge base tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,                       -- full document text
  source_type TEXT,                            -- 'faq', 'page', 'manual', 'pdf', etc.
  source_url TEXT,                             -- optional original URL
  metadata JSONB,                              -- optional extra metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kb_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,                       -- the chunk text
  embedding vector(768) NOT NULL,              -- nomic-embed-text dimensions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_hnsw
  ON public.kb_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_kb_embeddings_document
  ON public.kb_embeddings (document_id);

-- RLS for knowledge base tables — no direct client access.
ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Bookings table (tracks appointments booked via chat)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  google_event_id TEXT,                        -- ID of created Google Calendar event
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_bookings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Auto-update updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS kb_documents_updated_at ON public.kb_documents;
CREATE TRIGGER kb_documents_updated_at
  BEFORE UPDATE ON public.kb_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
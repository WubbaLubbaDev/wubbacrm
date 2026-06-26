-- pgvector similarity search RPC function for the chat companion RAG pipeline.
-- Called by the chat-companion Edge Function to retrieve relevant knowledge-base chunks.
--
-- Requires the `vector` extension and the `kb_embeddings` table from migration 0002.

CREATE OR REPLACE FUNCTION public.match_kb_embeddings(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_index INT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.document_id,
    e.chunk_index,
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.kb_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
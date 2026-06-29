// RAG: embedding generation (Google Gemini) + pgvector similarity retrieval.
// Ollama Cloud serves no embedding models, so embeddings come from Gemini's
// embedContent API (multilingual, free tier). Chat still runs on Ollama Cloud.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { RetrievedChunk } from './guardrails.ts';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Generate a 768-dimensional embedding for `text` via Gemini embedContent.
 * `taskType` must be 'RETRIEVAL_QUERY' for a visitor's search query and
 * 'RETRIEVAL_DOCUMENT' for stored knowledge-base chunks — the two are designed
 * to be compared against each other, so the seed script must use DOCUMENT.
 * outputDimensionality is pinned to 768 to match the kb_embeddings vector(768)
 * column; gemini-embedding-2 auto-normalizes truncated dimensions.
 */
export async function embedQuery(
  text: string,
  apiKey: string,
  model = 'gemini-embedding-2',
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' = 'RETRIEVAL_QUERY',
): Promise<number[] | null> {
  const res = await fetch(`${GEMINI_BASE}/${model}:embedContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: 768,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  // embedContent returns { embedding: { values: [...] } }; tolerate the batch
  // shape { embeddings: [{ values: [...] }] } as well.
  return data.embedding?.values ?? data.embeddings?.[0]?.values ?? null;
}

/**
 * Retrieve the top-k most similar knowledge-base chunks for a query embedding.
 * Uses cosine similarity with a threshold filter (> 0.7).
 */
export async function retrieveChunks(
  queryEmbedding: number[],
  supabaseUrl: string,
  serviceRoleKey: string,
  topK = 5,
  threshold = 0.7,
): Promise<RetrievedChunk[]> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Call the match_kb_embeddings RPC function (defined in migration 0003)
  const { data, error } = await supabase.rpc('match_kb_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error || !data) return [];

  return data as RetrievedChunk[];
}
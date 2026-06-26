// RAG: embedding generation + pgvector similarity retrieval.
// Uses Ollama's /api/embed endpoint for embeddings and Supabase for vector search.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { RetrievedChunk } from './guardrails.ts';

/** Generate an embedding for a text query using Ollama /api/embed. */
export async function embedQuery(
  text: string,
  ollamaHost: string,
  embedModel: string,
): Promise<number[] | null> {
  const res = await fetch(`${ollamaHost}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: embedModel, input: text }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.embeddings?.[0] ?? null;
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
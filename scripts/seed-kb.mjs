// Knowledge-base seeding script for the Customer Chat AI Companion (RAG).
//
// Reads every *.md file in scripts/kb/, chunks it, embeds each chunk with the
// Gemini embedContent API (RETRIEVAL_DOCUMENT, 768-dim — same model the Edge
// Function uses for queries), and inserts the rows into kb_documents +
// kb_embeddings. Existing KB rows are wiped first for a clean reseed.
//
// Run:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... \
//     node scripts/seed-kb.mjs
//
// or, with the values in .env.local (Node 20.6+):
//   node --env-file=.env.local scripts/seed-kb.mjs
//
// Required env:
//   SUPABASE_URL                — your project URL (same as VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY   — service_role key (Dashboard → Settings → API);
//                                 needed to bypass RLS on the KB tables.
//   GEMINI_API_KEY              — Google Gemini API key (aistudio.google.com/apikey)
//   GEMINI_EMBED_MODEL          — optional, default 'gemini-embedding-2'

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const KB_DIR = join(dirname(fileURLToPath(import.meta.url)), 'kb');
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-2';
const MAX_CHUNK_CHARS = 1500; // ~comfortably under the model's token limit
const EMBED_DELAY_MS = 300; // be gentle with the free-tier rate limit

function requireEnv(name, ...fallbacks) {
  for (const key of [name, ...fallbacks]) {
    if (process.env[key]) return process.env[key];
  }
  const names = [name, ...fallbacks].join(' or ');
  console.error(`Missing required env var: ${names}`);
  process.exit(1);
}

// SUPABASE_URL falls back to VITE_SUPABASE_URL (already in .env.local), so you
// only need to add SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY there.
const SUPABASE_URL = requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = requireEnv('GEMINI_API_KEY');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Split markdown into ~MAX_CHUNK_CHARS chunks on paragraph boundaries. */
function chunk(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';
  for (const p of paragraphs) {
    if (current && current.length + p.length + 2 > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current}\n\n${p}` : p;
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Embed one chunk as a knowledge-base document via Gemini. Returns float[768]. */
async function embed(text) {
  const res = await fetch(`${GEMINI_BASE}/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini embed failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const values = data.embedding?.values ?? data.embeddings?.[0]?.values;
  if (!values) throw new Error(`Unexpected Gemini response: ${JSON.stringify(data)}`);
  return values;
}

/** Title from the first markdown H1, else the filename. */
function titleFor(content, filename) {
  const h1 = content.match(/^\s*#\s+(.+)$/m);
  return h1 ? h1[1].trim() : filename.replace(/\.md$/, '');
}

async function main() {
  let files;
  try {
    files = (await readdir(KB_DIR)).filter((f) => f.endsWith('.md'));
  } catch {
    console.error(`No KB directory at ${KB_DIR}. Create it and add .md files.`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.error(`No .md files in ${KB_DIR}. Add your knowledge-base content first.`);
    process.exit(1);
  }

  // Pre-flight: verify the Supabase credentials work BEFORE the destructive
  // clear, so a bad key fails with a clear message and touches nothing.
  const { error: pingErr } = await supabase
    .from('kb_documents')
    .select('id', { count: 'exact', head: true });
  if (pingErr) {
    console.error(`\n❌ Cannot reach the database: ${pingErr.message}`);
    if (/api key/i.test(pingErr.message)) {
      console.error(
        '   → SUPABASE_SERVICE_ROLE_KEY looks wrong. Use the service-role / secret\n' +
        '     key (sb_secret_… or the service_role JWT), not the anon/publishable key.',
      );
    }
    process.exit(1);
  }

  // Clean reseed: kb_embeddings cascades from kb_documents, so deleting docs
  // clears embeddings too. Delete-all via an always-true filter.
  console.log('Clearing existing knowledge base…');
  const { error: clearErr } = await supabase.from('kb_documents').delete().not('id', 'is', null);
  if (clearErr) throw new Error(`Failed to clear knowledge base: ${clearErr.message}`);

  let totalChunks = 0;
  for (const file of files) {
    const raw = await readFile(join(KB_DIR, file), 'utf8');
    const title = titleFor(raw, file);

    const { data: doc, error: docErr } = await supabase
      .from('kb_documents')
      .insert({ title, content: raw, source_type: 'manual' })
      .select('id')
      .single();
    if (docErr) throw new Error(`Insert kb_documents failed for ${file}: ${docErr.message}`);

    const chunks = chunk(raw);
    console.log(`• ${file} → "${title}" (${chunks.length} chunks)`);

    for (let i = 0; i < chunks.length; i++) {
      const values = await embed(chunks[i]);
      const { error: embErr } = await supabase.from('kb_embeddings').insert({
        document_id: doc.id,
        chunk_index: i,
        content: chunks[i],
        // pgvector accepts its text input format: "[0.1,0.2,...]"
        embedding: `[${values.join(',')}]`,
      });
      if (embErr) throw new Error(`Insert kb_embeddings failed (${file} #${i}): ${embErr.message}`);
      totalChunks++;
      await sleep(EMBED_DELAY_MS);
    }
  }

  console.log(`\n✅ Seeded ${files.length} document(s), ${totalChunks} chunk(s).`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});

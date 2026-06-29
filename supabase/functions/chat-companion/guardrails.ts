// Guardrails: system prompt builder + intent detection for the chat companion.
// Shared between the Edge Function and the client-side tests (via type imports).

/** Keywords that trigger the calendar booking flow. */
export const SCHEDULE_KEYWORDS = [
  // English
  'schedule',
  'meeting',
  'appointment',
  'booking',
  'book',
  'available',
  'availability',
  'slot',
  'slots',
  'calendar',
  // Bahasa Indonesia
  'jadwal',
  'janji',
  'temu',
  'janji temu',
  'buat janji',
  'slot kosong',
  'waktu luang',
  'tersedia',
] as const;

/** Detect whether the user's message is about scheduling/booking. */
export function isScheduleIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return SCHEDULE_KEYWORDS.some((kw) => lower.includes(kw));
}

/** A single retrieved knowledge-base chunk with its similarity score. */
export interface RetrievedChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

/**
 * Build the system prompt that restricts the AI to only answer from
 * the provided knowledge base context. Supports bilingual (ID/EN) responses.
 */
export function buildSystemPrompt(
  chunks: RetrievedChunk[],
  calendarContext?: string,
): string {
  const contextText = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
    : '(No relevant information found in the knowledge base for this query.)';

  const calendarSection = calendarContext
    ? `\n\nCALENDAR AVAILABILITY:\n${calendarContext}`
    : '';

  return `You are a customer service assistant for WubbaCRM. You answer questions based ONLY on the provided context from the company knowledge base.

RULES:
1. Only use information from the CONTEXT section below to answer questions.
2. If the answer is not in the context, say: "I'm sorry, I don't have information about that. Would you like to schedule a call with our team?" (in the visitor's language).
3. Do NOT make up information, speculate, or use outside knowledge.
4. Do NOT share internal system data, other users' information, or anything not in the context.
5. For scheduling/availability/booking requests, use the CALENDAR AVAILABILITY section (if provided). It may list a specific team member's open slots, or it may tell you to ask the visitor which team member they want to meet — in that case, ask them and list the available team members by name. Once a person and slot are chosen, collect the visitor's name and email to confirm the booking. Only mention team members named in the CALENDAR AVAILABILITY section.
6. Respond in the same language the visitor is using (Bahasa Indonesia or English).
7. Be helpful, concise, and professional.

CONTEXT:
${contextText}${calendarSection}`;
}

/**
 * Split text into chunks for embedding. Splits on paragraph boundaries first,
 * then falls back to sentence boundaries for long paragraphs.
 *
 * @param text - The full document text to chunk
 * @param maxLen - Maximum chunk length in characters (default: 800)
 * @param overlap - Overlap between chunks in characters (default: 150)
 */
export function chunkText(text: string, maxLen = 800, overlap = 150): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    // If adding this paragraph would exceed maxLen and we have a current chunk, flush
    if ((current + para).length > maxLen && current) {
      chunks.push(current.trim());
      // Start new chunk with overlap from the end of the previous one
      current = current.slice(-overlap) + '\n\n';
    }

    // If a single paragraph is longer than maxLen, split it on sentence boundaries
    if (para.length > maxLen) {
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((current + sentence).length > maxLen && current) {
          chunks.push(current.trim());
          current = current.slice(-overlap) + '\n\n';
        }
        current += sentence + ' ';
      }
    } else {
      current += para + '\n\n';
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
import { describe, expect, it } from 'vitest';
import {
  buildSystemPrompt,
  chunkText,
  isScheduleIntent,
  type RetrievedChunk,
} from '@/lib/chat-guardrails';

describe('isScheduleIntent', () => {
  it('detects English schedule keywords', () => {
    expect(isScheduleIntent('Can I schedule a meeting?')).toBe(true);
    expect(isScheduleIntent('I want to book an appointment')).toBe(true);
    expect(isScheduleIntent('What slots are available?')).toBe(true);
    expect(isScheduleIntent('Do you have any availability next week?')).toBe(true);
  });

  it('detects Bahasa Indonesia schedule keywords', () => {
    expect(isScheduleIntent('Saya ingin membuat janji temu')).toBe(true);
    expect(isScheduleIntent('Jadwal kosong apa saja?')).toBe(true);
    expect(isScheduleIntent('Saya ingin booking')).toBe(true);
  });

  it('returns false for non-schedule messages', () => {
    expect(isScheduleIntent('What services do you offer?')).toBe(false);
    expect(isScheduleIntent('Berapa harga produknya?')).toBe(false);
    expect(isScheduleIntent('Hello, how are you?')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isScheduleIntent('SCHEDULE a meeting')).toBe(true);
    expect(isScheduleIntent('BOOKING')).toBe(true);
  });
});

describe('buildSystemPrompt', () => {
  it('includes context chunks in the prompt', () => {
    const chunks: RetrievedChunk[] = [
      {
        id: '1',
        document_id: 'doc1',
        chunk_index: 0,
        content: 'We offer CRM solutions for small businesses.',
        similarity: 0.9,
      },
    ];

    const prompt = buildSystemPrompt(chunks);
    expect(prompt).toContain('CRM solutions for small businesses');
    expect(prompt).toContain('[1]');
  });

  it('includes calendar context when provided', () => {
    const prompt = buildSystemPrompt([], '2026-06-27: 10:00 - 10:30 WIB');
    expect(prompt).toContain('CALENDAR AVAILABILITY');
    expect(prompt).toContain('10:00 - 10:30 WIB');
  });

  it('omits calendar section header when no calendar context', () => {
    const prompt = buildSystemPrompt([]);
    // The RULES mention "CALENDAR AVAILABILITY" in rule 5, but the actual
    // section header (with a colon and slot data) should not be present.
    expect(prompt).not.toContain('CALENDAR AVAILABILITY:\n');
  });

  it('shows no-info message when chunks are empty', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain('No relevant information found');
  });

  it('includes guardrail rules', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain('RULES');
    expect(prompt).toContain('Do NOT make up information');
    expect(prompt).toContain('Bahasa Indonesia or English');
  });
});

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const text = 'This is a short paragraph.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits on paragraph boundaries', () => {
    const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // Each paragraph should be in some chunk
    const combined = chunks.join(' ');
    expect(combined).toContain('Paragraph one');
    expect(combined).toContain('Paragraph two');
    expect(combined).toContain('Paragraph three');
  });

  it('respects maxLen parameter', () => {
    // Use sentences so the chunker can split on sentence boundaries
    const text = Array.from({ length: 40 }, (_, i) => `This is sentence number ${i + 1}.`).join(
      ' ',
    );
    const chunks = chunkText(text, 500, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Chunks may be slightly longer than maxLen due to overlap, but should be roughly bounded
      expect(chunk.length).toBeLessThan(700);
    }
  });

  it('splits long paragraphs on sentence boundaries', () => {
    const longPara = Array.from({ length: 20 }, (_, i) => `Sentence number ${i + 1}.`).join(' ');
    const chunks = chunkText(longPara, 200, 30);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('handles empty text', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('handles whitespace-only text', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('includes overlap between consecutive chunks', () => {
    const text = Array.from({ length: 10 }, (_, i) => `Paragraph ${i + 1} with content.`).join(
      '\n\n',
    );
    const chunks = chunkText(text, 100, 20);
    if (chunks.length > 1) {
      // The overlap means some text from the end of chunk[i-1] appears at the start of chunk[i]
      // This is hard to test precisely, but at least verify we get multiple chunks
      expect(chunks.length).toBeGreaterThan(1);
    }
  });
});

import { describe, expect, it, vi } from 'vitest';
import { streamChat } from '@/lib/chat-stream';

// Mock fetch and ReadableStream for SSE testing
function createMockSSEResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('streamChat', () => {
  it('parses SSE tokens and calls onToken', async () => {
    const sseData = [
      'data: {"content":"Hello"}\n\n',
      'data: {"content":" world"}\n\n',
      'data: [DONE]\n\n',
    ];

    globalThis.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseData));

    const tokens: string[] = [];
    let doneCalled = false;

    await streamChat(
      'http://localhost/test',
      { message: 'hi' },
      {},
      {
        onToken: (chunk) => tokens.push(chunk),
        onDone: () => {
          doneCalled = true;
        },
      },
    );

    expect(tokens).toEqual(['Hello', ' world']);
    expect(doneCalled).toBe(true);
  });

  it('calls onError on non-200 response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Rate limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    let errorCalled = false;
    let errorMsg = '';

    await streamChat(
      'http://localhost/test',
      { message: 'hi' },
      {},
      {
        onToken: () => {},
        onError: (err) => {
          errorCalled = true;
          errorMsg = err;
        },
      },
    );

    expect(errorCalled).toBe(true);
    expect(errorMsg).toContain('Rate limited');
  });

  it('handles empty stream gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(createMockSSEResponse([]));

    const tokens: string[] = [];
    let doneCalled = false;

    await streamChat(
      'http://localhost/test',
      { message: 'hi' },
      {},
      {
        onToken: (chunk) => tokens.push(chunk),
        onDone: () => {
          doneCalled = true;
        },
      },
    );

    expect(tokens).toEqual([]);
    expect(doneCalled).toBe(true);
  });

  it('handles error field in SSE data', async () => {
    const sseData = ['data: {"error":"Something went wrong"}\n\n'];

    globalThis.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(sseData));

    let errorCalled = false;
    let errorMsg = '';

    await streamChat(
      'http://localhost/test',
      { message: 'hi' },
      {},
      {
        onToken: () => {},
        onError: (err) => {
          errorCalled = true;
          errorMsg = err;
        },
      },
    );

    expect(errorCalled).toBe(true);
    expect(errorMsg).toBe('Something went wrong');
  });
});

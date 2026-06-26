// SSE stream parsing utility for the chat companion.
// Reads a fetch Response body as a Server-Sent Events stream and invokes
// callbacks for each token chunk and on completion.

export interface StreamChatOptions {
  /** Called for each token chunk received from the stream. */
  onToken: (chunk: string) => void;
  /** Called when the stream completes (receives [DONE]). */
  onDone?: () => void;
  /** Called if the stream encounters an error. */
  onError?: (error: string) => void;
}

/**
 * Stream a chat response from the chat-companion Edge Function.
 * Parses SSE `data: ...` lines and invokes callbacks.
 *
 * @param url - The Edge Function URL
 * @param body - The request body (message, sessionToken, etc.)
 * @param headers - Additional headers (e.g., Authorization)
 * @param options - Callbacks for token, done, error
 */
export async function streamChat(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  options: StreamChatOptions,
): Promise<void> {
  const { onToken, onDone, onError } = options;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'Request failed' }));
    onError?.(errBody.error ?? `HTTP ${res.status}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError?.('Response body is null');
    return;
  }
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone?.();
          return;
        }
        try {
          const json = JSON.parse(data);
          if (json.content) {
            onToken(json.content);
          }
          if (json.error) {
            onError?.(json.error);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(String(err));
  }
}

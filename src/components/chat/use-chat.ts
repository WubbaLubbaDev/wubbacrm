// use-chat: custom hook managing chat state — messages, streaming, session token.
// Handles session creation (UUID in sessionStorage), message sending, and SSE streaming.

import { useCallback, useRef, useState } from 'react';
import { streamChat } from '@/lib/chat-stream';

export interface ChatMessageData {
  role: 'user' | 'assistant';
  content: string;
}

const SESSION_TOKEN_KEY = 'wubbacrm_chat_session_token';
const EDGE_FUNCTION_PATH = '/functions/v1/chat-companion';

/** Get or create a session token from sessionStorage. */
function getSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

/** Build the Edge Function URL from the Supabase env var. */
function getEdgeFunctionUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}${EDGE_FUNCTION_PATH}`;
}

/** Build the Authorization header from the Supabase anon key. */
function getAuthHeaders(): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const authVal = `Bearer ${anonKey}`;
  return { Authorization: authVal };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef<string>(getSessionToken());

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setError(null);

      // Add user message
      const userMessage: ChatMessageData = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMessage]);

      // Add empty AI message that will be filled as tokens stream
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      setIsStreaming(true);

      let assistantContent = '';

      await streamChat(
        getEdgeFunctionUrl(),
        { message: text, sessionToken: sessionTokenRef.current },
        getAuthHeaders(),
        {
          onToken: (chunk) => {
            assistantContent += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: assistantContent,
              };
              return updated;
            });
          },
          onDone: () => {
            setIsStreaming(false);
          },
          onError: (err) => {
            setError(err);
            setIsStreaming(false);
            // Replace empty assistant message with error message
            setMessages((prev) => {
              const updated = [...prev];
              if (updated[updated.length - 1]?.content === '') {
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: 'Sorry, I encountered an error. Please try again.',
                };
              }
              return updated;
            });
          },
        },
      );
    },
    [isStreaming],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
    sessionToken: sessionTokenRef.current,
  };
}

// ChatWindow: full chat container — header + message list + input.
// Manages session, streaming, and auto-scroll.

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';
import { ChatSuggestions } from './chat-suggestions';
import { TypingIndicator } from './typing-indicator';
import { useChat } from './use-chat';

const DEFAULT_SUGGESTIONS = [
  'What services do you offer?',
  'I want to schedule a meeting',
  'Apa saja layanan yang tersedia?',
  'Saya ingin membuat janji temu',
];

interface ChatWindowProps {
  /** Optional title shown in the header. */
  title?: string;
  /** Whether to show the close button. */
  onClose?: () => void;
  /** Whether this is a standalone page (not a floating widget). */
  standalone?: boolean;
}

export function ChatWindow({ title = 'AI Assistant', onClose, standalone }: ChatWindowProps) {
  const { messages, isStreaming, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming tokens
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages is needed to trigger scroll on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;
  // Show typing indicator only when streaming and the last assistant message is still empty
  const showTyping =
    isStreaming && messages.length > 0 && messages[messages.length - 1].content === '';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
            AI
          </span>
        </div>
        {onClose && !standalone && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Message list */}
      <div className={cn('flex-1 overflow-y-auto px-4 py-4 space-y-4')}>
        {!hasMessages && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Hi! I&apos;m the WubbaCRM assistant. How can I help you today?
            </p>
            <ChatSuggestions suggestions={DEFAULT_SUGGESTIONS} onSelect={sendMessage} />
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={`${message.role}-${message.content.slice(0, 20)}`} message={message} />
        ))}

        {showTyping && (
          <div className="flex justify-start gap-2">
            <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="size-2 rounded-full bg-foreground/40" />
            </span>
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}

// ChatMessage: single message bubble (user or AI). Handles alignment and avatar.

import { Bot } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ChatMessageData } from './use-chat';

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot className="size-4 text-foreground" />
      </span>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground whitespace-pre-wrap',
        )}
      >
        {message.content || '\u00A0'}
      </div>
    </div>
  );
}

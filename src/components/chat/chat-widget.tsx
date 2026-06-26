// ChatWidget: floating button + overlay container.
// Manages open/closed state. Renders as full-screen on mobile, floating panel on desktop.

import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { ChatWindow } from './chat-window';

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <>
        {/* Overlay backdrop — visible on mobile, transparent on desktop */}
        <div
          className="fixed inset-0 z-50 bg-black/50 sm:bg-transparent"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        {/* Chat container — full-screen on mobile, floating panel on desktop */}
        <div
          className={cn(
            'fixed z-50 flex flex-col bg-card',
            'inset-0 sm:bottom-20 sm:right-4 sm:inset-auto',
            'sm:h-[600px] sm:w-[400px] sm:rounded-xl sm:border sm:shadow-xl',
          )}
          role="dialog"
          aria-label="Chat with AI Assistant"
        >
          <ChatWindow onClose={() => setOpen(false)} />
        </div>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open chat"
      className={cn(
        'fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center',
        'rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <MessageCircle className="size-6" />
    </button>
  );
}

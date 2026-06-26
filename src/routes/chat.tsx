// Public standalone chat page — no auth required.
// Visitors can chat with the AI companion at /chat.

import { createFileRoute } from '@tanstack/react-router';
import { ChatWindow } from '@/components/chat/chat-window';

export const Route = createFileRoute('/chat')({
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
        <ChatWindow title="WubbaCRM Assistant" standalone />
      </div>
    </div>
  );
}

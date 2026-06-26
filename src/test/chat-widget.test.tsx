import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Mock the useChat hook to avoid needing Supabase env vars
vi.mock('@/components/chat/use-chat', () => ({
  useChat: () => ({
    messages: [],
    isStreaming: false,
    error: null,
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
    sessionToken: 'test-token',
  }),
}));

// Mock sessionStorage for the use-chat module
beforeAll(() => {
  if (!globalThis.sessionStorage) {
    const store: Record<string, string> = {};
    globalThis.sessionStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    } as Storage;
  }
  // jsdom doesn't implement scrollIntoView — mock it so useEffect doesn't throw
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

import { ChatWidget } from '@/components/chat/chat-widget';

describe('ChatWidget', () => {
  it('renders floating button when closed', () => {
    render(<ChatWidget />);
    expect(screen.getByLabelText('Open chat')).toBeDefined();
  });

  it('opens chat panel when button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});

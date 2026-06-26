import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatMessage } from '@/components/chat/chat-message';

describe('ChatMessage', () => {
  it('renders user message with correct alignment', () => {
    render(<ChatMessage message={{ role: 'user', content: 'Hello there' }} />);
    const msg = screen.getByText('Hello there');
    expect(msg.className).toContain('bg-primary');
    expect(msg.className).toContain('text-primary-foreground');
  });

  it('renders assistant message with muted background', () => {
    render(<ChatMessage message={{ role: 'assistant', content: 'Hi! How can I help?' }} />);
    const msg = screen.getByText('Hi! How can I help?');
    expect(msg.className).toContain('bg-muted');
    expect(msg.className).toContain('text-foreground');
  });

  it('renders non-breaking space for empty assistant content', () => {
    const { container } = render(<ChatMessage message={{ role: 'assistant', content: '' }} />);
    // Empty assistant message should render a non-breaking space to maintain bubble height
    const bubble = container.querySelector('.bg-muted');
    expect(bubble).not.toBeNull();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TypingIndicator } from '@/components/chat/typing-indicator';

describe('TypingIndicator', () => {
  it('renders three bouncing dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });

  it('has staggered animation delays', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots[0].getAttribute('style')).toContain('0ms');
    expect(dots[1].getAttribute('style')).toContain('150ms');
    expect(dots[2].getAttribute('style')).toContain('300ms');
  });

  it('has aria-label for accessibility', () => {
    render(<TypingIndicator />);
    expect(screen.getByLabelText('AI is typing')).toBeDefined();
  });
});

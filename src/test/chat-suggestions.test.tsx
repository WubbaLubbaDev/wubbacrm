import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatSuggestions } from '@/components/chat/chat-suggestions';

describe('ChatSuggestions', () => {
  it('renders all suggestion buttons', () => {
    const suggestions = ['What services do you offer?', 'Schedule a meeting'];
    render(<ChatSuggestions suggestions={suggestions} onSelect={() => {}} />);

    expect(screen.getByText('What services do you offer?')).toBeDefined();
    expect(screen.getByText('Schedule a meeting')).toBeDefined();
  });

  it('calls onSelect with the suggestion text when clicked', () => {
    const onSelect = vi.fn();
    render(<ChatSuggestions suggestions={['Hello']} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Hello'));
    expect(onSelect).toHaveBeenCalledWith('Hello');
  });
});

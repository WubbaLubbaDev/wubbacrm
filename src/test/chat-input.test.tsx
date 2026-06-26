import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatInput } from '@/components/chat/chat-input';

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    render(<ChatInput onSend={() => {}} />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDefined();
  });

  it('calls onSend when send button is clicked', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('does not call onSend when input is empty', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls onSend on Enter key press (without Shift)', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send on Shift+Enter (allows newline)', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(textarea, { target: { value: 'Test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears input after sending', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(textarea.value).toBe('');
  });

  it('disables send button when disabled prop is true', () => {
    render(<ChatInput onSend={() => {}} disabled />);
    const btn = screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

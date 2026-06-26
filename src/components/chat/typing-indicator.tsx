// TypingIndicator: three-dot animated bouncing indicator shown while AI is generating.

export function TypingIndicator() {
  return (
    <div role="status" className="flex items-center gap-1 px-3 py-2" aria-label="AI is typing">
      <span
        className="size-2 rounded-full bg-muted-foreground/50 animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="size-2 rounded-full bg-muted-foreground/50 animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="size-2 rounded-full bg-muted-foreground/50 animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

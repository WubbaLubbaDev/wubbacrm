// ChatSuggestions: suggested questions shown in the empty state (no messages yet).

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  return (
    <div className="flex flex-col gap-2 py-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="rounded-lg border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

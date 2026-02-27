interface SuggestionsPanelProps {
  suggestions: string[];
}

export function SuggestionsPanel({ suggestions }: SuggestionsPanelProps) {
  if (suggestions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-od-fg-muted">
        No suggestions.
      </div>
    );
  }

  return (
    <ul className="space-y-2 text-sm text-od-fg">
      {suggestions.map((s, i) => (
        <li key={i} className="flex gap-2 rounded-md border border-od-border p-3">
          <span className="mt-0.5 text-od-accent">&#8226;</span>
          <span className="leading-relaxed">{s}</span>
        </li>
      ))}
    </ul>
  );
}

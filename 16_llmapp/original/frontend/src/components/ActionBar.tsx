import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import type { ReviewProvider } from "@/types/review";

interface ActionBarProps {
  provider: ReviewProvider;
  language: string;
  isBusy: boolean;
  canSubmit: boolean;
  hasOutput: boolean;
  modelReady: boolean;
  isLocal: boolean;
  onProviderChange: (p: ReviewProvider) => void;
  onLanguageChange: (lang: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onClear: () => void;
}

export function ActionBar({
  provider,
  language,
  isBusy,
  canSubmit,
  hasOutput,
  modelReady,
  isLocal,
  onProviderChange,
  onLanguageChange,
  onSubmit,
  onCancel,
  onClear,
}: ActionBarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 rounded-md border border-od-border bg-od-base px-3 py-2 shadow-sm">
      {/* Provider toggle */}
      <div className="inline-flex rounded-md border border-od-border shadow-sm">
        <button
          type="button"
          onClick={() => onProviderChange("openai")}
          className={`px-3 py-1.5 text-xs font-medium ${
            provider === "openai"
              ? "bg-od-accent text-white"
              : "bg-od-base text-od-fg hover:bg-od-float"
          } rounded-l-md`}
        >
          OpenAI
        </button>
        <button
          type="button"
          onClick={() => onProviderChange("local")}
          className={`px-3 py-1.5 text-xs font-medium ${
            provider === "local"
              ? "bg-od-accent text-white"
              : "bg-od-base text-od-fg hover:bg-od-float"
          } rounded-r-md border-l border-od-border`}
        >
          Local
        </button>
      </div>

      {isLocal && modelReady && (
        <span className="inline-flex items-center gap-1 text-xs text-od-green">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-od-green" />
          Ready
        </span>
      )}

      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="rounded-md border border-od-border bg-od-base px-2 py-1.5 text-xs text-od-fg shadow-sm focus:border-od-accent focus:ring-1 focus:ring-od-accent focus:outline-none"
      >
        {SUPPORTED_LANGUAGES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <div className="flex-1" />

      {/* Action buttons */}
      {isBusy ? (
        <button
          onClick={onCancel}
          className="rounded-md border border-od-red/40 px-3 py-1.5 text-xs font-medium text-od-red hover:bg-od-red/10"
          title="Cancel (Esc)"
        >
          Cancel
        </button>
      ) : (
        <>
          {hasOutput && (
            <button
              onClick={onClear}
              className="rounded-md border border-od-border px-3 py-1.5 text-xs font-medium text-od-fg shadow-sm hover:bg-od-float"
            >
              Clear
            </button>
          )}
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-md bg-od-green px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Review (Cmd+Enter)"
          >
            Review
          </button>
        </>
      )}
    </div>
  );
}

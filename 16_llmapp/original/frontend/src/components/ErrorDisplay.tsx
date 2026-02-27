import type { ReviewError } from "@/types/errors";

interface ErrorDisplayProps {
  error: ReviewError;
  onAction: () => void;
  onFallback?: () => void;
}

export function ErrorDisplay({
  error,
  onAction,
  onFallback,
}: ErrorDisplayProps) {
  return (
    <div className="rounded-md border border-od-red/30 bg-od-red/5 p-4">
      <h3 className="mb-1 text-sm font-semibold text-od-red">{error.title}</h3>
      <p className="mb-3 text-sm leading-relaxed text-od-fg">{error.message}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onAction}
          className="rounded-md bg-od-red/15 px-3 py-1.5 text-xs font-medium text-od-red hover:bg-od-red/25"
        >
          {error.actionLabel}
        </button>
        {onFallback && error.action === "retry" && (
          <button
            onClick={onFallback}
            className="rounded-md border border-od-border px-3 py-1.5 text-xs font-medium text-od-fg shadow-sm hover:bg-od-float"
          >
            Try with local model
          </button>
        )}
      </div>
    </div>
  );
}

import { useElapsedTimer } from "@/hooks/useElapsedTimer";
import type { ReviewProvider } from "@/types/review";

interface GenerationStatusProps {
  isBusy: boolean;
  issueCount: number;
  provider: ReviewProvider;
  onCancel: () => void;
  onRetry?: () => void;
}

export function GenerationStatus({
  isBusy,
  issueCount,
  provider,
  onCancel,
  onRetry,
}: GenerationStatusProps) {
  const elapsed = useElapsedTimer(isBusy);

  if (!isBusy && issueCount === 0 && !onRetry) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-od-border bg-od-base px-4 py-2.5 shadow-sm">
      {isBusy && (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-od-border border-t-od-accent" />
          <span className="text-sm text-od-fg">
            {issueCount > 0
              ? `Found ${issueCount} issue${issueCount !== 1 ? "s" : ""}`
              : "Analyzing..."}
          </span>
          <span className="text-xs text-od-fg-muted">{elapsed.toFixed(1)}s</span>
          <span className="inline-flex items-center rounded-full bg-od-overlay/60 px-1.5 py-0.5 text-[10px] font-medium leading-none text-od-fg-muted">
            {provider === "local" ? "TinySwallow" : "OpenAI"}
          </span>
          <div className="flex-1" />
          <button
            onClick={onCancel}
            className="rounded-md border border-od-red/40 px-2.5 py-1 text-xs font-medium text-od-red hover:bg-od-red/10"
          >
            Cancel
          </button>
        </>
      )}
      {!isBusy && onRetry && (
        <>
          <span className="text-sm text-od-fg-muted">Review failed</span>
          <div className="flex-1" />
          <button
            onClick={onRetry}
            className="rounded-md bg-od-accent/15 px-2.5 py-1 text-xs font-medium text-od-accent hover:bg-od-accent/25"
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}

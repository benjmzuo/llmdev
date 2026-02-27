import type { ReviewIssue, ReviewProvider } from "@/types/review";

interface SummaryBarProps {
  issues: ReviewIssue[];
  summary: string | null;
  provider: ReviewProvider;
}

export function SummaryBar({ issues, summary, provider }: SummaryBarProps) {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return (
    <div className="flex items-center gap-3 rounded-md border border-od-border bg-od-base px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-od-fg-bright">
          {issues.length} issue{issues.length !== 1 ? "s" : ""}
        </span>
        {errorCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-od-red/15 px-2 py-0.5 text-xs font-medium text-od-red">
            {errorCount} error{errorCount !== 1 ? "s" : ""}
          </span>
        )}
        {warningCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-od-yellow/15 px-2 py-0.5 text-xs font-medium text-od-yellow">
            {warningCount} warning{warningCount !== 1 ? "s" : ""}
          </span>
        )}
        {infoCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-od-accent/15 px-2 py-0.5 text-xs font-medium text-od-accent">
            {infoCount} info
          </span>
        )}
      </div>
      <div className="mx-1 h-4 w-px bg-od-border" />
      <span className="text-xs text-od-fg-muted">
        {provider === "local" ? "TinySwallow (Local)" : "OpenAI"}
      </span>
      {summary && (
        <>
          <div className="mx-1 h-4 w-px bg-od-border" />
          <span className="truncate text-xs text-od-fg">{summary}</span>
        </>
      )}
    </div>
  );
}

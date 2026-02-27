import { SEVERITY_STYLES } from "@/constants/review";
import type { ReviewIssue } from "@/types/review";

const SEVERITY_BORDER: Record<string, string> = {
  error: "border-l-od-red",
  warning: "border-l-od-yellow",
  info: "border-l-od-accent",
};

interface IssueCardProps {
  issue: ReviewIssue;
  isActive?: boolean;
  onClick?: () => void;
}

export function IssueCard({ issue, isActive, onClick }: IssueCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-md border border-l-[3px] p-3 transition-colors ${
        SEVERITY_BORDER[issue.severity] ?? "border-l-od-border"
      } ${
        isActive
          ? "border-od-accent/50 bg-od-accent/5"
          : "border-od-border hover:bg-od-float/50"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${SEVERITY_STYLES[issue.severity]}`}
        >
          {issue.severity}
        </span>
        {issue.line != null && (
          <span className="font-mono text-xs text-od-fg-muted">L{issue.line}</span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-od-fg-bright">{issue.message}</p>
      {issue.suggestion && (
        <p className="mt-1.5 text-sm leading-relaxed text-od-fg">
          <span className="font-medium text-od-fg-muted">Suggestion:</span>{" "}
          {issue.suggestion}
        </p>
      )}
    </div>
  );
}

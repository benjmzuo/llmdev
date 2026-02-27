import { IssueCard } from "@/components/IssueCard";
import type { ReviewIssue } from "@/types/review";

interface IssuesPanelProps {
  issues: ReviewIssue[];
  activeIndex: number | null;
  onSelectIssue: (index: number) => void;
}

export function IssuesPanel({
  issues,
  activeIndex,
  onSelectIssue,
}: IssuesPanelProps) {
  if (issues.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-od-fg-muted">
        No issues found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {issues.map((issue, i) => (
        <IssueCard
          key={`${issue.severity}-${issue.line}-${i}`}
          issue={issue}
          isActive={activeIndex === i}
          onClick={() => onSelectIssue(i)}
        />
      ))}
    </div>
  );
}

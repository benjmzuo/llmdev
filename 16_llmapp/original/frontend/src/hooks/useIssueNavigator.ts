import { useCallback } from "react";

import type { ReviewIssue } from "@/types/review";

interface UseIssueNavigatorProps {
  issues: ReviewIssue[];
  activeIndex: number | null;
  onSelectIssue: (index: number) => void;
}

export function useIssueNavigator({
  issues,
  activeIndex,
  onSelectIssue,
}: UseIssueNavigatorProps) {
  const nextIssue = useCallback(() => {
    if (issues.length === 0) return;
    const next = activeIndex === null ? 0 : (activeIndex + 1) % issues.length;
    onSelectIssue(next);
  }, [issues.length, activeIndex, onSelectIssue]);

  const prevIssue = useCallback(() => {
    if (issues.length === 0) return;
    const prev =
      activeIndex === null
        ? issues.length - 1
        : (activeIndex - 1 + issues.length) % issues.length;
    onSelectIssue(prev);
  }, [issues.length, activeIndex, onSelectIssue]);

  return { nextIssue, prevIssue };
}

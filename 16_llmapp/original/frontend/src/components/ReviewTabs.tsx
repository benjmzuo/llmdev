import type { ReviewTab } from "@/types/ui";

interface TabDef {
  id: ReviewTab;
  label: string;
  count: number;
}

interface ReviewTabsProps {
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  issueCount: number;
  hunkCount: number;
  suggestionCount: number;
  children: React.ReactNode;
}

export function ReviewTabs({
  activeTab,
  onTabChange,
  issueCount,
  hunkCount,
  suggestionCount,
  children,
}: ReviewTabsProps) {
  const tabs: TabDef[] = [
    { id: "issues", label: "Issues", count: issueCount },
    { id: "diff", label: "Diff", count: hunkCount },
    { id: "suggestions", label: "Suggestions", count: suggestionCount },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-od-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-od-fg-bright"
                : "text-od-fg-muted hover:text-od-fg"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                  activeTab === tab.id
                    ? "bg-od-accent/15 text-od-accent"
                    : "bg-od-overlay/60 text-od-fg-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-od-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-4">{children}</div>
    </div>
  );
}

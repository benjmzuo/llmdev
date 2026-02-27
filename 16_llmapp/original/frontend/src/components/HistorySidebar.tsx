import { useState } from "react";

import { ConfirmModal } from "@/components/ConfirmModal";
import type { SelectedDetail } from "@/hooks/useReviewHistory";
import type { ReviewSessionSummary } from "@/types/review";

interface HistorySidebarProps {
  sessions: ReviewSessionSummary[];
  selectedId: number | null;
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  hasMore: boolean;
  listError: string | null;
  selectedDetail: SelectedDetail | null;
  onSelect: (id: number) => void;
  onNewReview: () => void;
  onLoadMore: () => void;
  onDelete?: (id: number) => void;
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = Date.now();
  const diff = now - date.getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function providerBadge(provider: string) {
  if (provider === "local") {
    return (
      <span className="inline-flex items-center rounded-full bg-od-purple/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-od-purple">
        Local
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-od-accent/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-od-accent">
      OpenAI
    </span>
  );
}

function getPreview(
  session: ReviewSessionSummary,
  selectedDetail: SelectedDetail | null,
): string {
  if (selectedDetail?.session.id === session.id && selectedDetail.result) {
    const summary = selectedDetail.result.summary;
    return summary.length > 60 ? summary.slice(0, 60) + "..." : summary;
  }
  const firstLine = session.code.split("\n").find((l) => l.trim() !== "") ?? "";
  if (!firstLine) return "(empty)";
  return firstLine.length > 60 ? firstLine.slice(0, 60) + "..." : firstLine;
}

export function HistorySidebar({
  sessions,
  selectedId,
  isLoadingList,
  isLoadingDetail,
  hasMore,
  listError,
  selectedDetail,
  onSelect,
  onNewReview,
  onLoadMore,
  onDelete,
}: HistorySidebarProps) {
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  return (
    <aside className="flex h-full w-70 shrink-0 flex-col border-r border-od-border bg-od-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-od-border px-4 py-3">
        <h2 className="text-sm font-semibold text-od-fg-bright">History</h2>
        <button
          onClick={onNewReview}
          className="rounded-md bg-od-green px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          + New
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {/* Error */}
        {listError && (
          <div className="px-4 py-3 text-xs text-od-red">{listError}</div>
        )}

        {/* Skeleton loading on initial load */}
        {isLoadingList && sessions.length === 0 && (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse border-b border-od-border px-4 py-3">
                <div className="mb-2 h-3 w-16 rounded bg-od-float" />
                <div className="mb-1 h-3 w-full rounded bg-od-float" />
                <div className="h-2 w-12 rounded bg-od-float" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoadingList && sessions.length === 0 && !listError && (
          <div className="px-4 py-8 text-center text-xs text-od-fg-muted">
            No reviews yet
          </div>
        )}

        {/* Session items */}
        {sessions.map((session) => {
          const isSelected = session.id === selectedId;
          const isLoadingThis = isSelected && isLoadingDetail;

          return (
            <div
              key={session.id}
              className={`group relative border-b border-od-border transition-colors ${
                isSelected
                  ? "border-l-2 border-l-od-accent bg-od-float/60"
                  : "hover:bg-od-float/40"
              }`}
            >
              <button
                onClick={() => onSelect(session.id)}
                className="w-full px-4 py-3 text-left"
              >
                <div className="mb-1 flex items-center gap-1.5">
                  {providerBadge(session.provider)}
                  <span className="inline-flex items-center rounded-full bg-od-overlay/60 px-1.5 py-0.5 text-[10px] font-medium leading-none text-od-fg">
                    {session.language}
                  </span>
                  {isLoadingThis && (
                    <div className="ml-auto h-3 w-3 animate-spin rounded-full border border-od-border border-t-od-accent" />
                  )}
                </div>
                <div className="truncate text-xs leading-normal text-od-fg">
                  {getPreview(session, selectedDetail)}
                </div>
                <div className="mt-1 text-[10px] text-od-fg-muted">
                  {formatRelativeDate(session.created_at)}
                </div>
              </button>
              {/* Delete button */}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(session.id);
                  }}
                  className="absolute right-2 top-2 hidden rounded p-1 text-od-fg-muted hover:bg-od-red/15 hover:text-od-red group-hover:block"
                  title="Delete session"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        {/* Load more */}
        {hasMore && (
          <div className="p-3">
            <button
              onClick={onLoadMore}
              disabled={isLoadingList}
              className="w-full rounded-md border border-od-border py-1.5 text-xs font-medium text-od-fg shadow-sm hover:bg-od-float disabled:opacity-50"
            >
              {isLoadingList ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget !== null && (
        <ConfirmModal
          title="Delete Review"
          message="Delete this review session? This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => {
            onDelete?.(deleteTarget);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </aside>
  );
}

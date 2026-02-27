import type { DiffHunk } from "@/lib/diffManager";

interface HunkCardProps {
  hunk: DiffHunk;
  onApply: (id: string) => void;
  onDiscard: (id: string) => void;
}

export function HunkCard({ hunk, onApply, onDiscard }: HunkCardProps) {
  const isPending = hunk.status === "pending";
  const addCount = hunk.changes.filter((c) => c.type === "add").length;
  const removeCount = hunk.changes.filter((c) => c.type === "remove").length;

  return (
    <div
      className={`overflow-hidden rounded-md border ${
        hunk.status === "applied"
          ? "border-od-green/30 bg-od-green/5"
          : hunk.status === "discarded"
            ? "border-od-border opacity-50"
            : "border-od-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-od-border/50 bg-od-surface px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-od-fg-muted">
            @@ -{hunk.originalStart},{hunk.originalLength} +{hunk.modifiedStart},{hunk.modifiedLength} @@
          </span>
          {addCount > 0 && (
            <span className="font-semibold text-od-green">+{addCount}</span>
          )}
          {removeCount > 0 && (
            <span className="font-semibold text-od-red">-{removeCount}</span>
          )}
          {hunk.status !== "pending" && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
                hunk.status === "applied"
                  ? "bg-od-green/15 text-od-green"
                  : "bg-od-overlay/60 text-od-fg-muted"
              }`}
            >
              {hunk.status}
            </span>
          )}
        </div>
        {isPending && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onApply(hunk.id)}
              className="rounded-md bg-od-green/15 px-2.5 py-1 text-xs font-medium text-od-green hover:bg-od-green/25"
            >
              Apply
            </button>
            <button
              onClick={() => onDiscard(hunk.id)}
              className="rounded-md bg-od-overlay/40 px-2.5 py-1 text-xs font-medium text-od-fg-muted hover:bg-od-overlay/60"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Diff lines */}
      <pre className="overflow-x-auto text-xs leading-5">
        {hunk.changes.map((change, i) => {
          let prefix = " ";
          let lineClass = "";
          if (change.type === "add") {
            prefix = "+";
            lineClass = "bg-od-green/10 text-od-green";
          } else if (change.type === "remove") {
            prefix = "-";
            lineClass = "bg-od-red/10 text-od-red";
          } else {
            lineClass = "text-od-fg";
          }

          return (
            <div key={i} className={`px-3 ${lineClass}`}>
              <span className="mr-2 inline-block w-3 select-none text-od-fg-muted">
                {prefix}
              </span>
              {change.content}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

import { useState } from "react";

import { ConfirmModal } from "@/components/ConfirmModal";
import { HunkCard } from "@/components/HunkCard";
import type { DiffHunk } from "@/lib/diffManager";

interface DiffPanelProps {
  originalCode: string;
  correctedCode: string | null;
  hunks: DiffHunk[];
  canUndo: boolean;
  onApplyHunk: (id: string) => void;
  onDiscardHunk: (id: string) => void;
  onApplyAll: () => void;
  onUndo: () => void;
  onCopyPatch: () => void;
}

export function DiffPanel({
  originalCode,
  correctedCode,
  hunks,
  canUndo,
  onApplyHunk,
  onDiscardHunk,
  onApplyAll,
  onUndo,
  onCopyPatch,
}: DiffPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!correctedCode || correctedCode.trim() === originalCode.trim()) {
    return (
      <div className="py-8 text-center text-sm text-od-fg-muted">
        No code changes suggested.
      </div>
    );
  }

  if (hunks.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-od-fg-muted">
        No diff hunks computed.
      </div>
    );
  }

  const pendingCount = hunks.filter((h) => h.status === "pending").length;
  const pendingLineCount = hunks
    .filter((h) => h.status === "pending")
    .reduce(
      (sum, h) =>
        sum + h.changes.filter((c) => c.type === "add" || c.type === "remove").length,
      0,
    );

  function handleCopyPatch() {
    onCopyPatch();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        {pendingCount > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            className="rounded-md bg-od-green/15 px-3 py-1.5 text-xs font-medium text-od-green hover:bg-od-green/25"
          >
            Apply All ({pendingCount})
          </button>
        )}
        {canUndo && (
          <button
            onClick={onUndo}
            className="rounded-md border border-od-border px-3 py-1.5 text-xs font-medium text-od-fg shadow-sm hover:bg-od-float"
          >
            Undo
          </button>
        )}
        <button
          onClick={handleCopyPatch}
          className="rounded-md border border-od-border px-3 py-1.5 text-xs font-medium text-od-fg shadow-sm hover:bg-od-float"
        >
          {copied ? "Copied!" : "Copy Patch"}
        </button>
      </div>

      {/* Hunk list */}
      <div className="flex flex-col gap-3">
        {hunks.map((hunk) => (
          <HunkCard
            key={hunk.id}
            hunk={hunk}
            onApply={onApplyHunk}
            onDiscard={onDiscardHunk}
          />
        ))}
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <ConfirmModal
          title="Apply All Hunks"
          message={`Apply ${pendingCount} hunk${pendingCount !== 1 ? "s" : ""} affecting ${pendingLineCount} line${pendingLineCount !== 1 ? "s" : ""}?`}
          confirmLabel="Apply All"
          onConfirm={() => {
            setShowConfirm(false);
            onApplyAll();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

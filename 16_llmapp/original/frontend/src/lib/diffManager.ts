import { diffLines, createPatch } from "diff";

export interface HunkChange {
  type: "add" | "remove" | "context";
  content: string;
  originalLine?: number;
  modifiedLine?: number;
}

export interface DiffHunk {
  id: string;
  originalStart: number;
  originalLength: number;
  modifiedStart: number;
  modifiedLength: number;
  changes: HunkChange[];
  relatedIssueIndices: number[];
  status: "pending" | "applied" | "discarded";
}

export interface DiffState {
  originalCode: string;
  correctedCode: string;
  hunks: DiffHunk[];
  workingCode: string;
  undoSnapshot: string | null;
  undoHunkStatuses: Map<string, DiffHunk["status"]> | null;
}

const CONTEXT_LINES = 3;

interface RawChange {
  type: "add" | "remove" | "context";
  lines: string[];
  originalStart: number;
  modifiedStart: number;
}

export function computeHunks(
  original: string,
  corrected: string,
): DiffHunk[] {
  const changes = diffLines(original, corrected);
  const rawChanges: RawChange[] = [];

  let origLine = 1;
  let modLine = 1;

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, "").split("\n");
    if (change.added) {
      rawChanges.push({ type: "add", lines, originalStart: origLine, modifiedStart: modLine });
      modLine += lines.length;
    } else if (change.removed) {
      rawChanges.push({ type: "remove", lines, originalStart: origLine, modifiedStart: modLine });
      origLine += lines.length;
    } else {
      rawChanges.push({ type: "context", lines, originalStart: origLine, modifiedStart: modLine });
      origLine += lines.length;
      modLine += lines.length;
    }
  }

  // Group consecutive add/remove blocks into hunks with context
  const hunks: DiffHunk[] = [];
  let hunkChanges: HunkChange[] = [];
  let hunkOrigStart = 0;
  let hunkModStart = 0;
  let inHunk = false;

  for (let i = 0; i < rawChanges.length; i++) {
    const rc = rawChanges[i]!;

    if (rc.type === "context") {
      if (inHunk) {
        // Add trailing context (up to CONTEXT_LINES)
        const trailing = rc.lines.slice(0, CONTEXT_LINES);
        let ol = rc.originalStart;
        let ml = rc.modifiedStart;
        for (const line of trailing) {
          hunkChanges.push({ type: "context", content: line, originalLine: ol, modifiedLine: ml });
          ol++;
          ml++;
        }

        // Check if next change is close enough to merge
        const nextChange = rawChanges[i + 1];
        if (nextChange && nextChange.type !== "context" && rc.lines.length <= CONTEXT_LINES * 2) {
          // Keep remaining context lines and continue hunk
          const remaining = rc.lines.slice(CONTEXT_LINES);
          let orl = rc.originalStart + CONTEXT_LINES;
          let mrl = rc.modifiedStart + CONTEXT_LINES;
          for (const line of remaining) {
            hunkChanges.push({ type: "context", content: line, originalLine: orl, modifiedLine: mrl });
            orl++;
            mrl++;
          }
          continue;
        }

        // Close hunk
        hunks.push(buildHunk(hunks.length, hunkOrigStart, hunkModStart, hunkChanges));
        hunkChanges = [];
        inHunk = false;
      }
      continue;
    }

    // add or remove
    if (!inHunk) {
      inHunk = true;
      // Add leading context from previous context block
      const prev = i > 0 ? rawChanges[i - 1] : undefined;
      if (prev && prev.type === "context") {
        const leadingLines = prev.lines.slice(-CONTEXT_LINES);
        const startOffset = prev.lines.length - leadingLines.length;
        hunkOrigStart = prev.originalStart + startOffset;
        hunkModStart = prev.modifiedStart + startOffset;
        let ol = hunkOrigStart;
        let ml = hunkModStart;
        for (const line of leadingLines) {
          hunkChanges.push({ type: "context", content: line, originalLine: ol, modifiedLine: ml });
          ol++;
          ml++;
        }
      } else {
        hunkOrigStart = rc.originalStart;
        hunkModStart = rc.modifiedStart;
      }
    }

    let ol = rc.originalStart;
    let ml = rc.modifiedStart;
    for (const line of rc.lines) {
      if (rc.type === "add") {
        hunkChanges.push({ type: "add", content: line, modifiedLine: ml });
        ml++;
      } else {
        hunkChanges.push({ type: "remove", content: line, originalLine: ol });
        ol++;
      }
    }
  }

  // Close final hunk if open
  if (inHunk && hunkChanges.length > 0) {
    hunks.push(buildHunk(hunks.length, hunkOrigStart, hunkModStart, hunkChanges));
  }

  return hunks;
}

function buildHunk(
  index: number,
  origStart: number,
  modStart: number,
  changes: HunkChange[],
): DiffHunk {
  const origLines = changes.filter((c) => c.type !== "add").length;
  const modLines = changes.filter((c) => c.type !== "remove").length;

  return {
    id: `hunk-${index}`,
    originalStart: origStart,
    originalLength: origLines,
    modifiedStart: modStart,
    modifiedLength: modLines,
    changes,
    relatedIssueIndices: [],
    status: "pending",
  };
}

export function applyHunk(state: DiffState, hunkId: string): DiffState {
  const hunkIndex = state.hunks.findIndex((h) => h.id === hunkId);
  if (hunkIndex === -1) return state;
  const hunk = state.hunks[hunkIndex];
  if (!hunk || hunk.status !== "pending") return state;

  // Save undo snapshot
  const undoSnapshot = state.workingCode;
  const undoHunkStatuses = new Map(state.hunks.map((h) => [h.id, h.status]));

  const workingLines = state.workingCode.split("\n");

  // Build the block of lines we expect to find (context + remove lines)
  const contextAndRemove = hunk.changes
    .filter((c) => c.type === "context" || c.type === "remove")
    .map((c) => c.content);

  const startLine = findBlockStart(workingLines, contextAndRemove, hunk.originalStart - 1);
  if (startLine === -1) return state;

  // Build replacement: context + add lines (skip remove lines)
  const rebuilt: string[] = [];
  for (const change of hunk.changes) {
    if (change.type === "context" || change.type === "add") {
      rebuilt.push(change.content);
    }
  }

  const newLines = [...workingLines];
  newLines.splice(startLine, contextAndRemove.length, ...rebuilt);

  const newHunks = state.hunks.map((h) =>
    h.id === hunkId ? { ...h, status: "applied" as const } : h,
  );

  return {
    ...state,
    workingCode: newLines.join("\n"),
    hunks: newHunks,
    undoSnapshot,
    undoHunkStatuses,
  };
}

function findBlockStart(
  lines: string[],
  block: string[],
  hint: number,
): number {
  if (block.length === 0) return hint;

  // Try near the hint first
  const searchStart = Math.max(0, hint - 5);
  const searchEnd = Math.min(lines.length, hint + block.length + 5);

  for (let i = searchStart; i <= searchEnd - block.length; i++) {
    if (blockMatches(lines, block, i)) return i;
  }

  // Fallback: search whole file
  for (let i = 0; i <= lines.length - block.length; i++) {
    if (blockMatches(lines, block, i)) return i;
  }

  return -1;
}

function blockMatches(lines: string[], block: string[], start: number): boolean {
  for (let j = 0; j < block.length; j++) {
    if (lines[start + j] !== block[j]) return false;
  }
  return true;
}

export function discardHunk(state: DiffState, hunkId: string): DiffState {
  const newHunks = state.hunks.map((h) =>
    h.id === hunkId ? { ...h, status: "discarded" as const } : h,
  );
  return { ...state, hunks: newHunks };
}

export function applyAll(state: DiffState): DiffState {
  // Save undo snapshot before applying all
  const undoSnapshot = state.workingCode;
  const undoHunkStatuses = new Map(state.hunks.map((h) => [h.id, h.status]));

  // Apply pending hunks bottom-to-top to avoid line offset issues
  const pendingHunks = state.hunks
    .filter((h) => h.status === "pending")
    .reverse();

  let current = { ...state, undoSnapshot, undoHunkStatuses };
  for (const hunk of pendingHunks) {
    current = {
      ...applyHunk(current, hunk.id),
      undoSnapshot,
      undoHunkStatuses,
    };
  }

  return current;
}

export function undo(state: DiffState): DiffState {
  if (!state.undoSnapshot || !state.undoHunkStatuses) return state;

  const restoredHunks = state.hunks.map((h) => ({
    ...h,
    status: state.undoHunkStatuses!.get(h.id) ?? h.status,
  }));

  return {
    ...state,
    workingCode: state.undoSnapshot,
    hunks: restoredHunks,
    undoSnapshot: null,
    undoHunkStatuses: null,
  };
}

export function toUnifiedPatch(
  original: string,
  corrected: string,
  filename: string = "code",
): string {
  return createPatch(filename, original, corrected, "", "", { context: 3 });
}

export function createDiffState(
  originalCode: string,
  correctedCode: string,
): DiffState {
  return {
    originalCode,
    correctedCode,
    hunks: computeHunks(originalCode, correctedCode),
    workingCode: originalCode,
    undoSnapshot: null,
    undoHunkStatuses: null,
  };
}

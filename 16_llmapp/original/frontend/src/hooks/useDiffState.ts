import { useCallback, useState } from "react";

import {
  applyAll,
  applyHunk,
  createDiffState,
  discardHunk,
  toUnifiedPatch,
  undo,
  type DiffState,
} from "@/lib/diffManager";

const EMPTY_STATE: DiffState = {
  originalCode: "",
  correctedCode: "",
  hunks: [],
  workingCode: "",
  undoSnapshot: null,
  undoHunkStatuses: null,
};

export function useDiffState() {
  const [state, setState] = useState<DiffState>(EMPTY_STATE);

  const initialize = useCallback(
    (originalCode: string, correctedCode: string) => {
      setState(createDiffState(originalCode, correctedCode));
    },
    [],
  );

  const handleApplyHunk = useCallback((hunkId: string) => {
    setState((prev) => applyHunk(prev, hunkId));
  }, []);

  const handleDiscardHunk = useCallback((hunkId: string) => {
    setState((prev) => discardHunk(prev, hunkId));
  }, []);

  const handleApplyAll = useCallback(() => {
    setState((prev) => applyAll(prev));
  }, []);

  const handleUndo = useCallback(() => {
    setState((prev) => undo(prev));
  }, []);

  const copyPatch = useCallback(async () => {
    const patch = toUnifiedPatch(
      state.originalCode,
      state.correctedCode,
    );
    await navigator.clipboard.writeText(patch);
  }, [state.originalCode, state.correctedCode]);

  const reset = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  return {
    state,
    initialize,
    applyHunk: handleApplyHunk,
    discardHunk: handleDiscardHunk,
    applyAll: handleApplyAll,
    undo: handleUndo,
    copyPatch,
    reset,
  };
}

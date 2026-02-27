import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  deleteReviewSession,
  fetchReviewDetail,
  fetchReviewSessions,
} from "@/services/reviews";
import type {
  ReviewResult,
  ReviewSessionDetail,
  ReviewSessionSummary,
} from "@/types/review";

export interface SelectedDetail {
  session: ReviewSessionDetail;
  result: ReviewResult | null;
}

function extractResult(detail: ReviewSessionDetail): ReviewResult | null {
  const assistantMsg = detail.messages.find((m) => m.role === "assistant");
  if (!assistantMsg) return null;
  const json = assistantMsg.content_json;
  if (
    typeof json === "object" &&
    json !== null &&
    "summary" in json &&
    typeof json.summary === "string" &&
    "issues" in json &&
    Array.isArray(json.issues)
  ) {
    return json as unknown as ReviewResult;
  }
  return null;
}

async function loadInitialData(
  token: string,
  targetId?: number | null,
) {
  const data = await fetchReviewSessions(token, 0);
  let detail: ReviewSessionDetail | null = null;

  if (targetId) {
    try {
      detail = await fetchReviewDetail(token, targetId);
    } catch {
      // Target session not found — fall back to newest
      const newest = data[0];
      if (newest) detail = await fetchReviewDetail(token, newest.id);
    }
  } else {
    const newest = data[0];
    if (newest) detail = await fetchReviewDetail(token, newest.id);
  }

  return { data, detail };
}

export function useReviewHistory(initialSessionId?: number | null) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<ReviewSessionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(
    null,
  );
  // Fix #5: Initialize to false so sidebar shows "No reviews yet" before token is available
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  // Fix #6: Track detail fetch errors
  const [detailError, setDetailError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const initialLoadDone = useRef(false);
  // Fix #1: Incrementing counter for race condition protection in selectSession
  const selectRequestIdRef = useRef(0);

  // Initial load — all setState calls happen in async callbacks (not synchronously in the effect body)
  useEffect(() => {
    if (!token || initialLoadDone.current) return;
    initialLoadDone.current = true;

    let cancelled = false;

    // Wrap in microtask so setIsLoadingList(true) is not synchronous in the effect body
    Promise.resolve().then(() => {
      if (cancelled) return;
      setIsLoadingList(true);
    });

    loadInitialData(token, initialSessionId)
      .then(({ data, detail }) => {
        if (cancelled) return;
        setSessions(data);
        offsetRef.current = data.length;
        setHasMore(data.length === 20);

        if (detail) {
          setSelectedId(detail.id);
          setSelectedDetail({
            session: detail,
            result: extractResult(detail),
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(
          err instanceof Error ? err.message : "Failed to load history",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      });

    return () => {
      cancelled = true;
      // Fix #2: Reset so re-mount in StrictMode re-fetches
      initialLoadDone.current = false;
    };
  }, [token, initialSessionId]);

  const selectSession = useCallback(
    (id: number) => {
      if (!token || id === selectedId) return;
      // Fix #1: Increment and capture request id for race condition protection
      const requestId = ++selectRequestIdRef.current;
      setSelectedId(id);
      setSelectedDetail(null);
      // Fix #6: Clear previous detail error
      setDetailError(null);
      setIsLoadingDetail(true);

      fetchReviewDetail(token, id)
        .then((detail) => {
          // Fix #1: Bail if a newer request was made
          if (selectRequestIdRef.current !== requestId) return;
          setSelectedDetail({
            session: detail,
            result: extractResult(detail),
          });
        })
        .catch((err) => {
          if (selectRequestIdRef.current !== requestId) return;
          setSelectedDetail(null);
          // Fix #6: Set detail error
          setDetailError(
            err instanceof Error ? err.message : "Failed to load review",
          );
        })
        .finally(() => {
          if (selectRequestIdRef.current !== requestId) return;
          setIsLoadingDetail(false);
        });
    },
    [token, selectedId],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedDetail(null);
    setDetailError(null);
  }, []);

  const loadMore = useCallback(() => {
    if (!token || isLoadingList) return;
    setIsLoadingList(true);
    setListError(null);

    fetchReviewSessions(token, offsetRef.current)
      .then((data) => {
        setSessions((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newSessions = data.filter((s) => !existingIds.has(s.id));
          return [...prev, ...newSessions];
        });
        offsetRef.current += data.length;
        setHasMore(data.length === 20);
      })
      .catch((err) => {
        setListError(
          err instanceof Error ? err.message : "Failed to load more",
        );
      })
      .finally(() => {
        setIsLoadingList(false);
      });
  }, [token, isLoadingList]);

  const deleteSession = useCallback(
    (id: number) => {
      if (!token) return;

      // Optimistically remove from local state
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedDetail(null);
      }

      // Delete from backend
      deleteReviewSession(token, id).catch(() => {
        // Silently fail — session is already removed from UI
      });
    },
    [token, selectedId],
  );

  // Fix #4: Prepend to list without selecting (keeps composer active after review completes)
  const prependSession = useCallback(
    (
      sessionId: number,
      code: string,
      language: string,
      provider: string,
    ) => {
      const summary: ReviewSessionSummary = {
        id: sessionId,
        code,
        language,
        provider,
        settings_json: null,
        execution_json: null,
        created_at: new Date().toISOString(),
      };

      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        return [summary, ...filtered];
      });
      offsetRef.current += 1;
      setDetailError(null);
    },
    [],
  );

  const prependAndSelect = useCallback(
    (
      sessionId: number,
      code: string,
      language: string,
      provider: string,
      result: ReviewResult,
    ) => {
      const summary: ReviewSessionSummary = {
        id: sessionId,
        code,
        language,
        provider,
        settings_json: null,
        execution_json: null,
        created_at: new Date().toISOString(),
      };

      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        return [summary, ...filtered];
      });
      offsetRef.current += 1;

      setSelectedId(sessionId);
      setSelectedDetail({
        session: { ...summary, messages: [] },
        result,
      });
      setDetailError(null);
    },
    [],
  );

  return {
    sessions,
    selectedId,
    selectedDetail,
    isLoadingList,
    isLoadingDetail,
    hasMore,
    listError,
    detailError,
    selectSession,
    clearSelection,
    loadMore,
    deleteSession,
    prependSession,
    prependAndSelect,
  };
}

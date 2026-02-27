import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { streamReview } from "@/services/streamReview";
import type { ReviewIssue, ReviewResult, ReviewSettings } from "@/types/review";

export function useStreamReview() {
  const { token } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<{
    code: string;
    language: string;
    settings?: ReviewSettings;
  } | null>(null);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  const startStream = useCallback(
    (code: string, language: string, settings?: ReviewSettings) => {
      if (!token) return;
      abort();

      lastParamsRef.current = { code, language, settings };
      setIsStreaming(true);
      setSessionId(null);
      setIssues([]);
      setResult(null);
      setError(null);
      setErrorCode(null);
      setStartTime(Date.now());

      const controller = streamReview({ code, language, settings }, token, {
        onMeta: (id) => {
          setSessionId(id);
        },
        onIssue: (issue) => {
          setIssues((prev) => [...prev, issue]);
        },
        onResult: (finalResult) => {
          setResult(finalResult);
        },
        onError: (code, message) => {
          setError(message);
          setErrorCode(code);
        },
        onDone: () => {
          setIsStreaming(false);
          controllerRef.current = null;
        },
      });

      controllerRef.current = controller;
    },
    [token, abort],
  );

  const retry = useCallback(() => {
    if (!lastParamsRef.current) return;
    const { code, language, settings } = lastParamsRef.current;
    startStream(code, language, settings);
  }, [startStream]);

  const reset = useCallback(() => {
    abort();
    setIsStreaming(false);
    setSessionId(null);
    setIssues([]);
    setResult(null);
    setError(null);
    setErrorCode(null);
    setStartTime(null);
  }, [abort]);

  return {
    isStreaming,
    sessionId,
    issues,
    result,
    error,
    errorCode,
    startTime,
    startStream,
    retry,
    abort,
    reset,
  };
}

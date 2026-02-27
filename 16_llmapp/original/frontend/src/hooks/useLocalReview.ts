import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { authenticatedFetch } from "@/services/api";
import {
  generateReview,
  isEngineReady,
  isWebGPUAvailable,
  type ModelLoadProgress,
} from "@/services/localLLM";
import type { ReviewIssue, ReviewResult, ReviewSettings } from "@/types/review";

export interface ModelStatus {
  stage: "idle" | "loading" | "ready" | "error";
  progress?: number;
  text?: string;
}

export function useLocalReview() {
  const { token } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    stage: isEngineReady() ? "ready" : "idle",
  });
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(
    null,
  );

  const cancelledRef = useRef(false);
  const lastParamsRef = useRef<{
    code: string;
    language: string;
    settings?: ReviewSettings;
  } | null>(null);

  const webGPUSupported = isWebGPUAvailable();
  const modelReady = modelStatus.stage === "ready";

  const issues: ReviewIssue[] = result?.issues ?? [];

  const handleProgress = useCallback((p: ModelLoadProgress) => {
    setModelStatus({ stage: "loading", progress: p.progress, text: p.text });
  }, []);

  const startReview = useCallback(
    (code: string, language: string, settings?: ReviewSettings) => {
      lastParamsRef.current = { code, language, settings };
      cancelledRef.current = false;
      setIsProcessing(true);
      setSessionId(null);
      setResult(null);
      setError(null);
      setPersistenceWarning(null);

      (async () => {
        try {
          const reviewResult = await generateReview(
            code,
            language,
            settings,
            handleProgress,
          );

          if (cancelledRef.current) return;

          setModelStatus({ stage: "ready" });
          setResult(reviewResult);

          // Persist to backend
          try {
            const response = token
              ? await authenticatedFetch("/api/reviews/local", token, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    code,
                    language,
                    result: reviewResult,
                    settings,
                  }),
                })
              : null;
            if (response && response.ok) {
              try {
                const body = (await response.json()) as Record<string, unknown>;
                if (typeof body.session_id === "number" && !cancelledRef.current) {
                  setSessionId(body.session_id);
                }
              } catch {
                // Ignore parse failure
              }
            } else if (response && !response.ok) {
              setPersistenceWarning(
                "Review completed but could not be saved to history.",
              );
            }
          } catch {
            if (!cancelledRef.current) {
              setPersistenceWarning(
                "Review completed but could not be saved to history.",
              );
            }
          }
        } catch (err) {
          if (cancelledRef.current) return;
          const message =
            err instanceof Error ? err.message : "Local inference failed";
          setError(message);
          if (
            message.includes("WebGPU") ||
            message.includes("model") ||
            message.includes("download")
          ) {
            setModelStatus({ stage: "error", text: message });
          }
        } finally {
          if (!cancelledRef.current) {
            setIsProcessing(false);
          }
        }
      })();
    },
    [token, handleProgress],
  );

  const retry = useCallback(() => {
    if (!lastParamsRef.current) return;
    const { code, language, settings } = lastParamsRef.current;
    startReview(code, language, settings);
  }, [startReview]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setIsProcessing(false);
    setSessionId(null);
    setResult(null);
    setError(null);
    setPersistenceWarning(null);
  }, []);

  return {
    isProcessing,
    sessionId,
    modelStatus,
    result,
    error,
    issues,
    webGPUSupported,
    modelReady,
    persistenceWarning,
    startReview,
    retry,
    reset,
  };
}

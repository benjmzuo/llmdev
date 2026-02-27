import { authenticatedFetch, parseErrorResponse } from "@/services/api";
import type { ReviewIssue, ReviewRequest, ReviewResult } from "@/types/review";

export interface StreamCallbacks {
  onMeta: (sessionId: number) => void;
  onIssue: (issue: ReviewIssue) => void;
  onResult: (result: ReviewResult) => void;
  onError: (code: string, message: string) => void;
  onDone: () => void;
}

interface SSEMessage {
  event: string;
  data: string;
}

function parseSSEMessages(buffer: string): {
  messages: SSEMessage[];
  remaining: string;
} {
  const messages: SSEMessage[] = [];
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const remaining = parts.pop() ?? "";

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    let event = "message";
    const dataLines: string[] = [];

    for (const line of trimmed.split("\n")) {
      const stripped = line.trim();
      if (stripped.startsWith("event:")) {
        event = stripped.slice("event:".length).trim();
      } else if (stripped.startsWith("data:")) {
        dataLines.push(stripped.slice("data:".length).trim());
      }
    }

    const data = dataLines.join("\n");
    if (data) {
      messages.push({ event, data });
    }
  }

  return { messages, remaining };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReviewIssue(value: unknown): value is ReviewIssue {
  if (!isRecord(value)) return false;
  return (
    typeof value.message === "string" &&
    typeof value.severity === "string" &&
    ["info", "warning", "error"].includes(value.severity)
  );
}

function isReviewResult(value: unknown): value is ReviewResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.summary === "string" && Array.isArray(value.issues)
  );
}

function dispatchSSEMessage(msg: SSEMessage, callbacks: StreamCallbacks): void {
  switch (msg.event) {
    case "meta": {
      try {
        const parsed: unknown = JSON.parse(msg.data);
        if (isRecord(parsed) && typeof parsed.session_id === "number") {
          callbacks.onMeta(parsed.session_id);
        }
      } catch {
        // Ignore malformed meta
      }
      break;
    }
    case "token": {
      try {
        const parsed: unknown = JSON.parse(msg.data);
        if (!isRecord(parsed) || typeof parsed.chunk !== "string") break;

        let chunk: unknown;
        try {
          chunk = JSON.parse(parsed.chunk);
        } catch {
          break;
        }

        if (isRecord(chunk) && chunk.type === "issue" && isReviewIssue(chunk)) {
          callbacks.onIssue(chunk);
        }
      } catch {
        // Ignore malformed token
      }
      break;
    }
    case "result": {
      try {
        const parsed: unknown = JSON.parse(msg.data);
        if (isReviewResult(parsed)) {
          callbacks.onResult(parsed);
        }
      } catch {
        // Ignore malformed result
      }
      break;
    }
    case "error": {
      try {
        const parsed: unknown = JSON.parse(msg.data);
        if (isRecord(parsed)) {
          callbacks.onError(
            typeof parsed.code === "string" ? parsed.code : "unknown",
            typeof parsed.message === "string"
              ? parsed.message
              : "Unknown error",
          );
        }
      } catch {
        callbacks.onError("unknown", "Failed to parse error response");
      }
      break;
    }
    case "done": {
      callbacks.onDone();
      break;
    }
  }
}

export function streamReview(
  request: ReviewRequest,
  token: string,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    let doneEmitted = false;

    try {
      const response = await authenticatedFetch(
        "/api/reviews/stream",
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const code = response.status === 401 ? "authentication_error" : "http_error";
        const message = await parseErrorResponse(response);
        callbacks.onError(code, message);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError("stream_error", "Response body is not readable");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { messages, remaining } = parseSSEMessages(buffer);
        buffer = remaining;

        for (const msg of messages) {
          dispatchSSEMessage(msg, callbacks);
          if (msg.event === "done") {
            doneEmitted = true;
          }
        }
      }

      // Process any remaining buffered data
      if (buffer.trim()) {
        const { messages } = parseSSEMessages(buffer + "\n\n");
        for (const msg of messages) {
          dispatchSSEMessage(msg, callbacks);
          if (msg.event === "done") {
            doneEmitted = true;
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      callbacks.onError(
        "stream_error",
        err instanceof Error ? err.message : "Stream failed",
      );
    } finally {
      if (!doneEmitted) {
        callbacks.onDone();
      }
    }
  })();

  return controller;
}

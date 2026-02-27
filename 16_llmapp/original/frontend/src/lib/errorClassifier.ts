import type { ReviewError, ReviewErrorCode } from "@/types/errors";

export function classifyError(
  code: string | undefined,
  message: string,
): ReviewError {
  const errorCode = (code ?? "unknown") as ReviewErrorCode;

  if (errorCode === "authentication_error" || message.includes("401")) {
    return {
      code: "authentication_error",
      title: "Authentication Failed",
      message: "Your session has expired. Please log in again.",
      action: "login",
      actionLabel: "Log in",
    };
  }

  if (
    errorCode === "rate_limit" ||
    message.toLowerCase().includes("rate limit") ||
    message.includes("429")
  ) {
    return {
      code: "rate_limit",
      title: "Rate Limit Exceeded",
      message: "Too many requests. Please wait a moment and try again.",
      action: "retry",
      actionLabel: "Retry",
    };
  }

  if (
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("failed to fetch") ||
    message.toLowerCase().includes("net::err")
  ) {
    return {
      code: "network_error",
      title: "Network Error",
      message: "Could not reach the server. Check your connection and try again.",
      action: "retry",
      actionLabel: "Retry",
    };
  }

  if (errorCode === "stream_error") {
    return {
      code: "stream_error",
      title: "Stream Error",
      message,
      action: "retry",
      actionLabel: "Retry",
    };
  }

  if (errorCode === "provider_error" || errorCode === "http_error") {
    return {
      code: errorCode,
      title: "Provider Error",
      message: message || "The LLM provider returned an error.",
      action: "retry",
      actionLabel: "Retry",
    };
  }

  return {
    code: errorCode,
    title: "Error",
    message: message || "An unexpected error occurred.",
    action: "dismiss",
    actionLabel: "Dismiss",
  };
}

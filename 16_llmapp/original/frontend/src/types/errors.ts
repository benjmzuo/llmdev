export type ReviewErrorCode =
  | "authentication_error"
  | "http_error"
  | "stream_error"
  | "rate_limit"
  | "network_error"
  | "provider_error"
  | "internal_error"
  | "unknown";

export type ErrorAction = "retry" | "fallback" | "dismiss" | "login";

export interface ReviewError {
  code: ReviewErrorCode;
  title: string;
  message: string;
  action: ErrorAction;
  actionLabel: string;
}

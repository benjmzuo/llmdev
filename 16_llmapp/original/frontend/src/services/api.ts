let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: () => void): void {
  onUnauthorized = fn;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    // AppError shape: { "error": { "message": "..." } }
    if (isRecord(body) && isRecord(body.error)) {
      const msg = body.error.message;
      if (typeof msg === "string") return msg;
    }

    // FastAPI detail string: { "detail": "..." }
    if (isRecord(body) && typeof body.detail === "string") {
      return body.detail;
    }

    // Pydantic 422 list: { "detail": [{ "msg": "..." }, ...] }
    if (isRecord(body) && Array.isArray(body.detail)) {
      const messages = body.detail
        .filter((d): d is Record<string, unknown> => isRecord(d))
        .map((d) => (typeof d.msg === "string" ? d.msg : ""))
        .filter(Boolean);
      if (messages.length > 0) return messages.join("; ");
    }
  } catch {
    // Could not parse JSON
  }

  return `HTTP ${response.status}`;
}

export async function authenticatedFetch(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { ...init, headers });

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  return response;
}

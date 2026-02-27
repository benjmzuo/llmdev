import { authenticatedFetch, parseErrorResponse } from "@/services/api";
import type {
  ReviewSessionDetail,
  ReviewSessionSummary,
} from "@/types/review";

export async function fetchReviewSessions(
  token: string,
  offset: number = 0,
): Promise<ReviewSessionSummary[]> {
  const response = await authenticatedFetch(
    `/api/reviews?limit=20&offset=${offset}`,
    token,
  );
  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }
  return response.json() as Promise<ReviewSessionSummary[]>;
}

export async function deleteReviewSession(
  token: string,
  sessionId: number,
): Promise<void> {
  const response = await authenticatedFetch(
    `/api/reviews/${sessionId}`,
    token,
    { method: "DELETE" },
  );
  if (!response.ok && response.status !== 204) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }
}

export async function fetchReviewDetail(
  token: string,
  sessionId: number,
): Promise<ReviewSessionDetail> {
  const response = await authenticatedFetch(
    `/api/reviews/${sessionId}`,
    token,
  );
  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }
  return response.json() as Promise<ReviewSessionDetail>;
}

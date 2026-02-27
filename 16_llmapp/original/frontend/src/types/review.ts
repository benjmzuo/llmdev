import type { FocusArea } from "@/constants/review";

export type ReviewProvider = "openai" | "local";
export type OutputLanguage = "en" | "ja";

export interface ReviewIssue {
  line: number | null;
  severity: "info" | "warning" | "error";
  message: string;
  suggestion: string | null;
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  suggestions: string[];
  corrected_code: string | null;
}

export interface ReviewSettings {
  strictness: "lenient" | "normal" | "strict";
  detail_level: "brief" | "normal" | "deep";
  focus_areas: FocusArea[];
  output_language?: OutputLanguage;
}

export interface ReviewRequest {
  code: string;
  language: string;
  settings?: ReviewSettings;
}

export interface ReviewSessionSummary {
  id: number;
  code: string;
  language: string;
  provider: string;
  settings_json: Record<string, unknown> | null;
  execution_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ReviewMessage {
  id: number;
  role: string;
  content_json: Record<string, unknown>;
  created_at: string;
}

export interface ReviewSessionDetail extends ReviewSessionSummary {
  messages: ReviewMessage[];
}

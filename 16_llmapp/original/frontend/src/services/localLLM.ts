import {
  CreateMLCEngine,
  type MLCEngine,
  type AppConfig,
  modelLibURLPrefix,
  modelVersion,
} from "@mlc-ai/web-llm";

import type { ReviewResult, ReviewSettings } from "@/types/review";

const MODEL_ID = "TinySwallow-1.5B";

const APP_CONFIG: AppConfig = {
  model_list: [
    {
      model:
        "https://huggingface.co/SakanaAI/TinySwallow-1.5B-Instruct-q4f32_1-MLC",
      model_id: MODEL_ID,
      model_lib:
        modelLibURLPrefix +
        modelVersion +
        "/Qwen2-1.5B-Instruct-q4f32_1-ctx4k_cs1k-webgpu.wasm",
    },
  ],
};

export interface ModelLoadProgress {
  progress: number;
  text: string;
}

export type ProgressCallback = (p: ModelLoadProgress) => void;

// --- Singleton engine ---

let engine: MLCEngine | null = null;
let enginePromise: Promise<MLCEngine> | null = null;

export function isWebGPUAvailable(): boolean {
  return "gpu" in navigator;
}

export function isEngineReady(): boolean {
  return engine != null;
}

export async function getEngine(
  onProgress?: ProgressCallback,
): Promise<MLCEngine> {
  if (engine) return engine;
  if (enginePromise) return enginePromise;

  enginePromise = CreateMLCEngine(MODEL_ID, {
    appConfig: APP_CONFIG,
    initProgressCallback: (progress) => {
      onProgress?.({
        progress: progress.progress,
        text: progress.text,
      });
    },
  })
    .then((e) => {
      engine = e;
      return e;
    })
    .catch((err) => {
      enginePromise = null;
      throw err;
    });

  return enginePromise;
}

// --- Prompt construction ---

const SYSTEM_PROMPT = `You are a code review assistant. You MUST respond with ONLY a single JSON object. No markdown, no explanation, no extra text. Output raw JSON only.`;

function buildLocalUserPrompt(
  code: string,
  language: string,
  settings?: ReviewSettings,
): string {
  const strictness = settings?.strictness ?? "normal";
  const detailLevel = settings?.detail_level ?? "normal";
  const focusAreas = settings?.focus_areas ?? [];
  const outputLang = settings?.output_language ?? "en";

  const strictnessMap: Record<string, string> = {
    lenient: "Be lenient and only flag clear bugs or critical issues.",
    normal: "Use standard code review strictness.",
    strict:
      "Be strict and flag all potential issues, including style and best practices.",
  };

  const detailMap: Record<string, string> = {
    brief: "Keep explanations brief.",
    normal: "Provide clear explanations for each issue.",
    deep: "Provide detailed explanations with examples for each issue.",
  };

  const parts: string[] = [
    `Review the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    strictnessMap[strictness] ?? strictnessMap.normal!,
    detailMap[detailLevel] ?? detailMap.normal!,
  ];

  if (focusAreas.length > 0) {
    parts.push(`Focus on: ${focusAreas.join(", ")}.`);
  }

  if (outputLang === "ja") {
    parts.push(
      "Write summary, messages, and suggestions in Japanese. JSON keys must stay in English.",
    );
  }

  parts.push(
    `Respond with ONLY a JSON object. No markdown fences, no explanation.
IMPORTANT: "corrected_code" MUST always contain the complete improved version of the code. Never set it to null.

Example input: \`\`\`python
def add(a, b):
  return a - b
\`\`\`

Example output:
{"summary":"The function subtracts instead of adding.","corrected_code":"def add(a, b):\\n  return a + b","issues":[{"line":2,"severity":"error","message":"Returns a - b instead of a + b.","suggestion":"Change - to +."}],"suggestions":["Add type hints."]}

Now review the code above. You MUST include "corrected_code" with the full improved code. Respond with ONLY JSON:`,
  );

  return parts.join("\n\n");
}

// --- JSON parsing ---

function extractJSON(raw: string): string | null {
  // Strip markdown fences if present
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*$/g, "");

  const first = stripped.indexOf("{");
  if (first === -1) return null;

  const last = stripped.lastIndexOf("}");
  if (last !== -1 && last > first) return stripped.slice(first, last + 1);

  // JSON may be truncated — try to close open braces/brackets
  let json = stripped.slice(first);
  // Strip trailing incomplete string (no closing quote)
  json = json.replace(/,?\s*"[^"]*$/, "");
  // Close open structures
  const opens: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of json) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") opens.push(ch === "{" ? "}" : "]");
    if (ch === "}" || ch === "]") opens.pop();
  }
  if (inString) json += '"';
  while (opens.length > 0) json += opens.pop();
  return json;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseReviewResult(raw: string): ReviewResult | null {
  const json = extractJSON(raw);
  if (!json) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (typeof parsed.summary !== "string") return null;

  const issues: ReviewResult["issues"] = [];
  if (Array.isArray(parsed.issues)) {
    for (const item of parsed.issues) {
      if (!isRecord(item) || typeof item.message !== "string") continue;
      const severity = ["info", "warning", "error"].includes(
        item.severity as string,
      )
        ? (item.severity as "info" | "warning" | "error")
        : "info";
      issues.push({
        line: typeof item.line === "number" ? item.line : null,
        severity,
        message: item.message,
        suggestion:
          typeof item.suggestion === "string" ? item.suggestion : null,
      });
    }
  }

  const suggestions: string[] = [];
  if (Array.isArray(parsed.suggestions)) {
    for (const s of parsed.suggestions) {
      if (typeof s === "string") suggestions.push(s);
    }
  }

  const correctedCode =
    typeof parsed.corrected_code === "string" && parsed.corrected_code !== ""
      ? parsed.corrected_code
      : null;

  return {
    summary: parsed.summary,
    issues,
    suggestions,
    corrected_code: correctedCode,
  };
}

function makeFallbackResult(raw: string): ReviewResult {
  return {
    summary: "The model returned a response that could not be parsed as JSON.",
    issues: [
      {
        line: null,
        severity: "info",
        message: raw.slice(0, 2000),
        suggestion: null,
      },
    ],
    suggestions: [],
    corrected_code: null,
  };
}

// --- Main inference ---

const TIMEOUT_MS = 120_000;

export async function generateReview(
  code: string,
  language: string,
  settings?: ReviewSettings,
  onProgress?: ProgressCallback,
): Promise<ReviewResult> {
  if (!isWebGPUAvailable()) {
    throw new Error(
      "WebGPU is not available in this browser. Try Chrome or Edge.",
    );
  }

  const eng = await getEngine(onProgress);

  const userPrompt = buildLocalUserPrompt(code, language, settings);

  async function attempt(temperature: number): Promise<ReviewResult | null> {
    const response = await eng.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    return parseReviewResult(raw);
  }

  async function generateCorrectedCode(
    reviewResult: ReviewResult,
  ): Promise<string | null> {
    const feedbackParts: string[] = [];
    if (reviewResult.summary) {
      feedbackParts.push(`Summary: ${reviewResult.summary}`);
    }
    for (const issue of reviewResult.issues) {
      feedbackParts.push(
        `- ${issue.message}${issue.suggestion ? ` (${issue.suggestion})` : ""}`,
      );
    }
    for (const s of reviewResult.suggestions) {
      feedbackParts.push(`- ${s}`);
    }
    const feedback = feedbackParts.join("\n");

    const response = await eng.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a code correction assistant. Output ONLY the corrected code. No explanation, no markdown fences, no JSON.",
        },
        {
          role: "user",
          content: `Improve the following ${language} code based on this review feedback:\n\n${feedback}\n\nOriginal code:\n${code}\n\nOutput ONLY the improved code:`,
        },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) return null;

    // Strip markdown fences if model added them
    return raw.replace(/^```(?:\w*)\n?/, "").replace(/\n?```$/, "");
  }

  const run = async (): Promise<ReviewResult> => {
    // First attempt
    const result1 = await attempt(0.7);
    if (result1) return result1;

    // Retry with higher temperature
    const result2 = await attempt(0.8);
    if (result2) return result2;

    // Fallback: run once more and use raw output
    const eng2 = await getEngine();
    const fallbackResponse = await eng2.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.9,
    });
    const raw = fallbackResponse.choices[0]?.message?.content ?? "";
    return parseReviewResult(raw) ?? makeFallbackResult(raw);
  };

  const fillCorrectedCode = async (
    result: ReviewResult,
  ): Promise<ReviewResult> => {
    if (result.corrected_code) return result;
    try {
      const corrected = await generateCorrectedCode(result);
      if (corrected && corrected.trim() !== code.trim()) {
        return { ...result, corrected_code: corrected };
      }
    } catch {
      // Correction generation failed — return result as-is
    }
    return result;
  };

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("Local inference timed out after 120 seconds.")),
      TIMEOUT_MS,
    ),
  );

  const result = await Promise.race([run(), timeout]);
  return fillCorrectedCode(result);
}

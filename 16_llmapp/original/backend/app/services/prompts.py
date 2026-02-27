from app.schemas.reviews import ReviewSettings

REVIEW_SYSTEM_PROMPT = """\
You are an expert code reviewer. Analyze the provided source code and return your review as raw JSON matching this exact schema:

{
  "summary": "Brief overall assessment of the code quality",
  "issues": [
    {
      "line": <line number or null>,
      "severity": "info" | "warning" | "error",
      "message": "Description of the issue",
      "suggestion": "How to fix it, or null"
    }
  ],
  "suggestions": ["General improvement suggestion"],
  "corrected_code": "The full corrected source code with all issues fixed, or null"
}

corrected_code rules:
- If any issues were found, provide the FULL corrected source file with all fixes applied.
- Preserve the original formatting and indentation style.
- If no changes are needed, corrected_code MUST be null (not an empty string).
- corrected_code must contain the complete file, not a partial snippet or diff.

Return ONLY valid JSON. No markdown fences, no extra text.\
"""

REVIEW_STREAM_SYSTEM_PROMPT = """\
You are an expert code reviewer. Output your review as NDJSON (newline-delimited JSON):
one JSON object per line, no markdown, no extra text.

Line types:

{"type":"issue","line":<number or null>,"severity":"info"|"warning"|"error","message":"...","suggestion":"...or null"}
{"type":"result","result":{"summary":"...","issues":[...all issues...],"suggestions":["..."],"corrected_code":"...or null"}}

Rules:
- Output one issue line per issue found.
- The LAST line MUST be a "result" line containing the complete review.
- The "issues" array in the result MUST include every issue from the preceding lines.
- If any issues were found, "corrected_code" must contain the FULL corrected source file with all fixes applied. Preserve original formatting and indentation.
- If no changes are needed, "corrected_code" MUST be null (not an empty string).
- "corrected_code" must be the complete file, not a partial snippet or diff.
- Every line must be valid JSON. No other output.\
"""

_STRICTNESS_MAP = {
    "lenient": "Be lenient and only flag clear bugs or critical issues.",
    "normal": "Use standard code review strictness.",
    "strict": "Be strict and flag all potential issues, including style and best practices.",
}

_DETAIL_MAP = {
    "brief": "Keep explanations brief and concise.",
    "normal": "Provide clear explanations for each issue.",
    "deep": "Provide detailed explanations with examples for each issue.",
}

_LANGUAGE_MAP = {
    "en": "Write all natural-language fields (summary, issue messages, suggestions) in English.",
    "ja": "Write all natural-language fields (summary, issue messages, suggestions) in Japanese. Do NOT translate JSON keys.",
}


def build_user_prompt(code: str, language: str, settings: ReviewSettings) -> str:
    parts = [f"Review the following {language} code:\n\n```{language}\n{code}\n```"]

    parts.append(_STRICTNESS_MAP[settings.strictness])
    parts.append(_DETAIL_MAP[settings.detail_level])

    if settings.focus_areas:
        areas = ", ".join(settings.focus_areas)
        parts.append(f"Focus on: {areas}.")

    parts.append(_LANGUAGE_MAP[settings.output_language])

    return "\n\n".join(parts)

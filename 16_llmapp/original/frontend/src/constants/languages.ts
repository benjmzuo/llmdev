export const SUPPORTED_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

/** Maps language values to Monaco Editor language identifiers. */
export const MONACO_LANGUAGE_MAP: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(({ value }) => [value, value]),
);

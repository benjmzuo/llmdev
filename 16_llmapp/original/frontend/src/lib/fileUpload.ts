export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  tsx: "typescript",
  java: "java",
  go: "go",
  rs: "rust",
  c: "c",
  cpp: "cpp",
  h: "c",
};

export const ACCEPTED_EXTENSIONS = Object.keys(EXTENSION_TO_LANGUAGE)
  .map((ext) => `.${ext}`)
  .join(",");

export function languageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_LANGUAGE[ext] ?? "python";
}

export function readFileWithLanguage(
  file: File,
  callback: (code: string, language: string) => void,
): void {
  const language = languageFromFilename(file.name);
  const reader = new FileReader();
  reader.onload = () => {
    callback(reader.result as string, language);
  };
  reader.readAsText(file);
}

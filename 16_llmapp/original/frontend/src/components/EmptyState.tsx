import { useRef } from "react";

import { CODE_EXAMPLES, type CodeExample } from "@/constants/examples";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import {
  ACCEPTED_EXTENSIONS,
  readFileWithLanguage,
} from "@/lib/fileUpload";

interface EmptyStateProps {
  onSelectExample: (example: CodeExample) => void;
  onUploadFile: (code: string, language: string) => void;
  onPasteCode: () => void;
  isDraggingOver?: boolean;
}

export function EmptyState({ onSelectExample, onUploadFile, onPasteCode, isDraggingOver }: EmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileWithLanguage(file, onUploadFile);
    e.target.value = "";
  }

  return (
    <div className={`flex min-h-[60vh] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
      isDraggingOver
        ? "border-od-accent bg-od-accent/5"
        : "border-transparent"
    }`}>
      {/* Drag overlay message */}
      {isDraggingOver && (
        <div className="mb-4 text-sm font-medium text-od-accent">
          Drop file to upload
        </div>
      )}

      {/* Welcome */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-od-accent/10">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" className="text-od-accent">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.78l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L6.75 8.19l3.47-3.47a.75.75 0 011.06 1.06z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-od-fg-bright">
          Code Reviewer
        </h2>
        <p className="text-sm text-od-fg-muted">
          Paste code, upload a file, or try an example to get started.
        </p>
      </div>

      {/* Actions */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <button
          onClick={onPasteCode}
          className="rounded-md bg-od-green px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Paste Code
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-od-border bg-od-base px-4 py-2 text-sm font-medium text-od-fg shadow-sm hover:bg-od-float"
        >
          Upload File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <p className="mb-6 text-xs text-od-fg-muted">
        Supports: {SUPPORTED_LANGUAGES.map((l) => l.label).join(", ")}
      </p>

      {/* Example cards */}
      <div className="w-full max-w-2xl">
        <h3 className="mb-3 text-center text-xs font-medium text-od-fg-muted">
          Or try an example
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {CODE_EXAMPLES.map((example) => (
            <button
              key={example.id}
              onClick={() => onSelectExample(example)}
              className="rounded-lg border border-od-border bg-od-base p-4 text-left shadow-sm transition-colors hover:border-od-accent/50 hover:bg-od-float/50"
            >
              <h4 className="mb-1 text-sm font-medium text-od-fg-bright">
                {example.title}
              </h4>
              <p className="text-xs leading-relaxed text-od-fg-muted">{example.description}</p>
              <span className="mt-2 inline-flex items-center rounded-full bg-od-overlay/60 px-1.5 py-0.5 text-[10px] font-medium leading-none text-od-fg">
                {example.language}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

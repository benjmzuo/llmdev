import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { MONACO_LANGUAGE_MAP } from "@/constants/languages";
import { useEditorPreferences } from "@/hooks/useEditorPreferences";
import { useTheme } from "@/hooks/useTheme";
import {
  isFormattingSupported,
  registerPrettierFormatter,
} from "@/services/monacoFormatter";

export interface CodeEditorHandle {
  revealLine(line: number): void;
  setIssueDecorations(
    decorations: Array<{
      line: number;
      severity: "error" | "warning" | "info";
      message: string;
    }>,
  ): void;
  clearIssueDecorations(): void;
  highlightLine(line: number, className: string): void;
  clearHighlights(): void;
  getEditor(): Monaco.editor.IStandaloneCodeEditor | null;
}

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: string;
  readOnly?: boolean;
  height?: string | number;
  className?: string;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    { value, onChange, language, readOnly = false, height = "300px", className },
    ref,
  ) {
    const {
      prefs,
      increaseFontSize,
      decreaseFontSize,
      resetFontSize,
      toggleWordWrap,
    } = useEditorPreferences();
    const { theme } = useTheme();

    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof Monaco | null>(null);
    const issueDecorationsRef = useRef<string[]>([]);
    const highlightDecorationsRef = useRef<string[]>([]);
    const pendingDecorationsRef = useRef<Array<{
      line: number;
      severity: "error" | "warning" | "info";
      message: string;
    }> | null>(null);
    const monacoLanguage = MONACO_LANGUAGE_MAP[language] ?? "plaintext";

    function severityToOverviewColor(severity: "error" | "warning" | "info"): string {
      const varName =
        severity === "error" ? "--color-od-red"
        : severity === "warning" ? "--color-od-yellow"
        : "--color-od-accent";
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    function buildDecorations(
      monaco: typeof Monaco,
      items: Array<{ line: number; severity: "error" | "warning" | "info"; message: string }>,
    ): Monaco.editor.IModelDeltaDecoration[] {
      return items.map((d) => ({
        range: new monaco.Range(d.line, 1, d.line, 1),
        options: {
          isWholeLine: true,
          className: `issue-line-${d.severity}`,
          glyphMarginClassName: `issue-glyph-${d.severity}`,
          glyphMarginHoverMessage: { value: `**${d.severity}**: ${d.message}` },
          overviewRuler: {
            color: severityToOverviewColor(d.severity),
            position: monaco.editor.OverviewRulerLane.Right,
          },
        },
      }));
    }

    useImperativeHandle(
      ref,
      () => ({
        revealLine(line: number) {
          const editor = editorRef.current;
          if (!editor) return;
          editor.revealLineInCenter(line);
          editor.setPosition({ lineNumber: line, column: 1 });
        },
        setIssueDecorations(decorations) {
          const editor = editorRef.current;
          const monaco = monacoRef.current;
          if (!editor || !monaco) {
            // Editor not ready yet — queue for application on mount
            pendingDecorationsRef.current = decorations;
            return;
          }
          pendingDecorationsRef.current = null;

          issueDecorationsRef.current = editor.deltaDecorations(
            issueDecorationsRef.current,
            buildDecorations(monaco, decorations),
          );
        },
        clearIssueDecorations() {
          const editor = editorRef.current;
          if (!editor) return;
          issueDecorationsRef.current = editor.deltaDecorations(
            issueDecorationsRef.current,
            [],
          );
        },
        highlightLine(line: number, className: string) {
          const editor = editorRef.current;
          const monaco = monacoRef.current;
          if (!editor || !monaco) return;

          highlightDecorationsRef.current = editor.deltaDecorations(
            highlightDecorationsRef.current,
            [
              {
                range: new monaco.Range(line, 1, line, 1),
                options: { isWholeLine: true, className },
              },
            ],
          );
        },
        clearHighlights() {
          const editor = editorRef.current;
          if (!editor) return;
          highlightDecorationsRef.current = editor.deltaDecorations(
            highlightDecorationsRef.current,
            [],
          );
        },
        getEditor() {
          return editorRef.current;
        },
      }),
      [],
    );

    const handleMount: OnMount = useCallback(
      (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        registerPrettierFormatter(monaco);

        // Apply any decorations that were queued before the editor was ready
        if (pendingDecorationsRef.current) {
          const pending = pendingDecorationsRef.current;
          pendingDecorationsRef.current = null;
          issueDecorationsRef.current = editor.deltaDecorations(
            issueDecorationsRef.current,
            buildDecorations(monaco, pending),
          );
        }

        // Ctrl/Cmd + = — increase font size
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
          increaseFontSize();
        });
        // Ctrl/Cmd + Shift + = — increase font size (alternate)
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Equal,
          () => {
            increaseFontSize();
          },
        );
        // Ctrl/Cmd + - — decrease font size
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
          decreaseFontSize();
        });
        // Ctrl/Cmd + 0 — reset font size
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0,
          () => {
            resetFontSize();
          },
        );
        // Alt + Z — toggle word wrap
        editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
          toggleWordWrap();
        });
        // Ctrl/Cmd + Shift + F — format document (editable only)
        if (!readOnly) {
          editor.addCommand(
            monaco.KeyMod.CtrlCmd |
              monaco.KeyMod.Shift |
              monaco.KeyCode.KeyF,
            () => {
              editor.getAction("editor.action.formatDocument")?.run();
            },
          );
        }
      },
      [
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        toggleWordWrap,
        readOnly,
      ],
    );

    return (
      <div className={className}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-od-border bg-od-surface px-2 py-1">
          <button
            type="button"
            onClick={decreaseFontSize}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-od-fg hover:bg-od-float"
            title="Decrease font size (Ctrl+-)"
          >
            A-
          </button>
          <span className="min-w-[2rem] text-center text-xs text-od-fg-muted">
            {prefs.fontSize}
          </span>
          <button
            type="button"
            onClick={increaseFontSize}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-od-fg hover:bg-od-float"
            title="Increase font size (Ctrl+=)"
          >
            A+
          </button>
          <div className="mx-1 h-4 w-px bg-od-border" />
          <button
            type="button"
            onClick={toggleWordWrap}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              prefs.wordWrap === "on"
                ? "bg-od-accent/15 text-od-accent"
                : "text-od-fg hover:bg-od-float"
            }`}
            title="Toggle word wrap (Alt+Z)"
          >
            Wrap
          </button>
          {!readOnly && (
            <>
              <div className="mx-1 h-4 w-px bg-od-border" />
              <button
                type="button"
                disabled={!isFormattingSupported(monacoLanguage)}
                onClick={() => {
                  editorRef.current
                    ?.getAction("editor.action.formatDocument")
                    ?.run();
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  isFormattingSupported(monacoLanguage)
                    ? "text-od-fg hover:bg-od-float"
                    : "cursor-not-allowed text-od-fg-muted"
                }`}
                title={
                  isFormattingSupported(monacoLanguage)
                    ? "Format document (Ctrl+Shift+F)"
                    : "Formatting is not available for this language"
                }
              >
                Format
              </button>
            </>
          )}
        </div>

        {/* Editor */}
        <div className="overflow-hidden rounded-b-md border border-od-border">
          <Editor
            height={height}
            language={monacoLanguage}
            theme={theme === "dark" ? "vs-dark" : "vs"}
            value={value}
            onChange={(v) => onChange?.(v ?? "")}
            onMount={handleMount}
            loading={
              <div
                className="flex items-center justify-center"
                style={{ height }}
              >
                <span className="text-sm text-od-fg-muted">
                  Loading editor...
                </span>
              </div>
            }
            options={{
              readOnly,
              domReadOnly: readOnly,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: prefs.fontSize,
              wordWrap: prefs.wordWrap,
              bracketPairColorization: { enabled: true },
              padding: { top: 8, bottom: 8 },
              tabSize: 2,
              lineNumbers: "on",
              renderLineHighlight: "line",
              glyphMargin: true,
            }}
          />
        </div>
      </div>
    );
  },
);

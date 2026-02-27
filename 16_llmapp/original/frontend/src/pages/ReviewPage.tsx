import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ActionBar } from "@/components/ActionBar";
import { AppHeader } from "@/components/AppHeader";
import { CodeEditor, type CodeEditorHandle } from "@/components/CodeEditor";
import { DiffPanel } from "@/components/DiffPanel";
import { EmptyState } from "@/components/EmptyState";
import { GenerationStatus } from "@/components/GenerationStatus";
import { HistorySidebar } from "@/components/HistorySidebar";
import { IssuesPanel } from "@/components/IssuesPanel";
import { ReviewSettingsPanel } from "@/components/ReviewSettingsPanel";
import { ReviewTabs } from "@/components/ReviewTabs";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { SummaryBar } from "@/components/SummaryBar";
import { useDiffState } from "@/hooks/useDiffState";
import { computeHunks } from "@/lib/diffManager";
import { useIssueNavigator } from "@/hooks/useIssueNavigator";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLocalReview } from "@/hooks/useLocalReview";
import { useReviewHistory } from "@/hooks/useReviewHistory";
import { useStreamReview } from "@/hooks/useStreamReview";
import type { CodeExample } from "@/constants/examples";
import { readFileWithLanguage } from "@/lib/fileUpload";
import type { ReviewProvider, ReviewSettings } from "@/types/review";
import type { ReviewTab } from "@/types/ui";

export function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [provider, setProvider] = useState<ReviewProvider>("openai");
  const [settings, setSettings] = useState<ReviewSettings>({
    strictness: "normal",
    detail_level: "normal",
    focus_areas: [],
  });
  const [activeTab, setActiveTab] = useState<ReviewTab>("issues");
  const [activeIssueIndex, setActiveIssueIndex] = useState<number | null>(null);
  const [composerActive, setComposerActive] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  const editorRef = useRef<CodeEditorHandle>(null);
  const historyEditorRef = useRef<CodeEditorHandle>(null);
  const [historyActiveIssueIndex, setHistoryActiveIssueIndex] = useState<number | null>(null);

  // Capture the session ID from URL once on mount for initial load
  const [initialSessionId] = useState(() => {
    const param = searchParams.get("session");
    return param ? Number(param) : null;
  });

  const stream = useStreamReview();
  const local = useLocalReview();
  const history = useReviewHistory(initialSessionId);
  const diff = useDiffState();

  const isLocal = provider === "local";
  const isBusy = isLocal ? local.isProcessing : stream.isStreaming;
  const activeResult = isLocal ? local.result : stream.result;
  const activeError = isLocal ? local.error : stream.error;
  const activeIssues = isLocal ? local.issues : stream.issues;

  const displayIssues = activeResult?.issues ?? activeIssues;
  const displaySuggestions = activeResult?.suggestions ?? [];

  const canSubmit =
    !isBusy &&
    code.trim() !== "" &&
    !(isLocal && !local.webGPUSupported);
  const hasOutput =
    activeResult != null || activeError != null || activeIssues.length > 0;

  const isViewingHistory = history.selectedId !== null && !isBusy;

  // Sync selectedId to URL query param so it survives page refresh
  useEffect(() => {
    if (history.selectedId !== null) {
      setSearchParams({ session: String(history.selectedId) }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [history.selectedId, setSearchParams]);

  // Track prepended reviews to avoid duplicates
  const prependedStreamRef = useRef<number | null>(null);
  const prependedLocalRef = useRef<number | null>(null);

  // Snapshot code/language at submit time to avoid stale closures
  const submittedCodeRef = useRef("");
  const submittedLanguageRef = useRef("python");

  // Auto-prepend completed stream review to history
  useEffect(() => {
    if (
      stream.result &&
      stream.sessionId &&
      prependedStreamRef.current !== stream.sessionId
    ) {
      prependedStreamRef.current = stream.sessionId;
      history.prependSession(
        stream.sessionId,
        submittedCodeRef.current,
        submittedLanguageRef.current,
        "openai",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.result, stream.sessionId]);

  // Auto-prepend completed local review to history
  useEffect(() => {
    if (
      local.result &&
      local.sessionId &&
      prependedLocalRef.current !== local.sessionId
    ) {
      prependedLocalRef.current = local.sessionId;
      history.prependSession(
        local.sessionId,
        submittedCodeRef.current,
        submittedLanguageRef.current,
        "local",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.result, local.sessionId]);

  // Reset active issue when issues change
  useEffect(() => {
    setActiveIssueIndex(null);
  }, [displayIssues]);

  // Initialize diff state when result arrives with corrected_code
  useEffect(() => {
    if (
      activeResult?.corrected_code &&
      activeResult.corrected_code.trim() !== code.trim()
    ) {
      diff.initialize(code, activeResult.corrected_code);
    } else {
      diff.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResult]);

  function handleProviderChange(p: ReviewProvider) {
    if (p === provider) return;
    stream.reset();
    local.reset();
    setProvider(p);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    submittedCodeRef.current = code;
    submittedLanguageRef.current = language;
    history.clearSelection();
    if (isLocal) {
      local.startReview(code, language, settings);
    } else {
      stream.startStream(code, language, settings);
    }
  }

  // Sync editor code when hunks are applied
  useEffect(() => {
    if (diff.state.workingCode && diff.state.workingCode !== diff.state.originalCode) {
      setCode(diff.state.workingCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff.state.workingCode]);

  function handleCancel() {
    if (isLocal) {
      local.reset();
    } else {
      stream.reset();
    }
  }

  function handleClear() {
    if (isLocal) {
      local.reset();
    } else {
      stream.reset();
    }
  }

  function handleSelectSession(id: number) {
    stream.reset();
    local.reset();
    history.selectSession(id);
  }

  function handleNewReview() {
    history.clearSelection();
    stream.reset();
    local.reset();
    setCode("");
    setComposerActive(false);
  }

  function handleSelectIssue(index: number) {
    setActiveIssueIndex(index);
    // Navigate editor to issue line
    const issue = displayIssues[index];
    if (issue?.line != null) {
      editorRef.current?.revealLine(issue.line);
      editorRef.current?.highlightLine(issue.line, "issue-line-highlight");
    }
  }

  function handleSelectExample(example: CodeExample) {
    setCode(example.code);
    setLanguage(example.language);
    setComposerActive(true);
  }

  function handleUploadFile(content: string, lang: string) {
    setCode(content);
    setLanguage(lang);
    setComposerActive(true);
  }

  function handlePasteCode() {
    setComposerActive(true);
  }

  const showEmptyState = !composerActive && code === "" && !hasOutput && !isBusy;

  const { nextIssue, prevIssue } = useIssueNavigator({
    issues: displayIssues,
    activeIndex: activeIssueIndex,
    onSelectIssue: handleSelectIssue,
  });

  // Update editor decorations when issues change
  useEffect(() => {
    if (!editorRef.current) return;
    const issuesWithLines = displayIssues.filter((i) => i.line != null);
    if (issuesWithLines.length > 0) {
      editorRef.current.setIssueDecorations(
        issuesWithLines.map((i) => ({
          line: i.line!,
          severity: i.severity,
          message: i.message,
        })),
      );
    } else {
      editorRef.current.clearIssueDecorations();
    }
    editorRef.current.clearHighlights();
  }, [displayIssues]);

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => ({
      "mod+enter": () => handleSubmit(),
      escape: () => {
        if (isBusy) handleCancel();
      },
      f8: () => nextIssue(),
      "shift+f8": () => prevIssue(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canSubmit, isBusy, isLocal, nextIssue, prevIssue],
  );
  useKeyboardShortcuts(shortcuts);

  // Compute hunks for history view
  const historyHunks = useMemo(() => {
    const detail = history.selectedDetail;
    if (!detail?.result?.corrected_code) return [];
    const orig = detail.session.code;
    const corrected = detail.result.corrected_code;
    if (corrected.trim() === orig.trim()) return [];
    return computeHunks(orig, corrected);
  }, [history.selectedDetail]);

  // Set decorations on history editor when detail loads
  const historyIssues = history.selectedDetail?.result?.issues ?? [];
  useEffect(() => {
    if (!historyEditorRef.current) return;
    const issuesWithLines = historyIssues.filter((i) => i.line != null);
    if (issuesWithLines.length > 0) {
      historyEditorRef.current.setIssueDecorations(
        issuesWithLines.map((i) => ({
          line: i.line!,
          severity: i.severity,
          message: i.message,
        })),
      );
    } else {
      historyEditorRef.current.clearIssueDecorations();
    }
    historyEditorRef.current.clearHighlights();
    setHistoryActiveIssueIndex(null);
  }, [historyIssues]);

  function handleHistorySelectIssue(index: number) {
    setHistoryActiveIssueIndex(index);
    const issue = historyIssues[index];
    if (issue?.line != null) {
      historyEditorRef.current?.revealLine(issue.line);
      historyEditorRef.current?.highlightLine(issue.line, "issue-line-highlight");
    }
  }

  // Render history detail view
  const renderHistoryView = useCallback(() => {
    if (history.isLoadingDetail) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-od-border border-t-od-accent" />
        </div>
      );
    }

    if (!history.selectedDetail && history.detailError) {
      return (
        <div className="rounded-md border border-od-red/30 bg-od-red/5 p-3 text-sm text-od-red">
          {history.detailError}
        </div>
      );
    }

    if (!history.selectedDetail) return null;

    const detail = history.selectedDetail;
    const hIssues = detail.result?.issues ?? [];
    const historySuggestions = detail.result?.suggestions ?? [];

    return (
      <>
        {/* Read-only code display */}
        <div className="mb-4">
          <div className="mb-1 flex items-center gap-2">
            <label className="text-sm font-medium text-od-fg-bright">Code</label>
            <span className="inline-flex items-center rounded-full bg-od-overlay/60 px-1.5 py-0.5 text-[10px] font-medium leading-none text-od-fg">
              {detail.session.language}
            </span>
            <span className="text-xs text-od-fg-muted">read-only</span>
          </div>
          <CodeEditor
            ref={historyEditorRef}
            value={detail.session.code}
            language={detail.session.language}
            readOnly
            height="300px"
          />
        </div>

        {/* Review result */}
        {detail.result ? (
          <>
            <SummaryBar
              issues={hIssues}
              summary={detail.result.summary}
              provider={detail.session.provider as ReviewProvider}
            />
            <div className="mt-4">
              <ReviewTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                issueCount={hIssues.length}
                hunkCount={historyHunks.length}
                suggestionCount={historySuggestions.length}
              >
                {activeTab === "issues" && (
                  <IssuesPanel
                    issues={hIssues}
                    activeIndex={historyActiveIssueIndex}
                    onSelectIssue={handleHistorySelectIssue}
                  />
                )}
                {activeTab === "diff" && (
                  <DiffPanel
                    originalCode={detail.session.code}
                    correctedCode={detail.result.corrected_code}
                    hunks={historyHunks}
                    canUndo={false}
                    onApplyHunk={() => {}}
                    onDiscardHunk={() => {}}
                    onApplyAll={() => {}}
                    onUndo={() => {}}
                    onCopyPatch={() => {}}
                  />
                )}
                {activeTab === "suggestions" && (
                  <SuggestionsPanel suggestions={historySuggestions} />
                )}
              </ReviewTabs>
            </div>
          </>
        ) : (
          <div className="rounded-md border border-od-yellow/30 bg-od-yellow/5 p-3 text-sm text-od-yellow">
            No review result found for this session.
          </div>
        )}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.isLoadingDetail, history.selectedDetail, history.detailError, activeTab, historyActiveIssueIndex]);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;
    readFileWithLanguage(file, handleUploadFile);
  }

  return (
    <div
      className="flex h-screen flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="border-b border-od-border bg-od-base px-6">
        <AppHeader />
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <HistorySidebar
          sessions={history.sessions}
          selectedId={history.selectedId}
          isLoadingList={history.isLoadingList}
          isLoadingDetail={history.isLoadingDetail}
          hasMore={history.hasMore}
          listError={history.listError}
          selectedDetail={history.selectedDetail}
          onSelect={handleSelectSession}
          onNewReview={handleNewReview}
          onLoadMore={history.loadMore}
          onDelete={history.deleteSession}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-od-surface">
          <div className="mx-auto max-w-4xl p-6">
            {/* History detail view */}
            {isViewingHistory && renderHistoryView()}

            {/* Composer view */}
            {!isViewingHistory && showEmptyState && (
              <EmptyState
                onSelectExample={handleSelectExample}
                onUploadFile={handleUploadFile}
                onPasteCode={handlePasteCode}
                isDraggingOver={isDraggingOver}
              />
            )}

            {!isViewingHistory && !showEmptyState && (
              <>
                {/* Action bar */}
                <ActionBar
                  provider={provider}
                  language={language}
                  isBusy={isBusy}
                  canSubmit={canSubmit}
                  hasOutput={hasOutput}
                  modelReady={local.modelReady}
                  isLocal={isLocal}
                  onProviderChange={handleProviderChange}
                  onLanguageChange={setLanguage}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  onClear={handleClear}
                />

                {/* WebGPU warning */}
                {isLocal && !local.webGPUSupported && (
                  <div className="mt-4 rounded-md border border-od-yellow/30 bg-od-yellow/5 p-3 text-sm text-od-yellow">
                    WebGPU is not available in this browser. Local inference
                    requires Chrome or Edge with WebGPU support.
                  </div>
                )}

                {/* Model loading progress */}
                {isLocal && local.modelStatus.stage === "loading" && (
                  <div className="mt-4 rounded-md border border-od-accent/30 bg-od-accent/5 p-3">
                    <p className="mb-1 text-sm text-od-accent">
                      {local.modelStatus.text ?? "Loading model..."}
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-od-accent/20">
                      <div
                        className="h-full rounded-full bg-od-accent transition-all"
                        style={{
                          width: `${Math.round((local.modelStatus.progress ?? 0) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Model error */}
                {isLocal && local.modelStatus.stage === "error" && (
                  <div className="mt-4 rounded-md border border-od-red/30 bg-od-red/5 p-3 text-sm text-od-red">
                    {local.modelStatus.text ?? "Failed to load model."}
                  </div>
                )}

                {/* Code input */}
                <div className="mt-4">
                  <CodeEditor
                    ref={editorRef}
                    value={code}
                    onChange={setCode}
                    language={language}
                    height="300px"
                  />
                </div>

                {/* Review settings */}
                <div className="mt-4">
                  <ReviewSettingsPanel
                    settings={settings}
                    onChange={setSettings}
                    disabled={isBusy}
                  />
                </div>

                {/* Generation status */}
                {(isBusy || activeError) && (
                  <div className="mt-4">
                    <GenerationStatus
                      isBusy={isBusy}
                      issueCount={activeIssues.length}
                      provider={provider}
                      onCancel={handleCancel}
                      onRetry={activeError ? (isLocal ? local.retry : stream.retry) : undefined}
                    />
                  </div>
                )}

                {/* Error */}
                {activeError && (
                  <div className="mt-4 rounded-md border border-od-red/30 bg-od-red/5 p-3 text-sm text-od-red">
                    {activeError}
                  </div>
                )}

                {/* Persistence warning */}
                {isLocal && local.persistenceWarning && (
                  <div className="mt-4 rounded-md border border-od-orange/30 bg-od-orange/5 p-3 text-sm text-od-orange">
                    {local.persistenceWarning}
                  </div>
                )}

                {/* Results */}
                {hasOutput && !activeError && (
                  <div className="mt-4">
                    <SummaryBar
                      issues={displayIssues}
                      summary={activeResult?.summary ?? null}
                      provider={provider}
                    />
                    <div className="mt-4">
                      <ReviewTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        issueCount={displayIssues.length}
                        hunkCount={diff.state.hunks.length}
                        suggestionCount={displaySuggestions.length}
                      >
                        {activeTab === "issues" && (
                          <IssuesPanel
                            issues={displayIssues}
                            activeIndex={activeIssueIndex}
                            onSelectIssue={handleSelectIssue}
                          />
                        )}
                        {activeTab === "diff" && (
                          <DiffPanel
                            originalCode={code}
                            correctedCode={activeResult?.corrected_code ?? null}
                            hunks={diff.state.hunks}
                            canUndo={diff.state.undoSnapshot !== null}
                            onApplyHunk={diff.applyHunk}
                            onDiscardHunk={diff.discardHunk}
                            onApplyAll={diff.applyAll}
                            onUndo={diff.undo}
                            onCopyPatch={diff.copyPatch}
                          />
                        )}
                        {activeTab === "suggestions" && (
                          <SuggestionsPanel suggestions={displaySuggestions} />
                        )}
                      </ReviewTabs>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

/**
 * SmartCodeEditor — the 4-column agent-native code-editor surface.
 *
 * Layout (all columns resizable):
 *   ┌──────────┬──────────────────┬──────────────┬─────────┐
 *   │ History  │ Agent Runner     │ Code / Diff  │ Files   │
 *   │ (drafts  │ (picker +        │ (in-place    │ (multi- │
 *   │  merge)  │  conversation +  │  swap)       │  file)  │
 *   │          │  SmartAgentInput)│              │         │
 *   └──────────┴──────────────────┴──────────────┴─────────┘
 *
 * File state is owned by the shared `useCodeEditorWindowState` hook — same
 * one `CodeEditorWindow` and `MultiFileSmartCodeEditorWindow` use. That
 * means we inherit the proven tab + file-content + toolbar state machine
 * for free, and the UI is visually identical to those surfaces.
 *
 * Agent state:
 *   - Widget handle registered ONCE per editor mount (reused across every
 *     conversation launched from this editor).
 *   - Widget tool calls BUFFER — they don't mutate `code` live. At stream-
 *     end `useSmartCodeEditor` flushes the buffer and transitions the UI
 *     to the full 4-tab `ReviewStage`.
 *   - IDE context + other-file context slots dispatch into the active
 *     conversation's `instanceContext` on every relevant change.
 *   - First-turn variable is seeded from the active file's code per agent
 *     (`codeVariableKey`).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { setUserVariableValues } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { loadConversation } from "@/features/agents/redux/execution-system/thunks/load-conversation.thunk";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { pct } from "@/components/matrx/resizable/pct";
import { useCodeEditorWindowState } from "@/features/window-panels/windows/code/useCodeEditorWindowState";
import type { CodeFile } from "@/features/code-editor/multi-file-core/types";

import { useCodeEditorWidgetHandle } from "../hooks/useCodeEditorWidgetHandle";
import { useIdeContextSync } from "../hooks/useIdeContextSync";
import { useSmartCodeEditor } from "../hooks/useSmartCodeEditor";
import { CodeEditorHistoryPanel } from "./parts/CodeEditorHistoryPanel";
import { AgentRunnerColumn } from "./parts/AgentRunnerColumn";
import { CodeOrDiffColumn } from "./parts/CodeOrDiffColumn";
import { FilesPanel } from "./parts/FilesPanel";
import { TerminalPlaceholder } from "./parts/TerminalPlaceholder";
import { SMART_CODE_EDITOR_SURFACE_KEY } from "../constants";
import type { CodeEditorAgentConfig } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const SINGLE_FILE_PATH = "__single_file__";

/**
 * Build a stable, Claude-friendly context key for another file. The agent
 * retrieves via `ctx_get("file_<slug>")`.
 */
function fileContextKey(filePath: string, fileName: string): string {
  const rawSlug = fileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const slug =
    rawSlug.length > 0 ? rawSlug : filePath.replace(/[^a-z0-9]/gi, "_");
  return `file_${slug}`;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface SmartCodeEditorProps {
  /** The set of agents the editor supports. First agent is the picker default. */
  agents: CodeEditorAgentConfig[];
  /** Initial picker-selected agent id. Defaults to `agents[0]`. */
  defaultPickerAgentId?: string;

  /** Single-file content (ignored when `files` is provided). */
  initialCode?: string;
  /** Language identifier (single-file mode, or fallback when a file omits one). */
  language: string;
  /** Fires every time the active file's code changes. */
  onCodeChange?: (code: string, filePath: string | null) => void;

  /** Multi-file mode — when provided, activates the Files column. */
  files?: CodeFile[];
  /** Which file is active on mount (default: files[0].path). */
  initialActiveFilePath?: string;

  // ── Optional IDE context (fed into vsc_* slots) ────────────────────────────
  filePath?: string;
  selection?: string;
  diagnostics?: string;
  workspaceName?: string;
  workspaceFolders?: string;
  gitBranch?: string;
  gitStatus?: string;
  agentSkills?: string;

  /** Ignored — the window/modal shell already renders the title. Kept for API compat. */
  title?: string;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SmartCodeEditor({
  agents,
  defaultPickerAgentId,
  initialCode = "",
  language,
  onCodeChange,
  files,
  initialActiveFilePath,
  filePath,
  selection,
  diagnostics,
  workspaceName,
  workspaceFolders,
  gitBranch,
  gitStatus,
  agentSkills,
  title,
  className,
}: SmartCodeEditorProps) {
  void title; // intentionally unused — window shell renders the title.

  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { launchAgent } = useAgentLauncher();

  // ── Picker state ──────────────────────────────────────────────────────────
  const [pickerAgentId, setPickerAgentId] = useState<string>(
    defaultPickerAgentId ?? agents[0]?.id ?? "",
  );

  // ── Active conversation ───────────────────────────────────────────────────
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  const activeAgent = useMemo(
    () => agents.find((a) => a.id === activeAgentId) ?? null,
    [agents, activeAgentId],
  );

  // ── File state (shared CodeEditorWindow hook) ─────────────────────────────
  const isMultiFile = (files?.length ?? 0) > 0;

  // In single-file mode, synthesize a one-item CodeFile list so the hook
  // has something to manage. The tab bar still shows one tab (minimal UI).
  const seedFiles: CodeFile[] = useMemo(() => {
    if (files && files.length > 0) return files;
    return [
      {
        name: "code",
        path: SINGLE_FILE_PATH,
        language,
        content: initialCode,
      },
    ];
    // Intentional: we don't re-seed on `initialCode` changes — after first
    // mount the hook owns content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, language]);

  const editorState = useCodeEditorWindowState({
    initialFiles: seedFiles,
    initialActiveFile:
      initialActiveFilePath ?? seedFiles[0]?.path ?? null,
  });

  const {
    files: currentFiles,
    currentFile,
    openTabs,
    activeTab,
    openFile,
    closeTab,
    selectTab,
    isEditing,
    setIsEditing,
    showWrapLines,
    setShowWrapLines,
    minimapEnabled,
    setMinimapEnabled,
    formatTrigger,
    isCopied,
    handleContentChange,
    handleCopy,
    handleFormat,
    getEditorPath,
    mapLanguageForMonaco,
    editorWrapperRef,
    editorHeight,
  } = editorState;

  const code = currentFile?.content ?? "";
  const activeLanguage = currentFile?.language ?? language;

  // Intercept Monaco edits so we can notify the external `onCodeChange`
  // alongside the hook's internal state update.
  const wrappedHandleContentChange = useCallback(
    (value: string | undefined) => {
      handleContentChange(value);
      if (value !== undefined) onCodeChange?.(value, activeTab);
    },
    [handleContentChange, onCodeChange, activeTab],
  );

  // Called when the widget applies edits on Apply — mirrors the Monaco path.
  const widgetOnCodeChange = useCallback(
    (next: string) => {
      handleContentChange(next);
      onCodeChange?.(next, activeTab);
    },
    [handleContentChange, onCodeChange, activeTab],
  );

  // ── Widget handle (buffered; flushes at stream-end) ───────────────────────
  const { widgetHandleId, consumePending } = useCodeEditorWidgetHandle({
    code,
  });

  // ── IDE context sync ──────────────────────────────────────────────────────
  useIdeContextSync(activeConversationId, {
    code,
    language: activeLanguage,
    filePath: currentFile?.path ?? filePath,
    selection,
    diagnostics,
    workspaceName,
    workspaceFolders,
    gitBranch,
    gitStatus,
    agentSkills,
  });

  // ── Other-files context slots (multi-file only) ───────────────────────────
  useEffect(() => {
    if (!activeConversationId || !isMultiFile) return;
    const entries = currentFiles
      .filter((f) => f.path !== activeTab)
      .map((f) => ({
        key: fileContextKey(f.path, f.name),
        value: `File: ${f.name}${f.language ? ` (${f.language})` : ""}\n\n${f.content}`,
        type: "text" as const,
        label: f.name,
      }));
    if (entries.length === 0) return;
    import(
      "@/features/agents/redux/execution-system/instance-context/instance-context.slice"
    ).then(({ setContextEntries }) => {
      dispatch(
        setContextEntries({ conversationId: activeConversationId, entries }),
      );
    });
  }, [activeConversationId, isMultiFile, currentFiles, activeTab, dispatch]);

  // ── Variable sync (first-turn only; context takes over after) ────────────
  useEffect(() => {
    if (!activeConversationId || !activeAgent) return;
    dispatch(
      setUserVariableValues({
        conversationId: activeConversationId,
        values: { [activeAgent.codeVariableKey]: code },
      }),
    );
  }, [activeConversationId, activeAgent, code, dispatch]);

  // ── Agent state machine (buffered widget edits → review) ─────────────────
  const {
    state,
    setState,
    parsedEdits,
    modifiedCode,
    errorMessage,
    rawAIResponse,
    isCopied: reviewIsCopied,
    diffStats,
    handleApplyChanges,
    handleCopyResponse,
    handleRejectEdits,
  } = useSmartCodeEditor({
    conversationId: activeConversationId,
    currentCode: code,
    onCodeChange: widgetOnCodeChange,
    consumeWidgetEdits: consumePending,
  });

  // ── Draft creation ────────────────────────────────────────────────────────
  const handleCreateDraft = useCallback(
    async (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;
      try {
        const result = await launchAgent(agentId, {
          surfaceKey: SMART_CODE_EDITOR_SURFACE_KEY,
          sourceFeature: "code-editor",
          apiEndpointMode: "agent",
          config: {
            displayMode: "direct",
            autoRun: false,
            allowChat: true,
            defaultVariables: { [agent.codeVariableKey]: code },
          },
          runtime: {
            widgetHandleId,
          },
        });
        setActiveConversationId(result.conversationId);
        setActiveAgentId(agentId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[SmartCodeEditor] launchAgent failed", err);
      }
    },
    [agents, code, launchAgent, widgetHandleId],
  );

  // ── Select an existing conversation (mirrors AgentRunnerPage URL-sync) ────
  const handleSelectConversation = useCallback(
    async (conversationId: string, agentId: string) => {
      setActiveConversationId(conversationId);
      setActiveAgentId(agentId);

      // Mirror of AgentRunnerPage's URL-sync pattern — direct lookup on the
      // store snapshot instead of a curried selector call.
      const exists =
        !!store.getState().conversations?.byConversationId[conversationId];

      if (!exists) {
        try {
          await dispatch(
            createManualInstance({
              agentId,
              conversationId,
              apiEndpointMode: "agent",
              widgetHandleId,
            }),
          ).unwrap();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[SmartCodeEditor] createManualInstance failed", err);
          return;
        }
      }

      try {
        await dispatch(
          loadConversation({
            conversationId,
            surfaceKey: SMART_CODE_EDITOR_SURFACE_KEY,
          }),
        ).unwrap();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[SmartCodeEditor] loadConversation failed", err);
      }
    },
    [store, dispatch, widgetHandleId],
  );

  // ── Derived Monaco props ──────────────────────────────────────────────────
  const editorPath = currentFile ? getEditorPath(currentFile) : undefined;
  const monacoLanguage = currentFile
    ? mapLanguageForMonaco(currentFile.language)
    : "plaintext";

  return (
    <div className={`h-full w-full flex flex-col ${className ?? ""}`}>
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full min-h-0"
        >
          {/* Column 1: History */}
          <ResizablePanel
            defaultSize={pct(18)}
            minSize={pct(12)}
            maxSize={pct(30)}
          >
            <CodeEditorHistoryPanel
              agents={agents}
              pickerAgentId={pickerAgentId}
              onPickerAgentChange={setPickerAgentId}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onCreateDraft={handleCreateDraft}
            />
          </ResizablePanel>
          <ResizableHandle />

          {/* Column 2: Agent runner */}
          <ResizablePanel defaultSize={pct(30)} minSize={pct(18)}>
            <AgentRunnerColumn
              conversationId={activeConversationId}
              activeAgentId={activeAgentId}
            />
          </ResizablePanel>
          <ResizableHandle />

          {/* Column 3: Code / Diff on top, Terminal below */}
          <ResizablePanel
            defaultSize={pct(isMultiFile ? 36 : 52)}
            minSize={pct(20)}
          >
            <ResizablePanelGroup
              orientation="vertical"
              className="h-full w-full min-h-0"
            >
              <ResizablePanel defaultSize={pct(75)} minSize={pct(40)}>
                <CodeOrDiffColumn
                  files={currentFiles}
                  openTabs={openTabs}
                  activeTab={activeTab}
                  currentFile={currentFile}
                  onTabClick={selectTab}
                  onTabClose={closeTab}
                  onContentChange={wrappedHandleContentChange}
                  editorWrapperRef={editorWrapperRef}
                  editorHeight={editorHeight}
                  editorPath={editorPath}
                  monacoLanguage={monacoLanguage}
                  isEditing={isEditing}
                  onToggleEditing={() => setIsEditing(!isEditing)}
                  showWrapLines={showWrapLines}
                  onToggleWordWrap={() => setShowWrapLines(!showWrapLines)}
                  minimapEnabled={minimapEnabled}
                  onToggleMinimap={() => setMinimapEnabled(!minimapEnabled)}
                  formatTrigger={formatTrigger}
                  onFormat={handleFormat}
                  isCopied={isCopied}
                  onCopy={handleCopy}
                  state={state}
                  parsedEdits={parsedEdits}
                  modifiedCode={modifiedCode}
                  rawAIResponse={rawAIResponse}
                  errorMessage={errorMessage}
                  reviewIsCopied={reviewIsCopied}
                  diffStats={diffStats}
                  onApply={handleApplyChanges}
                  onDiscard={handleRejectEdits}
                  onCopyResponse={handleCopyResponse}
                  onBackToInput={() => setState("input")}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={pct(25)}
                minSize={pct(8)}
                maxSize={pct(60)}
              >
                <TerminalPlaceholder />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Column 4: Files (multi-file only) */}
          {isMultiFile && (
            <>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={pct(16)}
                minSize={pct(10)}
                maxSize={pct(28)}
              >
                <FilesPanel
                  files={currentFiles}
                  activeFilePath={activeTab}
                  onSelectFile={openFile}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

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
 * Owns:
 *   - The widget handle (registered ONCE per editor mount; reused across
 *     all conversations launched from this editor).
 *   - The active conversation id (what's being displayed in col 2+3).
 *   - The "picker agent" (what [+] creates for in col 1).
 *   - The live code (owned locally; caller gets updates via onCodeChange).
 *   - The multi-file active file id (when `files` is provided).
 *   - Context-slot sync: every render, dispatches setContextEntries with
 *     the current IDE state so the agent can `ctx_get`.
 *   - Variable sync: every render while there's an active conversation,
 *     dispatches setUserVariableValues to map the code into that agent's
 *     configured variable key. (First-turn only matters; after that the
 *     variable system is inert and context takes over.)
 *
 * The diff is rendered IN-PLACE in column 3 during review — NOT a modal.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { setUserVariableValues } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { pct } from "@/components/matrx/resizable/pct";
import { useCodeEditorWidgetHandle } from "../hooks/useCodeEditorWidgetHandle";
import { useIdeContextSync } from "../hooks/useIdeContextSync";
import { useSmartCodeEditor } from "../hooks/useSmartCodeEditor";
import { CodeEditorHistoryPanel } from "./parts/CodeEditorHistoryPanel";
import { AgentRunnerColumn } from "./parts/AgentRunnerColumn";
import { CodeOrDiffColumn } from "./parts/CodeOrDiffColumn";
import { FilesPanel } from "./parts/FilesPanel";
import { TerminalPlaceholder } from "./parts/TerminalPlaceholder";
import { SMART_CODE_EDITOR_SURFACE_KEY } from "../constants";
import type { CodeEditorAgentConfig, CodeEditorFile } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a stable, safe key for another file's context slot. The agent
 * retrieves via `ctx_get("file_<slug>")`. Slugs keep only alphanumerics +
 * underscore; collisions fall back to the file id.
 */
function fileContextKey(fileId: string, fileTitle: string): string {
  const rawSlug = fileTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const slug =
    rawSlug.length > 0 ? rawSlug : fileId.replace(/[^a-z0-9]/gi, "_");
  return `file_${slug}`;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface SmartCodeEditorProps {
  /** The set of agents the editor supports. First agent is the picker default. */
  agents: CodeEditorAgentConfig[];
  /** Initial picker-selected agent id. Defaults to `agents[0]`. */
  defaultPickerAgentId?: string;

  /** Single-file content (ignored in multi-file mode). */
  initialCode?: string;
  /** Language identifier. */
  language: string;
  /** Fires every time the active file's code changes (local edits + AI mutations). */
  onCodeChange?: (code: string, fileId: string | null) => void;

  /** Multi-file mode — when provided, activates the Files column. */
  files?: CodeEditorFile[];
  /** Which file is active on mount (default: first file). */
  initialActiveFileId?: string;

  // ── Optional IDE context (fed into vsc_* slots) ────────────────────────────
  filePath?: string;
  selection?: string;
  diagnostics?: string;
  workspaceName?: string;
  workspaceFolders?: string;
  gitBranch?: string;
  gitStatus?: string;
  agentSkills?: string;

  /** Optional title shown at the top of the editor. */
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
  initialActiveFileId,
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
  const dispatch = useAppDispatch();
  const { launchAgent } = useAgentLauncher();

  // ── Picker state (which agent the [+] creates for) ────────────────────────
  const [pickerAgentId, setPickerAgentId] = useState<string>(
    defaultPickerAgentId ?? agents[0]?.id ?? "",
  );

  // ── Active conversation ────────────────────────────────────────────────────
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  // Lookup the active agent's config (for variable-key mapping).
  const activeAgent = useMemo(
    () => agents.find((a) => a.id === activeAgentId) ?? null,
    [agents, activeAgentId],
  );

  // ── Multi-file state ──────────────────────────────────────────────────────
  const isMultiFile = (files?.length ?? 0) > 0;
  const [activeFileId, setActiveFileId] = useState<string | null>(
    initialActiveFileId ?? files?.[0]?.id ?? null,
  );

  // Keep a local copy of multi-file contents so edits are preserved as the
  // user swaps files. For single-file mode, `code` is the source of truth.
  const [fileContents, setFileContents] = useState<Record<string, string>>(
    () => {
      if (!files) return {};
      const out: Record<string, string> = {};
      for (const f of files) out[f.id] = f.value;
      return out;
    },
  );
  // Sync from props if the `files` identity changes (new file set).
  useEffect(() => {
    if (!files) return;
    setFileContents((prev) => {
      const next = { ...prev };
      for (const f of files) {
        if (next[f.id] === undefined) next[f.id] = f.value;
      }
      return next;
    });
  }, [files]);

  const [singleFileCode, setSingleFileCode] = useState<string>(initialCode);

  // Current code = active file's contents (multi-file) or singleFileCode.
  const code = isMultiFile
    ? activeFileId
      ? (fileContents[activeFileId] ?? "")
      : ""
    : singleFileCode;

  // Active file's language overrides the top-level language when provided.
  const activeLanguage = useMemo(() => {
    if (!isMultiFile) return language;
    const f = files?.find((x) => x.id === activeFileId);
    return f?.language ?? language;
  }, [isMultiFile, files, activeFileId, language]);

  const handleCodeChange = useCallback(
    (next: string) => {
      if (isMultiFile && activeFileId) {
        setFileContents((prev) => ({ ...prev, [activeFileId]: next }));
      } else {
        setSingleFileCode(next);
      }
      onCodeChange?.(next, isMultiFile ? activeFileId : null);
    },
    [isMultiFile, activeFileId, onCodeChange],
  );

  // ── Widget handle (once per mount, reused across conversations) ───────────
  const widgetHandleId = useCodeEditorWidgetHandle({
    code,
    onCodeChange: handleCodeChange,
  });

  // ── IDE context sync (vsc_* slots for whichever conversation is active) ───
  useIdeContextSync(activeConversationId, {
    code,
    language: activeLanguage,
    filePath,
    selection,
    diagnostics,
    workspaceName,
    workspaceFolders,
    gitBranch,
    gitStatus,
    agentSkills,
  });

  // ── Other-files context slots (multi-file only) ──────────────────────────
  useEffect(() => {
    if (!activeConversationId || !isMultiFile || !files) return;
    // Build context entries for every file EXCEPT the active one. Each gets
    // its own `file_<slug>` key so the agent can `ctx_get` a specific file.
    const entries = files
      .filter((f) => f.id !== activeFileId)
      .map((f) => ({
        key: fileContextKey(f.id, f.title),
        value: `File: ${f.title}${f.language ? ` (${f.language})` : ""}\n\n${fileContents[f.id] ?? f.value}`,
        type: "text" as const,
        label: f.title,
      }));
    if (entries.length === 0) return;
    // Lazy import to avoid a circular dep at type-check time.
    import("@/features/agents/redux/execution-system/instance-context/instance-context.slice").then(
      ({ setContextEntries }) => {
        dispatch(
          setContextEntries({ conversationId: activeConversationId, entries }),
        );
      },
    );
  }, [
    activeConversationId,
    isMultiFile,
    files,
    activeFileId,
    fileContents,
    dispatch,
  ]);

  // ── Variable sync — push `code` into the active agent's variable slot ────
  // Only matters on first turn; after that the agent relies on context slots.
  useEffect(() => {
    if (!activeConversationId || !activeAgent) return;
    dispatch(
      setUserVariableValues({
        conversationId: activeConversationId,
        values: { [activeAgent.codeVariableKey]: code },
      }),
    );
  }, [activeConversationId, activeAgent, code, dispatch]);

  // ── State machine hook (review / processing / error / etc.) ──────────────
  const {
    state,
    setState,
    parsedEdits,
    modifiedCode,
    errorMessage,
    rawAIResponse,
    isCopied,
    diffStats,
    streamingText,
    handleApplyChanges,
    handleCopyResponse,
    handleRejectEdits,
  } = useSmartCodeEditor({
    conversationId: activeConversationId,
    currentCode: code,
    onCodeChange: handleCodeChange,
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
          displayMode: "direct",
          autoRun: false,
          allowChat: true,
          apiEndpointMode: "agent",
          widgetHandleId,
          variables: { [agent.codeVariableKey]: code },
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

  // Selecting an existing conversation from the history panel.
  const handleSelectConversation = useCallback(
    (conversationId: string, agentId: string) => {
      setActiveConversationId(conversationId);
      setActiveAgentId(agentId);
    },
    [],
  );

  return (
    <div className={`h-full w-full flex flex-col ${className ?? ""}`}>
      {title && (
        <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
      )}

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

          {/* Column 2: Agent runner (picker + conversation + input) */}
          <ResizablePanel defaultSize={pct(30)} minSize={pct(18)}>
            <AgentRunnerColumn
              conversationId={activeConversationId}
              activeAgentId={activeAgentId}
            />
          </ResizablePanel>
          <ResizableHandle />

          {/* Column 3: Code-or-Diff on top, Terminal below (nested vertical) */}
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
                  code={code}
                  onCodeChange={handleCodeChange}
                  language={activeLanguage}
                  state={state}
                  parsedEdits={parsedEdits}
                  modifiedCode={modifiedCode}
                  rawAIResponse={rawAIResponse}
                  errorMessage={errorMessage}
                  isCopied={isCopied}
                  diffStats={diffStats}
                  streamingText={streamingText}
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
          {isMultiFile && files && (
            <>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={pct(16)}
                minSize={pct(10)}
                maxSize={pct(28)}
              >
                <FilesPanel
                  files={files}
                  activeFileId={activeFileId}
                  onSelectFile={setActiveFileId}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

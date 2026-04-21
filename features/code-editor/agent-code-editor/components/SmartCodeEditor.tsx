"use client";

/**
 * SmartCodeEditor — the self-managed code editor for the agent system.
 *
 * Smart pattern: takes `conversationId` (required) + editor props, reads
 * EVERYTHING else from Redux via selectors, dispatches via thunks. No
 * callback prop-drilling for state.
 *
 * Composition:
 *   ┌──────────────────────────────────────────┐
 *   │ header (title)                           │
 *   ├────────────────────────────────────┬─────┤
 *   │ main area                          │ (opt)│
 *   │  input+processing → code display   │ chat │
 *   │  review           → ReviewStage    │ pane │
 *   │  applying         → spinner        │      │
 *   │  complete         → check          │      │
 *   │  error            → ErrorPanel     │      │
 *   ├────────────────────────────────────┴─────┤
 *   │ footer: SmartAgentInput (self-managed)   │
 *   └──────────────────────────────────────────┘
 *
 * The right "chat pane" appears when messages exist. SmartAgentInput owns
 * text entry, attachments, variable inputs, submit-on-enter, and dispatches
 * `smartExecute` on send.
 *
 * Widget handle registration happens INSIDE SmartCodeEditor because the
 * handle needs access to the current code + onCodeChange (per-render). The
 * modal creates the conversation and passes its id + the handle id into the
 * invocation's callbacks before launch.
 *
 * NOTE: this component assumes the conversation already exists (i.e. the
 * launch step completed). SmartCodeEditorModal is responsible for the
 * launch lifecycle; any other caller passing a raw conversationId is
 * expected to have launched it appropriately.
 */

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartAgentInput } from "@/features/agents/components/inputs/smart-input/SmartAgentInput";
import { useSmartCodeEditor } from "../hooks/useSmartCodeEditor";
import { useIdeContextSync } from "../hooks/useIdeContextSync";
import { ProcessingOverlay } from "./parts/ProcessingOverlay";
import { ReviewStage } from "./parts/ReviewStage";
import { ErrorPanel } from "./parts/ErrorPanel";
import { SMART_CODE_EDITOR_SURFACE_KEY } from "../constants";

const CodeBlock = dynamic(
  () => import("@/features/code-editor/components/code-block/CodeBlock"),
  { ssr: false },
);

export interface SmartCodeEditorProps {
  /**
   * The conversationId the parent launched (via `launchAgentExecution`) for
   * this editor session. SmartCodeEditorModal handles this automatically.
   */
  conversationId: string;
  /** Current editor content. */
  currentCode: string;
  /** Language identifier (e.g. "typescript"). */
  language: string;
  /** Writes new code back to the parent when Apply is clicked. */
  onCodeChange: (newCode: string) => void;
  /** Optional vsc_active_file_path context. */
  filePath?: string;
  /** Optional vsc_selected_text context. */
  selection?: string;
  /** Optional vsc_diagnostics context (pre-formatted text). */
  diagnostics?: string;
  /** Optional vsc_workspace_name context. */
  workspaceName?: string;
  /** Optional vsc_workspace_folders context (newline-joined). */
  workspaceFolders?: string;
  /** Optional vsc_git_branch context. */
  gitBranch?: string;
  /** Optional vsc_git_status context (plain text). */
  gitStatus?: string;
  /** Optional agent_skills context (free-form text). */
  agentSkills?: string;
  /** Optional title shown in the header. Header hidden when omitted. */
  title?: string;
  /** Render the right-side conversation pane when messages exist. Default: true. */
  showConversation?: boolean;
  /** Tailwind className passthrough to the root div. */
  className?: string;
}

export function SmartCodeEditor({
  conversationId,
  currentCode,
  language,
  onCodeChange,
  filePath,
  selection,
  diagnostics,
  workspaceName,
  workspaceFolders,
  gitBranch,
  gitStatus,
  agentSkills,
  title,
  showConversation = true,
  className,
}: SmartCodeEditorProps) {
  // Keep the instance's context slice synced with the live editor state.
  // The widget handle registration is owned by the modal (the launch site).
  useIdeContextSync(conversationId, {
    code: currentCode,
    language,
    filePath,
    selection,
    diagnostics,
    workspaceName,
    workspaceFolders,
    gitBranch,
    gitStatus,
    agentSkills,
  });

  const {
    state,
    setState,
    parsedEdits,
    modifiedCode,
    errorMessage,
    rawAIResponse,
    isExecuting,
    isCopied,
    diffStats,
    messages,
    streamingText,
    handleApplyChanges,
    handleCopyResponse,
    handleRejectEdits,
  } = useSmartCodeEditor({
    conversationId,
    currentCode,
    onCodeChange,
  });

  const memoizedCodeDisplay = useMemo(
    () => (
      <div className="flex-1 overflow-auto relative">
        <CodeBlock
          code={currentCode}
          language={language}
          showLineNumbers={true}
        />
      </div>
    ),
    [currentCode, language],
  );

  const hasConversation = showConversation && messages && messages.length > 0;

  return (
    <div className={cn("h-full flex flex-col overflow-hidden", className)}>
      {/* Header (optional) */}
      {title && (
        <div className="px-3 py-2 border-b shrink-0 bg-muted/30">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="truncate">{title}</span>
          </div>
        </div>
      )}

      {/* Main two-column layout */}
      <div className="flex-1 overflow-hidden min-h-0 flex gap-2 p-2">
        {/* Left: main content (switches on state) */}
        <div
          className={cn(
            "flex flex-col min-h-0 gap-2",
            hasConversation ? "flex-[2] min-w-0" : "flex-1",
          )}
        >
          {(state === "input" || state === "processing") && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative">
              {memoizedCodeDisplay}
              {state === "processing" && (
                <ProcessingOverlay streamingText={streamingText} />
              )}
            </div>
          )}

          {state === "review" && parsedEdits && (
            <ReviewStage
              currentCode={currentCode}
              modifiedCode={modifiedCode}
              language={language}
              parsedEdits={parsedEdits}
              rawAIResponse={rawAIResponse}
              diffStats={diffStats}
            />
          )}

          {state === "applying" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-sm font-medium">Applying Changes...</p>
              </div>
            </div>
          )}

          {state === "complete" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-medium">Changes Applied!</p>
              </div>
            </div>
          )}

          {state === "error" && (
            <ErrorPanel
              errorMessage={errorMessage}
              rawAIResponse={rawAIResponse}
              isCopied={isCopied}
              onCopyResponse={handleCopyResponse}
            />
          )}
        </div>

        {/* Right: persistent conversation pane (when messages exist) */}
        {hasConversation && (
          <div className="flex-1 min-w-[280px] max-w-[400px] flex flex-col min-h-0 border rounded overflow-hidden bg-background">
            <div className="px-2 py-1 border-b bg-muted/20 shrink-0">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Conversation
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id ?? idx}
                  className={cn(
                    "p-2 rounded text-xs",
                    msg.role === "user"
                      ? "bg-primary/10 ml-4"
                      : "bg-muted mr-4",
                  )}
                >
                  <div className="font-semibold text-[10px] uppercase tracking-wide mb-1 text-muted-foreground">
                    {msg.role === "user"
                      ? "You"
                      : msg.role === "assistant"
                        ? "Assistant"
                        : msg.role === "system"
                          ? "System"
                          : msg.role === "tool"
                            ? "Tool"
                            : "Unknown"}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {typeof msg.content === "string"
                      ? msg.content
                      : JSON.stringify(msg.content)}
                  </div>
                </div>
              ))}
              {isExecuting && streamingText && (
                <div className="p-2 rounded text-xs bg-muted mr-4 animate-pulse">
                  <div className="font-semibold text-[10px] uppercase tracking-wide mb-1 text-muted-foreground">
                    Assistant
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {streamingText}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer: SmartAgentInput (self-managed) OR review actions */}
      <div className="px-2 py-2 border-t shrink-0 bg-background z-20">
        <div className="w-full">
          {state === "review" ? (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={handleRejectEdits}>
                Retry
              </Button>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handleRejectEdits}>
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyChanges}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Apply
                </Button>
              </div>
            </div>
          ) : state === "error" ? (
            <div className="flex justify-end w-full">
              <Button size="sm" onClick={() => setState("input")}>
                Continue Conversation
              </Button>
            </div>
          ) : (
            <SmartAgentInput
              conversationId={conversationId}
              placeholder="Describe the changes you want to make..."
              sendButtonVariant="default"
              uploadBucket="userContent"
              uploadPath="code-editor-attachments"
              enablePasteImages={true}
              surfaceKey={SMART_CODE_EDITOR_SURFACE_KEY}
            />
          )}
        </div>
      </div>
    </div>
  );
}

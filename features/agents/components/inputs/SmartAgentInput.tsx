"use client";

/**
 * SmartAgentInput
 *
 * The full-featured message input for agent execution instances.
 * Feature parity with SmartPromptInput — but powered entirely by conversationId.
 * No prop drilling. All state lives in Redux, keyed by conversationId.
 *
 * Capabilities:
 *  - Text input with auto-resize and expand mode
 *  - Variable inputs (style from instanceUIState.variableInputStyle)
 *  - Resource chips + picker (SmartAgentResourceChips / SmartAgentResourcePickerButton)
 *  - Voice input with auto-transcription
 *  - Submit on Enter toggle (persisted in instanceUIState)
 *  - autoClearConversation toggle (persisted in instanceUIState)
 *  - Creator/debug controls
 *  - Optimistic input clear on send
 *  - Graceful no-op while conversationId is null/undefined
 *
 * Prop: conversationId — the only required prop.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUp,
  CornerDownLeft,
  Mic,
  ChevronDown,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Braces,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "sonner";

// Instance state selectors
import { selectUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { setUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import {
  selectSubmitOnEnter,
  selectAutoClearConversation,
  selectShowVariablePanel,
  selectIsCreator,
  selectShowCreatorDebug,
  selectVariableInputStyle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import {
  setSubmitOnEnter,
  setAutoClearConversation,
  toggleCreatorDebug,
  toggleVariablePanel,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import {
  selectIsExecuting,
  selectShouldShowVariables,
  selectLatestRequestStatus,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectInstanceResources } from "@/features/agents/redux/execution-system/instance-resources/instance-resources.selectors";

// Execution
import { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
import { executeChatInstance } from "@/features/agents/redux/execution-system/thunks/execute-chat-instance.thunk";
import { startNewConversationAndExecute } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { selectHasConversationHistory } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { selectConversationMode } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import type { VariableInputStyle } from "@/features/agents/types/instance.types";

// Sub-components
import { SmartAgentResourceChips } from "./SmartAgentResourceChips";
import { SmartAgentResourcePickerButton } from "./SmartAgentResourcePickerButton";
import { SmartAgentVariableInputs } from "./SmartAgentVariableInputs";
import { WizardAgentVariableInputs } from "./WizardAgentVariableInputs";
import {
  AgentCompactVariableInputs,
  AgentGuidedVariableInputs,
  AgentVariableCardsInputs,
} from "./variable-input-styles";

// Voice input
import { useRecordAndTranscribe } from "@/features/audio";
import { TranscriptionLoader } from "@/features/audio";

// Clipboard paste → file upload
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import {
  addResource,
  setResourcePreview,
} from "@/features/agents/redux/execution-system/instance-resources/instance-resources.slice";

// Admin debug
import { useDebugContext } from "@/hooks/useDebugContext";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";

// Admin debug modal
import { ChatDebugModal } from "@/features/cx-chat/admin/ChatDebugModal";
import { AgentVariableInputForm } from "../run/AgentVariableInputForm";

// Inline button helper
function InputButton({
  icon: Icon,
  tooltip,
  onClick,
  active = false,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors
        ${active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}
        ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// =============================================================================
// Props
// =============================================================================

interface SmartAgentInputProps {
  conversationId: string | null | undefined;
  placeholder?: string;
  /** Blue = primary accent send button */
  sendButtonVariant?: "default" | "blue";
  showSubmitOnEnterToggle?: boolean;
  showAutoClearToggle?: boolean;
  uploadBucket?: string;
  uploadPath?: string;
  enablePasteImages?: boolean;
  /**
   * Reduces the textarea min-height to ~1.25 lines instead of the default ~2.5.
   * All other behaviour (auto-resize, max-height, expand mode) is unchanged.
   */
  compact?: boolean;
  /** Hide the send button entirely. Toolbar still renders for mic/resources/toggles. */
  showSendButton?: boolean;
  /** Hide the variable panel toggle icon ({|}). */
  showVariableIcon?: boolean;
  /**
   * Focus-registry surface key (e.g. `agent-runner:${agentId}`). Required when
   * autoClearConversation is on and the user submits with existing history
   * (startNewConversationAndExecute + setFocus).
   */
  surfaceKey?: string;
  /**
   * When true, the send button is hidden and Enter does not trigger execution.
   * Used inside AgentPreExecutionInput where the parent manages the submit flow.
   */
  disableSend?: boolean;
  /**
   * Controls which variable input UI is rendered (see VARIABLE_INPUT_STYLE_OPTIONS).
   * When omitted, uses Redux `instanceUIState.variableInputStyle`.
   */
  variableInputStyle?: VariableInputStyle;
  /** Extra controls rendered in the right toolbar, before the send button. */
  extraRightControls?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function SmartAgentInput({
  conversationId,
  placeholder,
  sendButtonVariant = "default",
  showSubmitOnEnterToggle = true,
  showAutoClearToggle = false,
  uploadBucket = "userContent",
  uploadPath = "agent-attachments",
  enablePasteImages = true,
  compact = false,
  showSendButton = true,
  showVariableIcon = true,
  surfaceKey,
  disableSend = false,
  variableInputStyle,
  extraRightControls,
}: SmartAgentInputProps) {
  const dispatch = useAppDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingVoiceSubmitRef = useRef(false);

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Redux state (all guarded against null conversationId) ──────────────────────
  const inputText = useAppSelector((state) =>
    conversationId ? selectUserInputText(conversationId)(state) : "",
  );
  const isExecuting = useAppSelector((state) =>
    conversationId ? selectIsExecuting(conversationId)(state) : false,
  );
  const submitOnEnter = useAppSelector((state) =>
    conversationId ? selectSubmitOnEnter(conversationId)(state) : true,
  );
  const autoClearConversation = useAppSelector((state) =>
    conversationId ? selectAutoClearConversation(conversationId)(state) : false,
  );
  const showVariablePanel = useAppSelector((state) =>
    conversationId ? selectShowVariablePanel(conversationId)(state) : false,
  );
  const isCreator = useAppSelector((state) =>
    conversationId ? selectIsCreator(conversationId)(state) : false,
  );
  const showCreatorDebug = useAppSelector((state) =>
    conversationId ? selectShowCreatorDebug(conversationId)(state) : false,
  );
  const reduxVariableInputStyle = useAppSelector((state) =>
    conversationId ? selectVariableInputStyle(conversationId)(state) : "inline",
  );
  // Prop takes precedence when explicitly provided; otherwise honour Redux state.
  const resolvedVariableInputStyle =
    variableInputStyle ?? reduxVariableInputStyle;
  const hasHistory = useAppSelector((state) =>
    conversationId
      ? selectHasConversationHistory(conversationId)(state)
      : false,
  );
  const conversationMode = useAppSelector((state) =>
    conversationId ? selectConversationMode(conversationId)(state) : "agent",
  );
  const isChatMode = conversationMode === "chat";
  const shouldShowVariables = useAppSelector((state) =>
    conversationId ? selectShouldShowVariables(conversationId)(state) : false,
  );

  // ── Admin / debug ──────────────────────────────────────────────────────────
  const isAdmin = useAppSelector(selectIsAdmin);
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const { publish: publishDebug } = useDebugContext("AgentInput");
  const latestStatus = useAppSelector((state) =>
    conversationId
      ? selectLatestRequestStatus(conversationId)(state)
      : undefined,
  );
  const resourceCount = useAppSelector((state) =>
    conversationId ? selectInstanceResources(conversationId)(state).length : 0,
  );
  useEffect(() => {
    if (!conversationId) return;
    publishDebug({
      "Instance ID": conversationId,
      "Is Executing": isExecuting,
      "Request Status": latestStatus ?? "—",
      "Should Show Variables": shouldShowVariables,
      "Resource Count": resourceCount,
      "Input Length": inputText.length,
      "Has History": hasHistory,
    });
  }, [
    conversationId,
    isExecuting,
    latestStatus,
    shouldShowVariables,
    resourceCount,
    inputText.length,
    hasHistory,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── File upload (for paste-image support) ───────────────────────────────────
  const { uploadMultipleToPrivateUserAssets } = useFileUploadWithStorage(
    uploadBucket,
    uploadPath,
  );

  // ── Voice input ─────────────────────────────────────────────────────────────
  const {
    isRecording,
    isTranscribing,
    duration,
    startRecording,
    stopRecording,
  } = useRecordAndTranscribe({
    onTranscriptionComplete: (result) => {
      if (result.success && result.text && conversationId) {
        const newText = inputText
          ? `${inputText}\n${result.text}`
          : result.text;
        pendingVoiceSubmitRef.current = true;
        dispatch(
          setUserInputText({ conversationId: conversationId, text: newText }),
        );
      }
    },
    onError: (error) => {
      toast.error("Transcription failed", { description: error });
    },
    autoTranscribe: true,
  });

  // Submit after voice transcription settles
  useEffect(() => {
    if (pendingVoiceSubmitRef.current && inputText.trim() && conversationId) {
      pendingVoiceSubmitRef.current = false;
      setTimeout(() => handleSend(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, conversationId]);

  // ── Auto-resize textarea ────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${isExpanded ? Math.max(el.scrollHeight, 300) : Math.min(el.scrollHeight, 200)}px`;
  }, [inputText, isExpanded]);

  // ── Auto-focus when conversationId becomes available ────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [conversationId]);

  // ── Paste image → upload → resource ────────────────────────────────────────
  const handlePasteImage = useCallback(
    async (file: File) => {
      if (!conversationId) return;
      try {
        const results = await uploadMultipleToPrivateUserAssets([file]);
        if (results && results.length > 0) {
          const url = (results[0] as { url?: string })?.url;
          if (!url) return;
          const resourceId = `res_${Date.now()}_paste`;
          dispatch(
            addResource({
              conversationId,
              blockType: "image",
              source: { url },
              resourceId,
            }),
          );
          dispatch(
            setResourcePreview({
              conversationId,
              resourceId,
              preview: file.name,
            }),
          );
        }
      } catch {
        toast.error("Failed to upload pasted image");
      }
    },
    [conversationId, dispatch, uploadMultipleToPrivateUserAssets],
  );

  useClipboardPaste({
    textareaRef,
    onPasteImage: handlePasteImage,
    disabled: !enablePasteImages || !conversationId,
  });

  // ── Send logic ──────────────────────────────────────────────────────────────
  // Only block when not initialized or already executing.
  // hasContent is NOT a gate — agents run on variables/context without user text.
  // disableSend suppresses the entire send flow (used in pre-execution input gate).
  const isSendDisabled = !conversationId || isExecuting || disableSend;

  const handleSend = useCallback(() => {
    if (!conversationId || isSendDisabled) return;

    if (autoClearConversation && hasHistory) {
      if (!surfaceKey) {
        console.error(
          "[SmartAgentInput] surfaceKey is required when auto-clearing an existing conversation",
        );
        return;
      }
      dispatch(
        startNewConversationAndExecute({
          currentConversationId: conversationId,
          surfaceKey,
        }),
      );
    } else if (isChatMode) {
      dispatch(executeChatInstance({ conversationId: conversationId }));
    } else {
      dispatch(executeInstance({ conversationId }));
    }
  }, [
    conversationId,
    isSendDisabled,
    autoClearConversation,
    hasHistory,
    isChatMode,
    surfaceKey,
    dispatch,
  ]);

  const handleTextChange = useCallback(
    (value: string) => {
      if (conversationId)
        dispatch(
          setUserInputText({ conversationId: conversationId, text: value }),
        );
    },
    [conversationId, dispatch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
        e.preventDefault();
        if (!isSendDisabled) handleSend();
      }
    },
    [submitOnEnter, isSendDisabled, handleSend],
  );

  const handleMicClick = useCallback(() => {
    if (isRecording) stopRecording();
    else if (!isTranscribing) startRecording();
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const showExpand = inputText.length > 80;
  const placeholderText =
    placeholder ??
    (showVariablePanel ? "Add a message..." : "Type your message...");

  const sendBtnClass =
    sendButtonVariant === "blue"
      ? "h-7 w-7 p-0 shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-40 text-white"
      : "h-7 w-7 p-0 shrink-0 rounded-full bg-muted hover:bg-muted/80 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-40 text-foreground";

  // ── Uninitialized shell ─────────────────────────────────────────────────────
  if (!conversationId) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-2 pt-1.5">
          <textarea
            disabled
            placeholder="Initializing..."
            className="w-full bg-transparent border-none outline-none text-base md:text-xs text-muted-foreground/50 placeholder:text-muted-foreground/40 resize-none"
            style={{ minHeight: 40, maxHeight: 200 }}
            rows={1}
          />
        </div>
        <div className="flex items-center justify-end px-2 pb-1.5">
          <Button disabled className={sendBtnClass}>
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Active UI ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative bg-card rounded-lg w-full ${compact ? "max-w-[500px]" : "max-w-[800px]"} border border-border overflow-hidden`}
    >
      {resolvedVariableInputStyle === "form" && (
        <AgentVariableInputForm conversationId={conversationId} />
      )}
      {resolvedVariableInputStyle === "inline" && (
        <SmartAgentVariableInputs
          conversationId={conversationId}
          compact={compact}
          onSubmit={handleSend}
          submitOnEnter={submitOnEnter}
        />
      )}
      {resolvedVariableInputStyle === "wizard" && (
        <WizardAgentVariableInputs
          conversationId={conversationId}
          onSubmit={handleSend}
        />
      )}
      {resolvedVariableInputStyle === "compact" && (
        <AgentCompactVariableInputs conversationId={conversationId} />
      )}
      {resolvedVariableInputStyle === "guided" && (
        <AgentGuidedVariableInputs conversationId={conversationId} seamless />
      )}
      {resolvedVariableInputStyle === "cards" && (
        <AgentVariableCardsInputs
          conversationId={conversationId}
          onSubmit={handleSend}
        />
      )}

      {/* Resource chips */}
      <SmartAgentResourceChips conversationId={conversationId} />

      {/* Text area */}
      <div
        className={`px-2 pt-1.5 relative ${
          isExpanded
            ? "fixed inset-x-4 top-16 bottom-24 z-50 bg-card rounded-lg border border-border shadow-2xl px-3 pt-3 flex flex-col"
            : ""
        }`}
      >
        {isExpanded && (
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-border shrink-0">
            <span className="text-xs text-muted-foreground font-medium">
              Expanded input
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={isExecuting}
            className={`w-full bg-transparent border-none outline-none text-base md:text-xs text-foreground placeholder:text-muted-foreground/60 resize-none overflow-y-auto scrollbar-hide disabled:opacity-60 ${
              isExpanded ? "h-full min-h-[200px]" : ""
            }`}
            style={
              isExpanded
                ? { minHeight: 200 }
                : { minHeight: compact ? 20 : 40, maxHeight: 200 }
            }
            rows={1}
          />
          {showExpand && !isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="absolute top-0 right-0 p-1 rounded hover:bg-muted/80 opacity-50 hover:opacity-100 transition-all"
              title="Expand input"
            >
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-2 pb-1.5 mt-1">
        {/* Left: voice, resource picker, extra controls */}
        <div className="flex items-center gap-0.5">
          {isTranscribing && !isRecording ? (
            <div className="px-2">
              <TranscriptionLoader
                message="Transcribing"
                duration={duration}
                size="sm"
              />
            </div>
          ) : isRecording ? (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-md px-2 py-1 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Recording...
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={stopRecording}
                className="h-7 px-2 text-blue-600 hover:text-blue-700"
              >
                <Mic className="h-3.5 w-3.5" />
                <span className="text-xs">
                  Stop ({Math.floor(duration / 60)}:
                  {String(duration % 60).padStart(2, "0")})
                </span>
              </Button>
            </div>
          ) : (
            <>
              {/* Admin debug button */}
              {isAdmin && (
                <InputButton
                  icon={Bug}
                  tooltip="Debug instance state"
                  onClick={() => setIsDebugOpen(true)}
                  className="text-orange-500"
                />
              )}

              {/* Creator debug toggle */}
              {isCreator && (
                <InputButton
                  icon={ChevronDown}
                  tooltip={showCreatorDebug ? "Hide debug" : "Show debug"}
                  onClick={() => dispatch(toggleCreatorDebug(conversationId))}
                  active={showCreatorDebug}
                  className="text-amber-500"
                />
              )}

              {/* Variable panel toggle — only when variables should be shown */}
              {shouldShowVariables && showVariableIcon && (
                <InputButton
                  icon={Braces}
                  tooltip={
                    showVariablePanel ? "Hide variables" : "Show variables"
                  }
                  onClick={() => dispatch(toggleVariablePanel(conversationId))}
                  active={showVariablePanel}
                />
              )}

              {/* Mic */}
              <InputButton
                icon={Mic}
                tooltip="Record voice message"
                onClick={handleMicClick}
              />

              {/* Resource picker */}
              <SmartAgentResourcePickerButton
                conversationId={conversationId}
                uploadBucket={uploadBucket}
                uploadPath={uploadPath}
              />
            </>
          )}
        </div>

        {/* Right: toggles + send */}
        <div className="flex items-center gap-0.5">
          {extraRightControls}
          {/* autoClearConversation toggle */}
          {showAutoClearToggle && (
            <InputButton
              icon={RefreshCcw}
              tooltip={
                autoClearConversation
                  ? "Auto-clear ON — each send starts fresh (click to disable)"
                  : "Auto-clear OFF — conversation continues (click to enable)"
              }
              onClick={() =>
                dispatch(
                  setAutoClearConversation({
                    conversationId,
                    value: !autoClearConversation,
                  }),
                )
              }
              active={autoClearConversation}
            />
          )}

          {/* Submit on Enter toggle */}
          {showSubmitOnEnterToggle && (
            <InputButton
              icon={CornerDownLeft}
              tooltip={
                submitOnEnter
                  ? "Enter submits (click to disable)"
                  : "Enter adds newline (click to enable)"
              }
              onClick={() =>
                dispatch(
                  setSubmitOnEnter({ conversationId, value: !submitOnEnter }),
                )
              }
              active={submitOnEnter}
            />
          )}

          {/* Send button */}
          {showSendButton && (
            <Button
              onClick={handleSend}
              disabled={isSendDisabled}
              className={sendBtnClass}
              tabIndex={-1}
            >
              {isExecuting ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {isAdmin && isDebugOpen && (
        <ChatDebugModal
          sessionId={conversationId}
          isOpen={isDebugOpen}
          onClose={() => setIsDebugOpen(false)}
        />
      )}
    </div>
  );
}

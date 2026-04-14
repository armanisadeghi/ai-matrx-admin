"use client";

/**
 * InputActionButtons
 *
 * Left and right toolbar buttons for the agent input.
 * Only requires conversationId — everything else comes from Redux or config props.
 * Config props are stable values that don't live in Redux (bucket names, feature flags).
 */

import React, { useCallback } from "react";
import {
  ArrowUp,
  CornerDownLeft,
  Mic,
  ChevronDown,
  RefreshCcw,
  Braces,
  Bug,
  CircleStop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { TranscriptionLoader } from "@/features/audio";
import { SmartAgentResourcePickerButton } from "../resources/SmartAgentResourcePickerButton";
import {
  selectSubmitOnEnter,
  selectShowVariablePanel,
  selectIsCreator,
  selectShowCreatorDebug,
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
  selectAutoClearWithConversationHistory,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  smartExecute,
  cancelExecution,
} from "@/features/agents/redux/execution-system/thunks/smart-execute.thunk";

// ── Inline button primitive ──────────────────────────────────────────────────

export function InputButton({
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
        ${active ? "text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-muted"}
        ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface InputActionButtonsProps {
  conversationId: string;
  // Voice state — passed from AgentTextarea which owns the voice hook
  isRecording: boolean;
  isTranscribing: boolean;
  duration: number;
  onMicClick: () => void;
  onStopRecording: () => void;
  // Config — stable, not in Redux
  uploadBucket?: string;
  uploadPath?: string;
  showSendButton?: boolean;
  showSubmitOnEnterToggle?: boolean;
  showVariableIcon?: boolean;
  sendButtonVariant?: "default" | "blue";
  surfaceKey?: string;
  disableSend?: boolean;
  extraRightControls?: React.ReactNode;
  showAutoClearToggle?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function InputActionButtons({
  conversationId,
  isRecording,
  isTranscribing,
  duration,
  onMicClick,
  onStopRecording,
  uploadBucket = "userContent",
  uploadPath = "agent-attachments",
  showSendButton = true,
  showSubmitOnEnterToggle = true,
  showVariableIcon = true,
  sendButtonVariant = "default",
  surfaceKey,
  disableSend = false,
  extraRightControls,
  showAutoClearToggle = false,
}: InputActionButtonsProps) {
  const dispatch = useAppDispatch();

  // Selectors
  const isExecuting = useAppSelector(selectIsExecuting(conversationId));
  const submitOnEnter = useAppSelector(selectSubmitOnEnter(conversationId));
  const showVariablePanel = useAppSelector(
    selectShowVariablePanel(conversationId),
  );
  const isCreator = useAppSelector(selectIsCreator(conversationId));
  const showCreatorDebug = useAppSelector(
    selectShowCreatorDebug(conversationId),
  );
  const shouldShowVariables = useAppSelector(
    selectShouldShowVariables(conversationId),
  );
  const autoClearWithHistory = useAppSelector(
    selectAutoClearWithConversationHistory(conversationId),
  );
  const isAdmin = useAppSelector(selectIsAdmin);
  const isDebugMode = useAppSelector(selectIsDebugMode);

  const isSendDisabled = disableSend;

  const handleSend = useCallback(() => {
    if (isSendDisabled) return;
    if (isExecuting) {
      dispatch(cancelExecution(conversationId));
    } else {
      dispatch(smartExecute({ conversationId, surfaceKey }));
    }
  }, [isSendDisabled, isExecuting, conversationId, surfaceKey, dispatch]);

  const sendBtnClass =
    sendButtonVariant === "blue"
      ? "h-7 w-7 p-0 shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-40 text-white"
      : "h-7 w-7 p-0 shrink-0 rounded-full bg-muted hover:bg-muted/80 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-40 text-foreground";

  return (
    <div className="flex items-center justify-between px-2 pb-1.5 mt-1 shrink-0">
      {/* Left: voice state / resource picker / debug / variable toggle */}
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
              onClick={onStopRecording}
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
            <SmartAgentResourcePickerButton
              conversationId={conversationId}
              uploadBucket={uploadBucket}
              uploadPath={uploadPath}
            />

            {isAdmin && isDebugMode && (
              <InputButton
                icon={Bug}
                tooltip="Debug instance state"
                onClick={() =>
                  dispatch(
                    openOverlay({
                      overlayId: "chatDebugWindow",
                      data: { sessionId: conversationId },
                    }),
                  )
                }
                className="text-orange-500"
              />
            )}

            {isCreator && (
              <InputButton
                icon={ChevronDown}
                tooltip={showCreatorDebug ? "Hide debug" : "Show debug"}
                onClick={() => dispatch(toggleCreatorDebug(conversationId))}
                active={showCreatorDebug}
                className="text-amber-500"
              />
            )}

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
          </>
        )}
      </div>

      {/* Right: toggles + mic + send */}
      <div className="flex items-center gap-0.5">
        {extraRightControls}

        {showAutoClearToggle && autoClearWithHistory && (
          <InputButton
            icon={RefreshCcw}
            tooltip="Auto-clear ON — each send starts fresh (click to disable)"
            onClick={() =>
              dispatch(
                setAutoClearConversation({
                  conversationId,
                  value: !autoClearWithHistory,
                }),
              )
            }
            active={autoClearWithHistory}
          />
        )}

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

        <InputButton
          icon={Mic}
          tooltip="Record voice message"
          onClick={onMicClick}
        />

        {showSendButton && (
          <Button
            onClick={handleSend}
            disabled={isSendDisabled}
            className={sendBtnClass}
            tabIndex={-1}
            title={isExecuting ? "Stop" : "Send"}
          >
            {isExecuting ? (
              <CircleStop className="w-3.5 h-3.5" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

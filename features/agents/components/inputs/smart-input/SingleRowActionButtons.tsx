"use client";

/**
 * SingleRowActionButtons
 *
 * Compact action buttons for the single-row input layout.
 * Renders mic + optional extra controls + send button side-by-side with the textarea.
 * Omits submit-on-enter toggle and auto-clear toggle (not applicable in single-row mode).
 */

import React, { useCallback } from "react";
import {
  ArrowUp,
  Mic,
  Braces,
  ChevronDown,
  Bug,
  CircleStop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { TranscriptionLoader } from "@/features/audio";
import { SmartAgentResourcePickerButton } from "../resources/SmartAgentResourcePickerButton";
import { InputButton } from "./InputActionButtons";
import {
  selectShowVariablePanel,
  selectIsCreator,
  selectShowCreatorDebug,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import {
  toggleCreatorDebug,
  toggleVariablePanel,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import {
  selectIsExecuting,
  selectShouldShowVariables,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  smartExecute,
  cancelExecution,
} from "@/features/agents/redux/execution-system/thunks/smart-execute.thunk";

interface SingleRowActionButtonsProps {
  conversationId: string;
  isRecording: boolean;
  isTranscribing: boolean;
  duration: number;
  onMicClick: () => void;
  onStopRecording: () => void;
  uploadBucket?: string;
  uploadPath?: string;
  showSendButton?: boolean;
  showVariableIcon?: boolean;
  sendButtonVariant?: "default" | "blue";
  surfaceKey?: string;
  disableSend?: boolean;
  extraRightControls?: React.ReactNode;
}

export function SingleRowActionButtons({
  conversationId,
  isRecording,
  isTranscribing,
  duration,
  onMicClick,
  onStopRecording,
  uploadBucket = "userContent",
  uploadPath = "agent-attachments",
  showSendButton = true,
  showVariableIcon = true,
  sendButtonVariant = "default",
  surfaceKey,
  disableSend = false,
  extraRightControls,
}: SingleRowActionButtonsProps) {
  const dispatch = useAppDispatch();

  const isExecuting = useAppSelector(selectIsExecuting(conversationId));
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
  const isAdmin = useAppSelector(selectIsAdmin);
  const isDebugMode = useAppSelector(selectIsDebugMode);

  const handleSend = useCallback(() => {
    if (disableSend) return;
    if (isExecuting) {
      dispatch(cancelExecution(conversationId));
    } else {
      dispatch(smartExecute({ conversationId, surfaceKey }));
    }
  }, [disableSend, isExecuting, conversationId, surfaceKey, dispatch]);

  const sendBtnClass =
    sendButtonVariant === "blue"
      ? "h-6 w-6 p-0 shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-40 text-white"
      : "h-6 w-6 p-0 shrink-0 rounded-full bg-muted hover:bg-muted/80 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-40 text-foreground";

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {/* Transcribing / recording state */}
      {isTranscribing && !isRecording ? (
        <div className="px-1">
          <TranscriptionLoader message="" duration={duration} size="sm" />
        </div>
      ) : isRecording ? (
        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 rounded-full px-2 py-0.5 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onStopRecording}
            className="h-5 px-1 text-blue-600 hover:text-blue-700 text-xs"
          >
            <Mic className="h-3 w-3 mr-0.5" />
            {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
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
              tooltip={showVariablePanel ? "Hide variables" : "Show variables"}
              onClick={() => dispatch(toggleVariablePanel(conversationId))}
              active={showVariablePanel}
            />
          )}
        </>
      )}

      {extraRightControls}

      <InputButton
        icon={Mic}
        tooltip="Record voice message"
        onClick={onMicClick}
      />

      {showSendButton && (
        <Button
          onClick={handleSend}
          disabled={disableSend}
          className={sendBtnClass}
          tabIndex={-1}
          title={isExecuting ? "Stop" : "Send"}
        >
          {isExecuting ? (
            <CircleStop className="w-3 h-3" />
          ) : (
            <ArrowUp className="w-3 h-3" />
          )}
        </Button>
      )}
    </div>
  );
}

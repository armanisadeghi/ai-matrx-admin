"use client";

/**
 * SmartAgentInput
 *
 * Thin wrapper that composes AgentVariableSection + AgentTextarea + InputActionButtons.
 * No logic lives here — each child component is fully self-contained via Redux.
 * The only "prop drilling" is voice state (isRecording etc.) which is ephemeral UI
 * that doesn't belong in Redux — it flows from AgentTextarea → InputActionButtons
 * through this component's local state.
 *
 * Layout modes:
 *   default        — stacked: variables → chips → textarea → toolbar
 *   singleRowTextarea — horizontal row: textarea left, buttons right (compact pill look)
 *
 * Required prop: conversationId.
 */

import React, { useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartAgentResourceChips } from "./SmartAgentResourceChips";
import { AgentVariableSection } from "./AgentVariableSection";
import { AgentTextarea, type VoiceState } from "./AgentTextarea";
import { InputActionButtons } from "./InputActionButtons";
import { SingleRowActionButtons } from "./SingleRowActionButtons";
import { smartExecute } from "@/features/agents/redux/execution-system/thunks/smart-execute.thunk";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { VariableInputStyle } from "@/features/agents/types/instance.types";

// ── Props ────────────────────────────────────────────────────────────────────

interface SmartAgentInputProps {
  conversationId: string | null | undefined;
  placeholder?: string;
  singleRowTextarea?: boolean;
  sendButtonVariant?: "default" | "blue";
  showSubmitOnEnterToggle?: boolean;
  uploadBucket?: string;
  uploadPath?: string;
  enablePasteImages?: boolean;
  compact?: boolean;
  showSendButton?: boolean;
  showVariableIcon?: boolean;
  surfaceKey?: string;
  disableSend?: boolean;
  variableInputStyle?: VariableInputStyle;
  extraRightControls?: React.ReactNode;
  showAutoClearToggle?: boolean;
}

// ── Default voice state (before AgentTextarea mounts) ────────────────────────

const DEFAULT_VOICE_STATE: VoiceState = {
  isRecording: false,
  isTranscribing: false,
  duration: 0,
  onMicClick: () => {},
  onStopRecording: () => {},
};

// ── Uninitialized shell ──────────────────────────────────────────────────────

function UninitializedShell({
  sendBtnClass,
  singleRow,
}: {
  sendBtnClass: string;
  singleRow: boolean;
}) {
  if (singleRow) {
    return (
      <div className="flex items-center gap-1 bg-card rounded-full border border-border px-2 py-1 w-full">
        <textarea
          disabled
          placeholder="Initializing..."
          className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground/50 placeholder:text-muted-foreground/40 resize-none leading-5"
          style={{ minHeight: 20, maxHeight: 20 }}
          rows={1}
        />
        <Button disabled className={sendBtnClass}>
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

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

// ── Component ────────────────────────────────────────────────────────────────

export function SmartAgentInput({
  conversationId,
  placeholder,
  singleRowTextarea = false,
  sendButtonVariant = "default",
  showSubmitOnEnterToggle = true,
  uploadBucket = "userContent",
  uploadPath = "agent-attachments",
  enablePasteImages = true,
  compact = false,
  showSendButton = true,
  showVariableIcon = true,
  showAutoClearToggle = false,
  surfaceKey,
  disableSend = false,
  variableInputStyle,
  extraRightControls,
}: SmartAgentInputProps) {
  const dispatch = useAppDispatch();

  // Voice state flows up from AgentTextarea, down into InputActionButtons
  const [voiceState, setVoiceState] = useState<VoiceState>(DEFAULT_VOICE_STATE);
  const handleVoiceStateChange = useCallback((state: VoiceState) => {
    setVoiceState(state);
  }, []);

  const sendBtnClass =
    sendButtonVariant === "blue"
      ? "h-7 w-7 p-0 shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-40 text-white"
      : "h-7 w-7 p-0 shrink-0 rounded-full bg-muted hover:bg-muted/80 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-40 text-foreground";

  if (!conversationId) {
    return (
      <UninitializedShell
        sendBtnClass={sendBtnClass}
        singleRow={singleRowTextarea}
      />
    );
  }

  const handleSubmit = () => {
    if (!disableSend) dispatch(smartExecute({ conversationId, surfaceKey }));
  };

  // ── Single-row layout ──────────────────────────────────────────────────────
  if (singleRowTextarea) {
    return (
      <div className="flex flex-col gap-1 w-full">
        {/* Variable inputs (stacked above the row when present) */}
        <AgentVariableSection
          conversationId={conversationId}
          compact
          onSubmit={handleSubmit}
          styleOverride={variableInputStyle}
        />

        {/* Resource chips (stacked above the row when present) */}
        <SmartAgentResourceChips conversationId={conversationId} />

        {/* Single horizontal row */}
        <div className="flex items-center gap-1 bg-card rounded-none border border-border px-2 py-1 w-full min-w-0">
          {/* Textarea — flex-1 so it fills available width */}
          <div className="flex-1 min-w-0">
            <AgentTextarea
              conversationId={conversationId}
              placeholder={placeholder ?? "Type a message..."}
              compact
              uploadBucket={uploadBucket}
              uploadPath={uploadPath}
              enablePasteImages={enablePasteImages}
              surfaceKey={surfaceKey}
              disableSend={disableSend}
              onVoiceStateChange={handleVoiceStateChange}
              singleRow
            />
          </div>

          {/* Action buttons pinned to the right */}
          <SingleRowActionButtons
            conversationId={conversationId}
            isRecording={voiceState.isRecording}
            isTranscribing={voiceState.isTranscribing}
            duration={voiceState.duration}
            onMicClick={voiceState.onMicClick}
            onStopRecording={voiceState.onStopRecording}
            uploadBucket={uploadBucket}
            uploadPath={uploadPath}
            showSendButton={showSendButton}
            showVariableIcon={showVariableIcon}
            sendButtonVariant={sendButtonVariant}
            surfaceKey={surfaceKey}
            disableSend={disableSend}
            extraRightControls={extraRightControls}
          />
        </div>
      </div>
    );
  }

  // ── Default stacked layout ─────────────────────────────────────────────────
  return (
    <div
      className={`relative bg-card rounded-lg w-full ${compact ? "max-w-[500px]" : "max-w-[800px]"} border border-border overflow-hidden`}
    >
      {/* Variable inputs */}
      <AgentVariableSection
        conversationId={conversationId}
        compact={compact}
        onSubmit={handleSubmit}
        styleOverride={variableInputStyle}
      />

      {/* Resource chips */}
      <SmartAgentResourceChips conversationId={conversationId} />

      {/* Textarea */}
      <AgentTextarea
        conversationId={conversationId}
        placeholder={placeholder}
        compact={compact}
        uploadBucket={uploadBucket}
        uploadPath={uploadPath}
        enablePasteImages={enablePasteImages}
        surfaceKey={surfaceKey}
        disableSend={disableSend}
        onVoiceStateChange={handleVoiceStateChange}
      />

      {/* Toolbar */}
      <InputActionButtons
        conversationId={conversationId}
        isRecording={voiceState.isRecording}
        isTranscribing={voiceState.isTranscribing}
        duration={voiceState.duration}
        onMicClick={voiceState.onMicClick}
        onStopRecording={voiceState.onStopRecording}
        uploadBucket={uploadBucket}
        uploadPath={uploadPath}
        showSendButton={showSendButton}
        showSubmitOnEnterToggle={showSubmitOnEnterToggle}
        showVariableIcon={showVariableIcon}
        showAutoClearToggle={showAutoClearToggle}
        sendButtonVariant={sendButtonVariant}
        surfaceKey={surfaceKey}
        disableSend={disableSend}
        extraRightControls={extraRightControls}
      />
    </div>
  );
}

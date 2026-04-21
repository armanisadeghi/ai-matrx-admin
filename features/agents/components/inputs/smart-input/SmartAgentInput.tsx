"use client";

/**
 * SmartAgentInput
 *
 * Thin wrapper that composes AgentVariableSection + AgentTextarea +
 * InputActionButtons. No logic lives here — each child component is fully
 * self-contained via Redux. Voice input lives inside the action bar's
 * <AgentMicrophoneButton>, which writes transcripts into the same Redux
 * input text this component's textarea reads from, so no voice state flows
 * through this component.
 *
 * Layout modes:
 *   default           — stacked: variables → chips → textarea → toolbar
 *   singleRowTextarea — horizontal row: textarea left, buttons right
 *                       (compact pill look)
 *
 * Required prop: conversationId.
 */

import React from "react";
import { SmartAgentResourceChips } from "../resources/SmartAgentResourceChips";
import { SmartAgentVariables } from "../variable-input-variations/SmartAgentVariables";
import { AgentTextarea } from "./AgentTextarea";
import { InputActionButtons } from "./InputActionButtons";
import { SingleRowActionButtons } from "./SingleRowActionButtons";
import { smartExecute } from "@/features/agents/redux/execution-system/thunks/smart-execute.thunk";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { VariablesPanelStyle } from "@/features/agents/types/instance.types";
import { UninitializedShell } from "./UninitializedShell";
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
  variablesPanelStyle?: VariablesPanelStyle;
  extraRightControls?: React.ReactNode;
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
  surfaceKey,
  disableSend = false,
  variablesPanelStyle,
  extraRightControls,
}: SmartAgentInputProps) {
  const dispatch = useAppDispatch();

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
        <SmartAgentVariables
          conversationId={conversationId}
          compact
          onSubmit={handleSubmit}
          styleOverride={variablesPanelStyle}
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
              singleRow
            />
          </div>

          {/* Action buttons pinned to the right */}
          <SingleRowActionButtons
            conversationId={conversationId}
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
      className={`flex flex-col min-h-0 bg-card rounded-lg w-full ${compact ? "max-w-[500px]" : "max-w-[800px]"} border border-border overflow-hidden`}
    >
      {/* Variable inputs — scrolls internally, never pushes textarea/toolbar off screen */}
      <SmartAgentVariables
        conversationId={conversationId}
        compact={compact}
        onSubmit={handleSubmit}
        styleOverride={variablesPanelStyle}
      />

      {/* Resource chips — pinned, never scrolls away */}
      <SmartAgentResourceChips conversationId={conversationId} />

      {/* Textarea — shrinks slightly under pressure but stays visible */}
      <AgentTextarea
        conversationId={conversationId}
        placeholder={placeholder}
        compact={compact}
        uploadBucket={uploadBucket}
        uploadPath={uploadPath}
        enablePasteImages={enablePasteImages}
        surfaceKey={surfaceKey}
        disableSend={disableSend}
      />

      {/* Toolbar — always pinned at the bottom */}
      <InputActionButtons
        conversationId={conversationId}
        uploadBucket={uploadBucket}
        uploadPath={uploadPath}
        showSendButton={showSendButton}
        showSubmitOnEnterToggle={showSubmitOnEnterToggle}
        showVariableIcon={showVariableIcon}
        sendButtonVariant={sendButtonVariant}
        surfaceKey={surfaceKey}
        disableSend={disableSend}
        extraRightControls={extraRightControls}
      />
    </div>
  );
}

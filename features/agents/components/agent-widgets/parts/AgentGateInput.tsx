"use client";

import { ArrowRight, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectPreExecutionMessage,
  selectInstanceAgentName,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { setPreExecutionSatisfied } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { closeOverlay } from "@/lib/redux/slices/overlaySlice";
import { SmartAgentInput } from "../../inputs/SmartAgentInput";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";

// ─── WindowPanel body — used by AgentGateWindow ───────────────────────────────

export function AgentGateBody({
  instanceId,
  windowInstanceId,
  onClose,
}: {
  instanceId: string;
  windowInstanceId: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const agentName = useAppSelector(selectInstanceAgentName(instanceId));
  const preExecutionMessage = useAppSelector(
    selectPreExecutionMessage(instanceId),
  );

  const handleContinue = () => {
    dispatch(setPreExecutionSatisfied({ instanceId, value: true }));
    dispatch(
      closeOverlay({
        overlayId: "agentGateWindow",
        instanceId: windowInstanceId,
      }),
    );
  };

  const handleCancel = () => {
    dispatch(destroyInstance(instanceId));
    dispatch(
      closeOverlay({
        overlayId: "agentGateWindow",
        instanceId: windowInstanceId,
      }),
    );
    onClose();
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={handleCancel}
        className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="w-3 h-3" />
        Cancel
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={handleContinue}
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Continue
        <ArrowRight className="w-3 h-3" />
      </button>
    </>
  );

  return (
    <WindowPanel
      id={`agent-gate-${windowInstanceId}`}
      title={agentName ?? "Provide Details"}
      onClose={handleCancel}
      width={600}
      height={600}
      minWidth={360}
      minHeight={320}
      position="center"
      bodyClassName="p-0"
      footer={footer}
    >
      <AgentGateContent
        instanceId={instanceId}
        preExecutionMessage={preExecutionMessage}
      />
    </WindowPanel>
  );
}

// ─── Inner content — scrollable variables area + input pinned at bottom ───────

function AgentGateContent({
  instanceId,
  preExecutionMessage,
}: {
  instanceId: string;
  preExecutionMessage: string | null | undefined;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable top area — description + variables from SmartAgentInput */}
      <div className="flex-1 overflow-auto min-h-0 px-4 py-3">
        {preExecutionMessage && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/40">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {preExecutionMessage}
            </p>
          </div>
        )}

        {/* Spacer so the input area feels anchored */}
        <div className="flex-1" />
      </div>

      {/* Input pinned to bottom */}
      <div className="shrink-0 px-3 pb-3 border-t border-border/30 pt-3">
        <SmartAgentInput
          instanceId={instanceId}
          placeholder="Additional instructions (optional)..."
          compact
          showSendButton={false}
          showVariableIcon={false}
          showSubmitOnEnterToggle={false}
          showAutoClearToggle={false}
          disableSend
        />
      </div>
    </div>
  );
}

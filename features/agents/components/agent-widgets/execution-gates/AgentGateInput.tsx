"use client";

import { ArrowRight, ArrowUp, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectPreExecutionMessage,
  selectInstanceAgentName,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { setPreExecutionSatisfied } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { closeOverlay, openOverlay } from "@/lib/redux/slices/overlaySlice";
import { SmartAgentInput } from "../../inputs/SmartAgentInput";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { PaperPlaneIcon } from "@radix-ui/react-icons";

// ─── WindowPanel body — used by AgentGateWindow ───────────────────────────────

export function AgentGateBody({
  conversationId,
  windowInstanceId,
  downstreamOverlayId,
  onClose,
}: {
  conversationId: string;
  windowInstanceId: string;
  downstreamOverlayId?: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const agentName = useAppSelector(selectInstanceAgentName(conversationId));
  const preExecutionMessage = useAppSelector(
    selectPreExecutionMessage(conversationId),
  );

  const closeGate = () => {
    dispatch(
      closeOverlay({
        overlayId: "agentGateWindow",
        instanceId: windowInstanceId,
      }),
    );
  };

  const handleContinue = () => {
    // 1. Mark gate satisfied so execute thunks will proceed
    dispatch(setPreExecutionSatisfied({ conversationId, value: true }));
    // 2. Close the gate window
    closeGate();
    // 3. Open the real downstream overlay now that the gate is cleared
    if (downstreamOverlayId) {
      dispatch(
        openOverlay({
          overlayId: downstreamOverlayId,
          instanceId: conversationId,
          data: { conversationId },
        }),
      );
    }
    onClose();
  };

  const handleCancel = () => {
    // Destroy the instance — nothing downstream was ever opened, so we just clean up
    dispatch(destroyInstance(conversationId));
    closeGate();
    onClose();
  };

  const footer = (
    <>
      <div className="flex-1" />
      <button
        type="button"
        onClick={handleContinue}
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <PaperPlaneIcon className="w-3 h-3" />
      </button>
    </>
  );

  return (
    <WindowPanel
      id={`agent-gate-${windowInstanceId}`}
      title={agentName ?? "Provide Details"}
      onClose={handleCancel}
      width={500}
      height={380}
      minWidth={360}
      minHeight={320}
      position="center"
      bodyClassName="p-0"
      footer={footer}
      overlayId="agentGateWindow"
      onCollectData={() => ({ conversationId })}
    >
      <AgentGateContent
        conversationId={conversationId}
        preExecutionMessage={preExecutionMessage}
      />
    </WindowPanel>
  );
}

// ─── Inner content — scrollable variables area + input pinned at bottom ───────

function AgentGateContent({
  conversationId,
  preExecutionMessage,
}: {
  conversationId: string;
  preExecutionMessage: string | null | undefined;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable top area — description + variables */}
      {/* <div className="flex-1 overflow-auto min-h-0 px-4 py-3 border border-green-500">
        {preExecutionMessage && (
          <div className="px-0 py-0 rounded-lg bg-muted/40 border border-border/40">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {preExecutionMessage}
            </p>
          </div>
        )}
        <div className="flex-1" />
      </div> */}

      {/* Input pinned to bottom */}
      <div className="h-full flex justify-center">
        <SmartAgentInput
          conversationId={conversationId}
          placeholder="Additional instructions (optional)..."
          singleRowTextarea={true}
          showSendButton={false}
          showVariableIcon={false}
          showSubmitOnEnterToggle={false}
          disableSend
        />
      </div>
    </div>
  );
}

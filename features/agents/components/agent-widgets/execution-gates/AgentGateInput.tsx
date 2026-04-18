"use client";

import { ArrowLeftFromLine, ArrowRight, ArrowUp, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectPreExecutionMessage,
  selectInstanceAgentName,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { setPreExecutionSatisfied } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { destroyInstanceIfAllowed } from "@/features/agents/redux/execution-system/conversations";
import { closeOverlay, openOverlay } from "@/lib/redux/slices/overlaySlice";
import { SmartAgentInput } from "../../inputs/smart-input/SmartAgentInput";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/ButtonMine";

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
    dispatch(destroyInstanceIfAllowed(conversationId));
    closeGate();
    onClose();
  };

  const footerRight = (
    <Button onClick={handleContinue} size="icon" variant="primary">
      <PaperPlaneIcon />
    </Button>
  );
  const footerLeft = (
    <Button onClick={handleCancel} size="icon" variant="secondary">
      <ArrowLeftFromLine />
    </Button>
  );

  const title = preExecutionMessage || agentName || "Provide Details";

  return (
    <WindowPanel
      id={`agent-gate-${windowInstanceId}`}
      title={title}
      onClose={handleCancel}
      width={500}
      height={420}
      minWidth={360}
      minHeight={200}
      position="center"
      bodyClassName="p-0 flex flex-col"
      footerRight={footerRight}
      footerLeft={footerLeft}
      overlayId="agentGateWindow"
      onCollectData={() => ({ conversationId })}
    >
      <div className="flex flex-col flex-1 min-h-0 justify-end">
        <SmartAgentInput
          conversationId={conversationId}
          placeholder="Additional instructions (optional)..."
          singleRowTextarea={false}
          compact={true}
          showSendButton={false}
          showVariableIcon={false}
          showSubmitOnEnterToggle={false}
          disableSend
        />
      </div>
    </WindowPanel>
  );
}

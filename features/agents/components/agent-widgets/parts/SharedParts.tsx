import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectPreExecutionMessage } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectInstanceAgentName } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectHasUserInput } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { setPreExecutionSatisfied } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { SmartAgentInput } from "../../inputs/SmartAgentInput";
import { cn } from "@/lib/utils";

// ─── Pre-execution compact card (portalled, no WindowPanel) ──────────────────

export function PreExecutionCard({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const agentName = useAppSelector(selectInstanceAgentName(instanceId));
  const hasInput = useAppSelector(selectHasUserInput(instanceId));
  const preExecutionMessage = useAppSelector(
    selectPreExecutionMessage(instanceId),
  );

  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const handleContinue = () => {
    dispatch(setPreExecutionSatisfied({ instanceId, value: true }));
  };

  const handleCancel = () => {
    dispatch(destroyInstance(instanceId));
    onClose();
  };

  const card = (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={handleCancel}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-sm mx-4",
          "rounded-xl bg-card/98 backdrop-blur-md border border-border shadow-2xl",
          "overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <p className="text-sm font-medium text-foreground truncate flex-1">
            {agentName ?? "Please enter details..."}
          </p>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={handleCancel}
              className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="h-6 w-6 flex items-center justify-center rounded-md text-primary hover:text-primary hover:bg-primary/10 transition-colors"
              title={hasInput ? "Continue" : "Skip"}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {preExecutionMessage && (
          <div className="px-4 pb-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {preExecutionMessage}
            </p>
          </div>
        )}

        <div className="px-3 pt-0.5 pb-3">
          <SmartAgentInput
            instanceId={instanceId}
            compact
            placeholder="Additional instructions (optional)..."
            showSubmitOnEnterToggle={false}
            showAutoClearToggle={false}
            disableSend
          />
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(card, portalTarget) : null;
}

// ─── Chat history sidebar placeholder ─────────────────────────────────────────

export function AgentChatHistorySidebar({
  instanceId,
}: {
  instanceId: string;
}) {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/30 shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
          Prior Chats
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-[10px] text-muted-foreground/50 text-center py-6">
          Chat history will appear here
        </p>
      </div>
    </div>
  );
}

// ─── Footer placeholder ──────────────────────────────────────────────────────

export function AgentChatFooter({ instanceId }: { instanceId: string }) {
  return (
    <>
      <span className="text-muted-foreground/50">
        {/* Status indicator placeholder */}
      </span>
      <div className="flex-1" />
    </>
  );
}

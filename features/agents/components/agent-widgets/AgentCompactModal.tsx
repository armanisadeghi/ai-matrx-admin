"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectInstanceDisplayTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AgentRunner } from "../smart/AgentRunner";
import { ExecutionManager } from "./execution-gates/ExecutionManager";

interface AgentCompactModalProps {
  conversationId: string;
  onClose: () => void;
}

export function AgentCompactModal({
  conversationId,
  onClose,
}: AgentCompactModalProps) {
  const title = useAppSelector(selectInstanceDisplayTitle(conversationId));
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(conversationId),
  );

  if (needsPreExecution)
    return <ExecutionManager conversationId={conversationId} />;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl h-[60vh] max-h-[70vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <span className="text-sm font-medium text-foreground truncate">
            {title ?? "Agent"}
          </span>
        </div>
        <AgentRunner
          conversationId={conversationId}
          compact
          className="flex-1 min-h-0 bg-background"
        />
      </DialogContent>
    </Dialog>
  );
}

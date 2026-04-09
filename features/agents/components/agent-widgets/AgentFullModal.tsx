"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectInstanceDisplayTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AgentRunner } from "../smart/AgentRunner";
import { ExecutionManager } from "./execution-gates/ExecutionManager";

interface AgentFullModalProps {
  conversationId: string;
  onClose: () => void;
}

export function AgentFullModal({ conversationId, onClose }: AgentFullModalProps) {
  const title = useAppSelector(selectInstanceDisplayTitle(conversationId));
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(conversationId),
  );

  if (needsPreExecution) return <ExecutionManager conversationId={conversationId} />;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <span className="text-sm font-medium text-foreground truncate">
            {title ?? "Agent Execution"}
          </span>
        </div>
        <AgentRunner
          conversationId={conversationId}
          className="flex-1 min-h-0 bg-background"
        />
      </DialogContent>
    </Dialog>
  );
}

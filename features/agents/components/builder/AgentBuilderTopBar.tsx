"use client";

import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { ChevronLeftTapButton } from "@/components/icons/tap-buttons";
import { SaveOrLoadingTapButton } from "@/components/icons/composite-tap-buttons";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentName,
  selectAgentIsDirty,
  selectAgentIsLoading,
} from "@/features/agents/redux/agent-definition/selectors";
import { saveAgent } from "@/features/agents/redux/agent-definition/thunks";
import { toast } from "@/lib/toast-service";

interface AgentBuilderTopBarProps {
  agentId: string;
}

export function AgentBuilderTopBar({ agentId }: AgentBuilderTopBarProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const agentName = useAppSelector((state) => selectAgentName(state, agentId));
  const isDirty = useAppSelector((state) => selectAgentIsDirty(state, agentId));
  const isLoading = useAppSelector((state) =>
    selectAgentIsLoading(state, agentId),
  );

  const handleSave = async () => {
    if (isLoading) return;
    try {
      await dispatch(saveAgent(agentId)).unwrap();
      toast.success("Agent saved!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save agent.");
    }
  };

  return (
    <div className="flex items-center justify-between shrink-0 pl-0 pr-4">
      <div className="flex items-center">
        <ChevronLeftTapButton
          onClick={() => router.push("/ai/agents")}
          ariaLabel="Back to agents"
        />

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          {agentName ? (
            <span className="text-xs font-medium truncate max-w-[200px]">
              {agentName}
            </span>
          ) : (
            <Skeleton className="h-4 w-32" />
          )}
          {isDirty && (
            <span className="text-[10px] text-amber-500 font-medium px-1.5 py-0.5 rounded bg-amber-500/10">
              Unsaved
            </span>
          )}
        </div>
        <SaveOrLoadingTapButton
          isLoading={isLoading}
          onClick={handleSave}
          disabled={isLoading || !isDirty}
        />
      </div>
    </div>
  );
}

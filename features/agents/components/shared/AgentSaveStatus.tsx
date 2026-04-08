"use client";

import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentIsDirty,
  selectAgentIsLoading,
  selectAgentVersionNumber,
} from "@/features/agents/redux/agent-definition/selectors";
import { saveAgent } from "@/features/agents/redux/agent-definition/thunks";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-service";

export function AgentSaveStatus({ agentId }: { agentId: string }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const isDirty = useAppSelector((state) => selectAgentIsDirty(state, agentId));
  const isLoading = useAppSelector((state) =>
    selectAgentIsLoading(state, agentId),
  );
  const versionNumber = useAppSelector((state) =>
    selectAgentVersionNumber(state, agentId),
  );

  const handleSave = async () => {
    if (isLoading || !isDirty) return;
    try {
      await dispatch(saveAgent(agentId)).unwrap();
      toast.success("Agent saved!");
    } catch {
      toast.error("Failed to save agent.");
    }
  };

  const isEditMode = pathname?.includes(`/agents/${agentId}/build`);

  return (
    <div className="flex items-center gap-1.5">
      {versionNumber != null && (
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums px-1.5 py-0.5 rounded bg-muted/60">
          v{versionNumber}
        </span>
      )}

      {isEditMode && isDirty && (
        <span className="text-[10px] font-medium text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/10">
          Unsaved
        </span>
      )}

      {isEditMode && (
        <button
          onClick={handleSave}
          disabled={isLoading || !isDirty}
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
            isDirty && !isLoading
              ? "text-primary hover:bg-primary/10 active:bg-primary/20"
              : "text-muted-foreground/40 cursor-not-allowed",
          )}
          title={isDirty ? "Save changes" : "No unsaved changes"}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

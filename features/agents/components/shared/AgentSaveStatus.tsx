"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentIsDirty,
  selectAgentIsLoading,
  selectAgentVersionNumber,
  selectAgentModelMissing,
} from "@/features/agents/redux/agent-definition/selectors";
import { saveAgent } from "@/features/agents/redux/agent-definition/thunks";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AgentSettingsModal } from "@/features/agents/components/settings-management/AgentSettingsModal";

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
  const modelMissing = useAppSelector((state) =>
    selectAgentModelMissing(state, agentId),
  );

  const [showModelWarning, setShowModelWarning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSave = async () => {
    if (isLoading || !isDirty) return;
    try {
      await dispatch(saveAgent(agentId)).unwrap();
      toast.success("Agent saved!");
      if (modelMissing) {
        setShowModelWarning(true);
      }
    } catch {
      toast.error("Failed to save agent.");
    }
  };

  const handleSelectModel = () => {
    setShowModelWarning(false);
    setSettingsOpen(true);
  };

  const isEditMode = pathname?.includes(`/agents/${agentId}/build`);

  return (
    <>
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

      <AlertDialog open={showModelWarning} onOpenChange={setShowModelWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              No Model Selected
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your agent was saved, but{" "}
              <strong>no model has been selected</strong>. A model is required
              for the agent to run. Would you like to select one now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ignore for Now</AlertDialogCancel>
            <AlertDialogAction onClick={handleSelectModel}>
              Select a Model
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AgentSettingsModal
        agentId={agentId}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentIsDirty,
  selectAgentIsLoading,
  selectAgentVersion,
  selectAgentModelMissing,
  selectAgentById,
} from "@/features/agents/redux/agent-definition/selectors";
import {
  saveAgent,
  createAgent,
} from "@/features/agents/redux/agent-definition/thunks";
import { Save, Loader2, AlertTriangle, Eye } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UnsavedChangesDiff } from "@/features/agents/components/diff/UnsavedChangesDiff";
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
  const router = useRouter();

  const isDirty = useAppSelector((state) => selectAgentIsDirty(state, agentId));
  const isLoading = useAppSelector((state) =>
    selectAgentIsLoading(state, agentId),
  );
  const version = useAppSelector((state) =>
    selectAgentVersion(state, agentId),
  );
  const modelMissing = useAppSelector((state) =>
    selectAgentModelMissing(state, agentId),
  );
  const agentRecord = useAppSelector((state) =>
    selectAgentById(state, agentId),
  );

  const [showModelWarning, setShowModelWarning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const isNewRoute = pathname === "/agents/new";
  const isEditMode =
    isNewRoute || pathname?.includes(`/agents/${agentId}/build`);

  const handleSave = async () => {
    if (isLoading) return;

    try {
      if (isNewRoute) {
        // First-time save: INSERT into the DB using the in-state data, then
        // redirect to the real agent route so the URL reflects the persisted id.
        if (!agentRecord) return;
        const newId = await dispatch(
          createAgent({
            name: agentRecord.name,
            description: agentRecord.description,
            agentType: agentRecord.agentType,
            messages: agentRecord.messages,
            variableDefinitions: agentRecord.variableDefinitions,
            modelId: agentRecord.modelId,
            settings: agentRecord.settings,
            tools: agentRecord.tools,
            customTools: agentRecord.customTools,
            contextSlots: agentRecord.contextSlots,
            category: agentRecord.category,
            tags: agentRecord.tags,
            isActive: agentRecord.isActive,
            isPublic: agentRecord.isPublic,
            isArchived: agentRecord.isArchived,
            isFavorite: agentRecord.isFavorite,
            mcpServers: agentRecord.mcpServers,
          }),
        ).unwrap();
        toast.success("Agent created!");
        router.replace(`/agents/${newId}/build`);
        return;
      }

      await dispatch(saveAgent(agentId)).unwrap();
      toast.success("Agent saved!");
      if (modelMissing) {
        setShowModelWarning(true);
      }
    } catch {
      toast.error(
        isNewRoute ? "Failed to create agent." : "Failed to save agent.",
      );
    }
  };

  const handleSelectModel = () => {
    setShowModelWarning(false);
    setSettingsOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {version != null && (
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums px-1.5 py-0.5 rounded bg-muted/60">
            v{version}
          </span>
        )}

        {isEditMode && isDirty && (
          <>
            <span className="text-[10px] font-medium text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/10">
              {isNewRoute ? "Not saved" : "Unsaved"}
            </span>
            {!isNewRoute && (
              <button
                onClick={() => setShowDiff(true)}
                className="flex items-center justify-center w-6 h-6 rounded-md transition-colors text-amber-500 hover:bg-amber-500/10 active:bg-amber-500/20"
                title="View unsaved changes"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

        {isEditMode && (
          <button
            onClick={handleSave}
            disabled={isLoading || (!isDirty && !isNewRoute)}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
              (isDirty || isNewRoute) && !isLoading
                ? "text-primary hover:bg-primary/10 active:bg-primary/20"
                : "text-muted-foreground/40 cursor-not-allowed",
            )}
            title={
              isNewRoute
                ? "Save new agent"
                : isDirty
                  ? "Save changes"
                  : "No unsaved changes"
            }
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

      <Sheet open={showDiff} onOpenChange={setShowDiff}>
        <SheetContent side="right" className="w-[700px] sm:max-w-[700px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
            <SheetTitle className="text-sm">Unsaved Changes</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {showDiff && <UnsavedChangesDiff agentId={agentId} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

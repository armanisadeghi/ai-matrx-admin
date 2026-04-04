"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentIsDirty } from "@/features/agents/redux/agent-definition/selectors";
import { AgentListDropdown } from "@/features/agents/components/agent-listings/AgentListDropdown";
import { AgentSaveStatus } from "./AgentSaveStatus";
import { AgentOptionsMenu } from "./AgentOptionsMenu";
import { useAgentPageContext } from "./AgentPageContext";
import type { AgentPageMode } from "./AgentPageContext";
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

type ModeOption = AgentPageMode | "new";

const MODE_LABELS: Record<ModeOption, string> = {
  edit: "Build",
  run: "Run",
  new: "New",
};

export function AgentSharedHeader() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { agentId, agentName, basePath, mode } = useAgentPageContext();
  const isDirty = useAppSelector((state) => selectAgentIsDirty(state, agentId));
  const [showDirtyDialog, setShowDirtyDialog] = useState(false);

  const handleModeChange = (next: ModeOption) => {
    if (next === mode) return;

    if (next === "new") {
      if (isDirty) {
        setShowDirtyDialog(true);
      } else {
        navigateToNew();
      }
      return;
    }

    const path =
      next === "edit"
        ? `${basePath}/${agentId}/edit`
        : `${basePath}/${agentId}/run`;
    startTransition(() => router.push(path));
  };

  const navigateToNew = () => {
    startTransition(() => router.push(basePath));
  };

  const handleAgentSelect = (selectedId: string) => {
    const path = `${basePath}/${selectedId}/${mode}`;
    startTransition(() => router.push(path));
  };

  return (
    <>
      <div className="flex items-center justify-between w-full gap-2 px-1">
        {/* Left cluster: dropdown + name */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <AgentListDropdown
            onSelect={handleAgentSelect}
            label={agentName}
            className="max-w-[180px]"
          />
        </div>

        {/* Center: mode toggle */}
        <ModeToggle currentMode={mode} onModeChange={handleModeChange} />

        {/* Right cluster: save status + options */}
        <div className="flex items-center gap-1.5 shrink-0">
          <AgentSaveStatus />
          <div className="w-px h-4 bg-border/50" />
          <AgentOptionsMenu />
        </div>
      </div>

      <AlertDialog open={showDirtyDialog} onOpenChange={setShowDirtyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this agent. If you leave now, your
              changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={navigateToNew}>
              Discard & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ModeToggle({
  currentMode,
  onModeChange,
}: {
  currentMode: AgentPageMode;
  onModeChange: (mode: ModeOption) => void;
}) {
  const modes: ModeOption[] = ["edit", "run", "new"];

  return (
    <div className="flex items-center h-7 rounded-md bg-muted/50 border border-border/50 p-0.5 gap-0.5">
      {modes.map((m) => {
        const isActive = m === currentMode;
        const isNew = m === "new";

        return (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={cn(
              "flex items-center gap-1 h-6 px-2.5 rounded text-xs font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              isNew && !isActive && "text-primary/70 hover:text-primary",
            )}
          >
            {isNew && <Plus className="w-3 h-3" />}
            {MODE_LABELS[m]}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Eye, Pencil, Play, History, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentIsDirty } from "@/features/agents/redux/agent-definition/selectors";
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

type AgentPageMode = "view" | "edit" | "run" | "versions";
type ModeOption = AgentPageMode | "new";

const MODES: { id: ModeOption; label: string; icon: typeof Eye }[] = [
  { id: "view", label: "View", icon: Eye },
  { id: "edit", label: "Build", icon: Pencil },
  { id: "run", label: "Run", icon: Play },
  { id: "versions", label: "Versions", icon: History },
  { id: "new", label: "New", icon: Plus },
];

function deriveMode(pathname: string, agentId: string): AgentPageMode {
  const base = `/agents/${agentId}`;
  if (pathname.startsWith(`${base}/run`)) return "run";
  if (pathname.startsWith(`${base}/edit`)) return "edit";
  if (
    pathname.startsWith(`${base}/latest`) ||
    /^\/agents\/[^/]+\/\d+$/.test(pathname)
  )
    return "versions";
  return "view";
}

export function AgentModeController({ agentId }: { agentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const isDirty = useAppSelector((state) => selectAgentIsDirty(state, agentId));
  const [showDirtyDialog, setShowDirtyDialog] = useState(false);
  const [pendingNew, setPendingNew] = useState(false);

  const mode = deriveMode(pathname, agentId);

  const navigateTo = (path: string) => {
    startTransition(() => router.push(path));
  };

  const handleModeChange = (next: ModeOption) => {
    if (next === mode) return;

    if (next === "new") {
      if (isDirty) {
        setPendingNew(true);
        setShowDirtyDialog(true);
      } else {
        navigateTo("/agents");
      }
      return;
    }

    const pathMap: Record<AgentPageMode, string> = {
      view: `/agents/${agentId}`,
      edit: `/agents/${agentId}/edit`,
      run: `/agents/${agentId}/run`,
      versions: `/agents/${agentId}/latest`,
    };
    navigateTo(pathMap[next]);
  };

  return (
    <>
      <div className="shell-glass flex items-center gap-0.5 rounded-full p-0.5">
        {MODES.map(({ id, label, icon: Icon }) => {
          const isActive = id === mode;
          return (
            <button
              key={id}
              onClick={() => handleModeChange(id)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 text-[0.6875rem] font-medium rounded-full transition-colors cursor-pointer",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                isActive
                  ? "bg-[var(--shell-glass-bg-active)] text-[var(--shell-nav-text-hover)]"
                  : "text-[var(--shell-nav-text)] hover:text-[var(--shell-nav-text-hover)]",
              )}
            >
              <Icon />
              {label}
            </button>
          );
        })}
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
            <AlertDialogCancel
              onClick={() => {
                setShowDirtyDialog(false);
                setPendingNew(false);
              }}
            >
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDirtyDialog(false);
                if (pendingNew) {
                  setPendingNew(false);
                  navigateTo("/agents");
                }
              }}
            >
              Discard & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

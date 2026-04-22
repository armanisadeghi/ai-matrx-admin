"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, Play, History, Plus, LayoutGrid } from "lucide-react";
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

type AgentPageMode = "view" | "edit" | "run" | "versions" | "widgets";
type ModeOption = AgentPageMode | "new";

const MODES: { id: ModeOption; label: string; icon: typeof Eye }[] = [
  { id: "view", label: "View", icon: Eye },
  { id: "edit", label: "Build", icon: Pencil },
  { id: "run", label: "Run", icon: Play },
  { id: "versions", label: "Versions", icon: History },
  { id: "widgets", label: "Widgets", icon: LayoutGrid },
  { id: "new", label: "New", icon: Plus },
];

function deriveMode(
  pathname: string,
  agentId: string,
  basePath: string,
): AgentPageMode {
  const base = `${basePath}/${agentId}`;
  if (pathname.startsWith(`${base}/run`)) return "run";
  if (pathname.startsWith(`${base}/build`)) return "edit";
  if (pathname.startsWith(`${base}/widgets`)) return "widgets";
  const versionPattern = new RegExp(
    `^${basePath.replace(/\//g, "\\/")}\\/[^/]+\\/v\\/\\d+$`,
  );
  if (pathname.startsWith(`${base}/latest`) || versionPattern.test(pathname))
    return "versions";
  return "view";
}

export function AgentModeController({
  agentId,
  basePath = "/agents",
}: {
  agentId: string;
  basePath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const isDirty = useAppSelector((state) => selectAgentIsDirty(state, agentId));
  const [showDirtyDialog, setShowDirtyDialog] = useState(false);
  const [pendingNew, setPendingNew] = useState(false);

  const mode = deriveMode(pathname, agentId, basePath);

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
        navigateTo(basePath);
      }
      return;
    }

    const pathMap: Record<AgentPageMode, string> = {
      view: `${basePath}/${agentId}`,
      edit: `${basePath}/${agentId}/build`,
      run: `${basePath}/${agentId}/run`,
      versions: `${basePath}/${agentId}/latest`,
      widgets: `${basePath}/${agentId}/widgets`,
    };
    navigateTo(pathMap[next]);
  };

  const getModeHref = (id: ModeOption): string => {
    if (id === "new") return basePath;
    const map: Record<AgentPageMode, string> = {
      view: `${basePath}/${agentId}`,
      edit: `${basePath}/${agentId}/build`,
      run: `${basePath}/${agentId}/run`,
      versions: `${basePath}/${agentId}/latest`,
      widgets: `${basePath}/${agentId}/widgets`,
    };
    return map[id];
  };

  return (
    <>
      <div className="shell-glass flex items-center gap-0.5 rounded-full p-0.5">
        {MODES.map(({ id, label, icon: Icon }) => {
          const isActive = id === mode;
          return (
            <Link
              key={id}
              href={getModeHref(id)}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                handleModeChange(id);
              }}
              title={label}
              className={cn(
                "flex items-center justify-center gap-1 py-0.5 text-[0.6875rem] font-medium rounded-full transition-colors cursor-pointer",
                "px-1.5 md:px-2.5",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                isActive
                  ? "bg-[var(--shell-glass-bg-active)] text-[var(--shell-nav-text-hover)]"
                  : "text-[var(--shell-nav-text)] hover:text-[var(--shell-nav-text-hover)]",
              )}
            >
              <Icon />
              <span className="hidden md:inline">{label}</span>
            </Link>
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
                  navigateTo(basePath);
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

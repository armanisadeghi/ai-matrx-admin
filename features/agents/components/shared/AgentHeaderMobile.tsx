"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Eye, Pencil, Play, History, Plus, Webhook } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentIsDirty } from "@/features/agents/redux/agent-definition/selectors";
import {
  TapTargetButtonForGroup,
  TapTargetButtonGroup,
} from "@/components/icons/TapTargetButton";
import { AgentListDropdown } from "@/features/agents/components/agent-listings/AgentListDropdown";
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
import { AgentOptionsMenu } from "./AgentOptionsMenu";

type AgentPageMode = "view" | "edit" | "run" | "versions";
type ModeOption = AgentPageMode | "new";

const MODES: { id: ModeOption; label: string; icon: typeof Eye }[] = [
  { id: "view", label: "View", icon: Eye },
  { id: "edit", label: "Build", icon: Pencil },
  { id: "run", label: "Run", icon: Play },
  { id: "versions", label: "Versions", icon: History },
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
  const versionPattern = new RegExp(
    `^${basePath.replace(/\//g, "\\/")}\\/[^/]+\\/\\d+$`,
  );
  if (pathname.startsWith(`${base}/latest`) || versionPattern.test(pathname))
    return "versions";
  return "view";
}

function deriveModeSuffix(
  pathname: string,
  agentId: string,
  basePath: string,
): string {
  const base = `${basePath}/${agentId}`;
  if (pathname.startsWith(`${base}/run`)) return "/run";
  if (pathname.startsWith(`${base}/build`)) return "/build";
  const versionPattern = new RegExp(
    `^${basePath.replace(/\//g, "\\/")}\\/[^/]+\\/\\d+$`,
  );
  if (pathname.startsWith(`${base}/latest`) || versionPattern.test(pathname))
    return "/latest";
  return "";
}

interface AgentHeaderMobileProps {
  agentId: string;
  /** Agent name — currently unused in mobile layout (icons-only to save space).
   *  Kept in the props for API symmetry with desktop and for future label use. */
  agentName?: string;
  /** Base path used for mode-switch navigation. Defaults to `/agents`. */
  basePath?: string;
}

export function AgentHeaderMobile({
  agentId,
  basePath = "/agents",
}: AgentHeaderMobileProps) {
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
    };
    navigateTo(pathMap[next]);
  };

  const handleAgentSelect = (selectedId: string) => {
    const suffix = deriveModeSuffix(pathname, agentId, basePath);
    startTransition(() => router.push(`${basePath}/${selectedId}${suffix}`));
  };

  return (
    <>
      <div className="flex items-center w-full gap-0.5 min-w-0">
        {/* Left: Agent selector — Webhook icon opens the drawer (no name label; icons-only to save mobile space) */}
        <AgentListDropdown
          onSelect={handleAgentSelect}
          triggerSlot={
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center bg-transparent transition-transform active:scale-95 outline-none cursor-pointer"
              aria-label="Select agent"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full matrx-shell-glass transition-colors">
                <Webhook className="w-3.5 h-3.5" />
              </div>
            </button>
          }
        />

        {/* Center: 5-icon mode group */}
        <div className="flex-1 flex justify-center min-w-0">
          <TapTargetButtonGroup>
            {MODES.map(({ id, label, icon: Icon }) => {
              const isActive = id === mode;
              return (
                <TapTargetButtonForGroup
                  key={id}
                  icon={
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-primary" : ""}`}
                    />
                  }
                  ariaLabel={label}
                  onClick={() => handleModeChange(id)}
                />
              );
            })}
          </TapTargetButtonGroup>
        </div>

        {/* Right: Options menu */}
        <AgentOptionsMenu agentId={agentId} asTapTarget />
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

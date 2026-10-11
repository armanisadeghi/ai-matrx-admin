"use client";

// features/education/kits/components/KitBuildStatus.tsx
//
// The kit page's hold on a kit build that is still running on the server
// (`onboard/kitBuildService.ts`, aidream `education_kit_build`). The build
// does not belong to the tab that started it: a phone that locked, a closed
// tab, or the same kit opened on another device all find it here by its kit,
// reattach to its live state, and see each output land as the server saves
// it. Never a top-of-page live block (streaming law 3): one status line, and
// Watch opens the run's floating window.

import { useEffect, useEffectEvent, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useOpenWorkflowRunWindow } from "@/features/overlays/openers/workflowRunWindow";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import {
  selectRunActivity,
  selectRunStatus,
} from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { runIsOver } from "@/features/workflow-runtime/types";
import { KIT_BUILD_LABEL, lookupKitBuildRun } from "@/features/education/onboard/kitBuildService";

export function KitBuildStatus({
  kitId,
  organizationId,
  onSaved,
}: {
  /** The kit record's id (null for a kit that has no record of its own). */
  kitId: string | null;
  organizationId: string | undefined;
  /** An output landed or the build finished: re-read the kit. */
  onSaved: () => void;
}) {
  const dispatch = useAppDispatch();
  const openRunWindow = useOpenWorkflowRunWindow();
  const [runId, setRunId] = useState<string | null>(null);
  useWorkflowRun(runId);
  const status = useAppSelector(selectRunStatus(runId ?? ""));
  const activity = useAppSelector(selectRunActivity(runId ?? ""));
  const over = runId !== null && runIsOver(status);

  useEffect(() => {
    if (!kitId) return;
    let live = true;
    lookupKitBuildRun(dispatch, kitId, organizationId)
      .then((found) => {
        if (live && found?.active) setRunId(found.runId);
      })
      .catch((e: unknown) => {
        // Loud, and the kit still renders: only the live line is missing.
        console.error("[KitBuildStatus] could not look up the kit build:", e);
      });
    return () => {
      live = false;
    };
  }, [kitId, organizationId]);

  // Each output the server saves settles its step: re-read the kit so it shows.
  const settled = activity.filter((a) => a.kind === "completed").length;
  const refresh = useEffectEvent(() => onSaved());
  useEffect(() => {
    if (runId && (settled > 0 || over)) refresh();
  }, [runId, settled, over]);

  if (!runId || over) return null;
  const last = [...activity]
    .reverse()
    .find((a) => (a.kind === "progress" || a.kind === "phase") && a.text && !a.text.trimStart().startsWith("{"));
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 type-secondary text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      <span className="min-w-0 flex-1 truncate">
        {last?.text ? `Building outputs · ${last.text}` : "Building outputs"}
      </span>
      <Button
        variant="quiet"
        icon={<Eye />}
        onClick={() => openRunWindow({ runId, workflowName: KIT_BUILD_LABEL })}
      >
        Watch
      </Button>
    </div>
  );
}

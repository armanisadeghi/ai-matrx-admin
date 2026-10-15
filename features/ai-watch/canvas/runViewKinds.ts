"use client";

/**
 * The debug run views as canvas tabs (MKT-104). With debug on, a page that starts a run shows its live
 * progress: in floating windows when a gutter beside the page's working column can hold them, otherwise
 * in the shell's right-hand canvas column, which narrows the page instead of covering it. Same bodies
 * both ways (`FloatingRunBody`, `AiWatchWindow framed={false}`), so nothing is drawn twice.
 */

import { Activity, Eye } from "lucide-react";
import type { CanvasJson } from "@ai-matrx/canvas";
import { defineCanvasKind, type AnyCanvasKind } from "@ai-matrx/canvas/react";
import { canvasText } from "@/features/canvas/host/toolCanvas";

export const WORKFLOW_RUN_CANVAS_ID = "workflow-run-view";
export const AI_WATCH_CANVAS_ID = "ai-watch-view";
export const AI_WATCH_CANVAS_KEY = "page";

export function readRunViewTab(data: CanvasJson | undefined | null): { runId: string } | null {
  const runId = canvasText(data, "runId");
  return runId ? { runId } : null;
}

export const WORKFLOW_RUN_CANVAS_KIND: AnyCanvasKind = defineCanvasKind<CanvasJson>({
  id: WORKFLOW_RUN_CANVAS_ID,
  surface: "dom",
  label: "Workflow run",
  icon: Activity,
  load: () => import("./WorkflowRunCanvasView"),
  unavailable: (data) => (readRunViewTab(data) ? null : "No run"),
  // A live run is not restored across reloads (its permalink is).
  restore: false,
});

export const AI_WATCH_CANVAS_KIND: AnyCanvasKind = defineCanvasKind<CanvasJson>({
  id: AI_WATCH_CANVAS_ID,
  surface: "dom",
  label: "Watch AI",
  icon: Eye,
  load: () => import("./AiWatchCanvasView"),
  restore: false,
});

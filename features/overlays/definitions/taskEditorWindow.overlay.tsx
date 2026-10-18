"use client";

/**
 * Opener for the `taskEditorWindow` overlay — the canonical way to open any
 * task or subtask in a floating `WindowPanel` + `TaskEditor`.
 *
 * One stable instance per task id (`task-${taskId}`) so re-opening focuses the
 * existing window instead of stacking duplicates.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "taskEditorWindow" as const;

export interface OpenTaskEditorWindowOptions {
  taskId: string;
  /** Defaults to `task-${taskId}` — one window per task. */
  instanceId?: string;
}

export interface TaskEditorWindowHandle {
  instanceId: string;
  close: () => void;
}

export function taskEditorInstanceId(taskId: string): string {
  return `task-${taskId}`;
}

export function useOpenTaskEditorWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenTaskEditorWindowOptions): TaskEditorWindowHandle => {
      const instanceId = opts.instanceId ?? taskEditorInstanceId(opts.taskId);
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: { taskId: opts.taskId },
        }),
      );
      return {
        instanceId,
        close: () =>
          dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
      };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type TaskEditorWindowDefinitionData = OpenTaskEditorWindowOptions;

export const taskEditorWindowOverlay = /* @__PURE__ */ defineOverlay<TaskEditorWindowDefinitionData>()({
  id: "taskEditorWindow",
  label: "Task Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { taskId: null },
    windowId: "task-editor-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    taskEditorWindow: OverlayWire<TaskEditorWindowDefinitionData>;
  }
}

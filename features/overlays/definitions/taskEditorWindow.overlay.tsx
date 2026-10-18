"use client";

/**
 * Opener for the `taskEditorWindow` overlay — the canonical way to open any
 * task or subtask in a floating `WindowPanel` + `TaskEditor`.
 *
 * One stable instance per task id (`task-${taskId}`) so re-opening focuses the
 * existing window instead of stacking duplicates.
 */

import { useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";
import { taskEditorInstanceId } from "./opener-instance-ids";

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


/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createTaskEditorWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenTaskEditorWindowOptions): TaskEditorWindowHandle => {
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
  };
}

export function useOpenTaskEditorWindow() {
  const store = useAppStore();
  return useMemo(() => createTaskEditorWindowOpener(store), [store]);
}

export type TaskEditorWindowDefinitionData = OpenTaskEditorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    taskEditorWindow: OverlayWire<TaskEditorWindowDefinitionData>;
  }
}

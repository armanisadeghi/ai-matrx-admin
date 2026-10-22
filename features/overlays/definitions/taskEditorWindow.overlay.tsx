"use client";

/**
 * Opener for the `taskEditorWindow` overlay — the canonical way to open any
 * task or subtask in a floating `WindowPanel` + `TaskEditor`.
 *
 * One stable instance per task id (`task-${taskId}`) so re-opening focuses the
 * existing window instead of stacking duplicates.
 */

import type { OverlayWire } from "./overlay-types";
import { taskEditorInstanceId } from "./opener-instance-ids";
import { appOpener } from "./app-opener";

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
const opener = appOpener<OpenTaskEditorWindowOptions>(OVERLAY_ID, {
  instanceId: (opts: OpenTaskEditorWindowOptions) => opts.instanceId ?? taskEditorInstanceId(opts.taskId),
});

export const createTaskEditorWindowOpener = opener.forStore;

export const useOpenTaskEditorWindow = opener.useOpen;

export type TaskEditorWindowDefinitionData = OpenTaskEditorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    taskEditorWindow: OverlayWire<TaskEditorWindowDefinitionData>;
  }
}

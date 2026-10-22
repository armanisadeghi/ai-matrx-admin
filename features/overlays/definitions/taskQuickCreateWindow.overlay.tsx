"use client";

/**
 * Opener for the `taskQuickCreateWindow` overlay.
 *
 * - `useOpenTaskQuickCreateWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<TaskQuickCreateWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type {
  TaskPrePopulate,
  TaskSourceInput,
} from "@/features/tasks/widgets/quick-create/TaskQuickCreateCore";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "taskQuickCreateWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

type TaskQuickCreateSavedHandler = (taskId: string) => void;
let savedHandler: TaskQuickCreateSavedHandler | null = null;

/** Called by TaskQuickCreateWindow when a task is saved. */
export function emitTaskQuickCreateSaved(taskId: string) {
  savedHandler?.(taskId);
  savedHandler = null;
}

export interface OpenTaskQuickCreateWindowOptions {
  source?: TaskSourceInput;
  prePopulate?: TaskPrePopulate;
  /** One-shot — fired when the user saves a new task, then cleared. */
  onSaved?: TaskQuickCreateSavedHandler;
}

export interface TaskQuickCreateWindowHandle {
  close: () => void;
}

export function useOpenTaskQuickCreateWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenTaskQuickCreateWindowOptions = {},
    ): TaskQuickCreateWindowHandle => {
      savedHandler = opts.onSaved ?? null;
      opener.open(dispatch, { data: {
            source: opts.source,
            prePopulate: opts.prePopulate,
          } });
      return {
        close: () => {
          savedHandler = null;
          dispatch(opener.close());
        },
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const TaskQuickCreateWindowController = hookController<OpenTaskQuickCreateWindowOptions>(useOpenTaskQuickCreateWindow);

export type TaskQuickCreateWindowDefinitionData = OpenTaskQuickCreateWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    taskQuickCreateWindow: OverlayWire<TaskQuickCreateWindowDefinitionData>;
  }
}

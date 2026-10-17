"use client";

/**
 * Opener for the `quickTasksWindow` overlay.
 *
 * - `useOpenQuickTasksWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<QuickTasksWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "quickTasksWindow" as const;

export interface OpenQuickTasksWindowOptions {
}

export interface QuickTasksWindowHandle {
  close: () => void;
}

export function useOpenQuickTasksWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenQuickTasksWindowOptions = {}): QuickTasksWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID }));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
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
export function QuickTasksWindowController(props: OpenQuickTasksWindowOptions): null {
  const open = useOpenQuickTasksWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type QuickTasksWindowDefinitionData = OpenQuickTasksWindowOptions;

export const quickTasksWindowOverlay = defineOverlay<QuickTasksWindowDefinitionData>()({
  id: "quickTasksWindow",
  label: "Quick Tasks Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { orgId: null, projectId: null, taskId: null, search: "" },
    windowId: "quick-tasks-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "quick_tasks",
    hydrate: (ctx) => import("./quickTasksWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./quickTasksWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickTasksWindow: OverlayWire<QuickTasksWindowDefinitionData>;
  }
}

"use client";

/**
 * Opener for the `executionInspectorWindow` overlay.
 *
 * - `useOpenExecutionInspectorWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ExecutionInspectorWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "executionInspectorWindow" as const;

export interface OpenExecutionInspectorWindowOptions {
}

export interface ExecutionInspectorWindowHandle {
  close: () => void;
}

export function useOpenExecutionInspectorWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenExecutionInspectorWindowOptions = {}): ExecutionInspectorWindowHandle => {
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
export function ExecutionInspectorWindowController(props: OpenExecutionInspectorWindowOptions): null {
  const open = useOpenExecutionInspectorWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ExecutionInspectorWindowDefinitionData = OpenExecutionInspectorWindowOptions;

export const executionInspectorWindowOverlay = defineOverlay<ExecutionInspectorWindowDefinitionData>()({
  id: "executionInspectorWindow",
  label: "Execution Inspector Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "exec-inspector-window",
    mobile: "card",
    ephemeral: true,
  },
  link: {
    key: "exec-inspector",
    hydrate: (ctx) => import("./executionInspectorWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    executionInspectorWindow: OverlayWire<ExecutionInspectorWindowDefinitionData>;
  }
}

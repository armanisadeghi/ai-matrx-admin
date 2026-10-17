"use client";

/**
 * Opener for the `contextSwitcherWindow` overlay.
 *
 * - `useOpenContextSwitcherWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ContextSwitcherWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "contextSwitcherWindow" as const;

export interface OpenContextSwitcherWindowOptions {
}

export interface ContextSwitcherWindowHandle {
  close: () => void;
}

export function useOpenContextSwitcherWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenContextSwitcherWindowOptions = {}): ContextSwitcherWindowHandle => {
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
export function ContextSwitcherWindowController(props: OpenContextSwitcherWindowOptions): null {
  const open = useOpenContextSwitcherWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ContextSwitcherWindowDefinitionData = OpenContextSwitcherWindowOptions;

export const contextSwitcherWindowOverlay = defineOverlay<ContextSwitcherWindowDefinitionData>()({
  id: "contextSwitcherWindow",
  label: "Context Switcher Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "context-switcher-window",
    mobile: "drawer",
  },
  render: () => import("./contextSwitcherWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contextSwitcherWindow: OverlayWire<ContextSwitcherWindowDefinitionData>;
  }
}

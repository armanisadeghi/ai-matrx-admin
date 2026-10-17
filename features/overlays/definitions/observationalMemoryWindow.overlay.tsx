"use client";

/**
 * Opener for the `observationalMemoryWindow` overlay.
 *
 * - `useOpenObservationalMemoryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ObservationalMemoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "observationalMemoryWindow" as const;

export interface OpenObservationalMemoryWindowOptions {
  initialSelectedConversationId?: string | null;
}

export interface ObservationalMemoryWindowHandle {
  close: () => void;
}

export function useOpenObservationalMemoryWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenObservationalMemoryWindowOptions = {}): ObservationalMemoryWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialSelectedConversationId: opts.initialSelectedConversationId,
          },
        }),
      );
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
export function ObservationalMemoryWindowController(props: OpenObservationalMemoryWindowOptions): null {
  const open = useOpenObservationalMemoryWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialSelectedConversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ObservationalMemoryWindowDefinitionData = OpenObservationalMemoryWindowOptions;

export const observationalMemoryWindowOverlay = defineOverlay<ObservationalMemoryWindowDefinitionData>()({
  id: "observationalMemoryWindow",
  label: "Observational Memory Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialSelectedConversationId: null },
    windowId: "observational-memory-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  render: () => import("./observationalMemoryWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    observationalMemoryWindow: OverlayWire<ObservationalMemoryWindowDefinitionData>;
  }
}

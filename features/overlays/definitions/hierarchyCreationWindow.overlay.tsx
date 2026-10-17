"use client";

/**
 * Opener for the `hierarchyCreationWindow` overlay.
 *
 * - `useOpenHierarchyCreationWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<HierarchyCreationWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "hierarchyCreationWindow" as const;

export interface OpenHierarchyCreationWindowOptions {
  /** TODO: tighten to `HierarchyCreationWindowData` once that type is imported. */
  data?: unknown;
}

export interface HierarchyCreationWindowHandle {
  close: () => void;
}

export function useOpenHierarchyCreationWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenHierarchyCreationWindowOptions = {}): HierarchyCreationWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            data: opts.data,
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
export function HierarchyCreationWindowController(props: OpenHierarchyCreationWindowOptions): null {
  const open = useOpenHierarchyCreationWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.data]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type HierarchyCreationWindowDefinitionData = OpenHierarchyCreationWindowOptions;

export const hierarchyCreationWindowOverlay = defineOverlay<HierarchyCreationWindowDefinitionData>()({
  id: "hierarchyCreationWindow",
  label: "Hierarchy Creation Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { entityType: null, presetIds: {} },
    windowId: "hierarchy-creation-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    hierarchyCreationWindow: OverlayWire<HierarchyCreationWindowDefinitionData>;
  }
}

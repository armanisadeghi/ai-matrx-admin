"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "drillDeckContextWindow" as const;

export interface OpenDrillDeckContextWindowOptions {}

export interface DrillDeckContextWindowHandle {
  close: () => void;
}

/** Open the singleton Drill Deck Surface-A WindowPanel. */
export function useOpenDrillDeckContextWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      _options: OpenDrillDeckContextWindowOptions = {},
    ): DrillDeckContextWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID }));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

/** Declarative form: mount to open, unmount to close. */
export function DrillDeckContextWindowController(
  _props: OpenDrillDeckContextWindowOptions,
): null {
  const open = useOpenDrillDeckContextWindow();
  useEffect(() => {
    const handle = open();
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type DrillDeckContextWindowDefinitionData = OpenDrillDeckContextWindowOptions;

export const drillDeckContextWindowOverlay = /* @__PURE__ */ defineOverlay<DrillDeckContextWindowDefinitionData>()({
  id: "drillDeckContextWindow",
  label: "Drill Deck Context Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "drill-deck-context-window",
    mobile: "drawer",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    drillDeckContextWindow: OverlayWire<DrillDeckContextWindowDefinitionData>;
  }
}

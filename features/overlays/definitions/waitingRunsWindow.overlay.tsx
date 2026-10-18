"use client";

/**
 * Opener for the `waitingRunsWindow` overlay (a window that wraps a canonical list).
 *
 * - `useOpenWaitingRunsWindow()` — imperative hook; returns a handle with `close()`.
 * - `<WaitingRunsWindowController />` — declarative: mount to open, unmount to close.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "waitingRunsWindow" as const;

export interface WaitingRunsWindowHandle {
  close: () => void;
}

export function useOpenWaitingRunsWindow() {
  const dispatch = useAppDispatch();
  return useCallback((): WaitingRunsWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  }, [dispatch]);
}

export function WaitingRunsWindowController(): null {
  const open = useOpenWaitingRunsWindow();
  useEffect(() => {
    const handle = open();
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type WaitingRunsWindowDefinitionData = Record<string, unknown>;

export const waitingRunsWindowOverlay = defineOverlay<WaitingRunsWindowDefinitionData>()({
  id: "waitingRunsWindow",
  label: "Workflows waiting on you",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "waiting-runs-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    waitingRunsWindow: OverlayWire<WaitingRunsWindowDefinitionData>;
  }
}

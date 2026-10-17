"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "liveIntegrationsWindow" as const;

export interface LiveIntegrationsWindowHandle {
  close: () => void;
}

export function useOpenLiveIntegrationsWindow() {
  const dispatch = useAppDispatch();
  return (): LiveIntegrationsWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

/** Declarative form for callers that own the window's mount lifecycle. */
export function LiveIntegrationsWindowController(): null {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return () => {
      dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
    };
  }, [dispatch]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type LiveIntegrationsWindowDefinitionData = Record<string, unknown>;

export const liveIntegrationsWindowOverlay = defineOverlay<LiveIntegrationsWindowDefinitionData>()({
  id: "liveIntegrationsWindow",
  label: "Live Integrations",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "live-integrations-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  render: () => import("./liveIntegrationsWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    liveIntegrationsWindow: OverlayWire<LiveIntegrationsWindowDefinitionData>;
  }
}

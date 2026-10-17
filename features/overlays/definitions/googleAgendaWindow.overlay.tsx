"use client";

/**
 * Opener for the agenda window (Google-native PLAN §4.6).
 *
 * `useOpenGoogleAgenda()` — the imperative hook; the Controller component is the
 * declarative face for a caller whose lifecycle is mount/unmount. Singleton:
 * opening again reveals the one window rather than stacking a copy. It carries no
 * required identity data. A caller can select an initial Calendar tab.
 */

import type { GoogleAgendaWindowLaunchData } from "@/features/google-workspace/calendar/window-types";
import { useCallback, useEffect } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { UntypedOverlayWire } from "./overlay-types";

const OVERLAY_ID = "googleAgendaWindow" as const;

export interface GoogleAgendaWindowHandle {
  close: () => void;
}

export function useOpenGoogleAgenda() {
  const dispatch = useAppDispatch();
  return useCallback((data?: GoogleAgendaWindowLaunchData): GoogleAgendaWindowHandle => {
    dispatch(openOverlay(data ? { overlayId: OVERLAY_ID, data } : { overlayId: OVERLAY_ID }));
    return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
  }, [dispatch]);
}

export function GoogleAgendaWindowController() {
  const open = useOpenGoogleAgenda();
  useEffect(() => {
    const handle = open();
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type GoogleAgendaWindowDefinitionData = Record<string, unknown>;

export const googleAgendaWindowOverlay = defineOverlay<GoogleAgendaWindowDefinitionData>()({
  id: "googleAgendaWindow",
  label: "Agenda",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "google-agenda-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  link: {
    key: "agenda",
    hydrate: (ctx) => import("./googleAgendaWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./googleAgendaWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    googleAgendaWindow: UntypedOverlayWire;
  }
}

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
import { useCallback } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import type { UntypedOverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "googleAgendaWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface GoogleAgendaWindowHandle {
  close: () => void;
}

export function useOpenGoogleAgenda() {
  const dispatch = useAppDispatch();
  return useCallback((data?: GoogleAgendaWindowLaunchData): GoogleAgendaWindowHandle => {
    opener.open(dispatch, data ? { data } : undefined);
    return { close: () => dispatch(opener.close()) };
  }, [dispatch]);
}

export const GoogleAgendaWindowController = hookController(useOpenGoogleAgenda);

export type GoogleAgendaWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    googleAgendaWindow: UntypedOverlayWire;
  }
}

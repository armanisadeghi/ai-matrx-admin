"use client";

/**
 * Opener for the `meetMatrxWindow` overlay — Meet Matrx shown once to every existing person on their next
 * visit to home (features/onboarding/meet-matrx/MeetMatrxIntroMount opens it). Reopening any time is /meet-matrx.
 *
 * - `useOpenMeetMatrxWindow()` — imperative hook; returns a handle with `close()`.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "meetMatrxWindow" as const;

export interface MeetMatrxWindowHandle {
  close: () => void;
}

export function useOpenMeetMatrxWindow() {
  const dispatch = useAppDispatch();
  return useCallback((): MeetMatrxWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
  }, [dispatch]);
}

export type MeetMatrxWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    meetMatrxWindow: OverlayWire<MeetMatrxWindowDefinitionData>;
  }
}

"use client";

/**
 * Opener for the `meetMatrxWindow` overlay — Meet Matrx shown once to every existing person on their next
 * visit to home (features/onboarding/meet-matrx/MeetMatrxIntroMount opens it). Reopening any time is /meet-matrx.
 *
 * - `useOpenMeetMatrxWindow()` — imperative hook; returns a handle with `close()`.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "meetMatrxWindow" as const;

export interface MeetMatrxWindowHandle {
  close: () => void;
}

const opener = appOpener(OVERLAY_ID);

export const useOpenMeetMatrxWindow = opener.useOpen;

export type MeetMatrxWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    meetMatrxWindow: OverlayWire<MeetMatrxWindowDefinitionData>;
  }
}

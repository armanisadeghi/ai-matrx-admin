"use client";

/**
 * Opener for the `guestAiAllowance` overlay — THE one guest reminder.
 *
 * Nothing in a feature calls this. The ONE caller is
 * `components/guest/GuestAiAllowanceBridge.tsx`, which listens to the shared
 * error sink (lib/guest/guest-ai-allowance.ts) and opens it when the server
 * answers `guest_ai_allowance_used`.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "guestAiAllowance" as const;

export interface OpenGuestAiAllowanceOptions {
  /** The server's own sentence, when it sent one. */
  message?: string | null;
}

export interface GuestAiAllowanceHandle {
  close: () => void;
}

const opener = appOpener<OpenGuestAiAllowanceOptions>(OVERLAY_ID, {
  data: (opts: OpenGuestAiAllowanceOptions = {}) => ({ message: opts.message ?? null }),
});

export const useOpenGuestAiAllowance = opener.useOpen;

/** Plain opener of the store, for boot-graph callers (useLazyAppOpener keeps this module out of first load). */
export const createGuestAiAllowanceOpener = opener.forStore;

/** Declarative form: opens on mount, closes on unmount. */
export const GuestAiAllowanceController = opener.Controller;

export type GuestAiAllowanceDefinitionData = OpenGuestAiAllowanceOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    guestAiAllowance: OverlayWire<GuestAiAllowanceDefinitionData>;
  }
}

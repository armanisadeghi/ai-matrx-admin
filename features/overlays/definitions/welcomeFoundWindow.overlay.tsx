"use client";

/**
 * Opener for the `welcomeFoundWindow` overlay — the sign-up welcome's "here's what we found", in a window over
 * whatever page the person is on (features/marketing/smart-add/welcome; SIGNUP-WELCOME.md). The found-you notice
 * opens it through its `?panels=welcome-found` link; nothing else needs to.
 *
 * - `useOpenWelcomeFoundWindow()` — imperative hook; returns a handle with `close()`.
 * - `<WelcomeFoundWindowController />` — declarative: mount to open, unmount to close.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "welcomeFoundWindow" as const;

export interface WelcomeFoundWindowHandle {
  close: () => void;
}

const opener = appOpener(OVERLAY_ID);

export const useOpenWelcomeFoundWindow = opener.useOpen;

export const WelcomeFoundWindowController = opener.Controller;

export type WelcomeFoundWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    welcomeFoundWindow: OverlayWire<WelcomeFoundWindowDefinitionData>;
  }
}

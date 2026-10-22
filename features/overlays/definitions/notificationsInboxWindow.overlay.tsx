"use client";

/**
 * Opener for the `notificationsInboxWindow` overlay (a window that wraps a canonical list).
 *
 * - `useOpenNotificationsInboxWindow()` — imperative hook; returns a handle with `close()`.
 * - `<NotificationsInboxWindowController />` — declarative: mount to open, unmount to close.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "notificationsInboxWindow" as const;

export interface NotificationsInboxWindowHandle {
  close: () => void;
}

const opener = appOpener(OVERLAY_ID);

export const useOpenNotificationsInboxWindow = opener.useOpen;

export const NotificationsInboxWindowController = opener.Controller;

export type NotificationsInboxWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    notificationsInboxWindow: OverlayWire<NotificationsInboxWindowDefinitionData>;
  }
}

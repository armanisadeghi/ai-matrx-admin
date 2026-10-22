"use client";

/**
 * Opener for the `pickListManagerWindow` overlay.
 *
 * - `useOpenPickListManagerWindow()` — imperative hook. Pass `forcedListId`
 *   to open in single-list mode (switcher hidden); omit it to open the full
 *   browse view.
 * - `<PickListManagerWindowController />` — declarative wrapper. Mount to
 *   open, unmount to close.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "pickListManagerWindow" as const;

export interface OpenPickListManagerWindowOptions {
  title?: string;
  /** When set, opens in single-list mode pinned to this pick list. */
  forcedListId?: string | null;
}

export interface PickListManagerWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenPickListManagerWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenPickListManagerWindowOptions = {}) => ({
          title: opts.title,
          forcedListId: opts.forcedListId ?? null,
        }),
});

export const createPickListManagerWindowOpener = opener.forStore;

export const useOpenPickListManagerWindow = opener.useOpen;

export const PickListManagerWindowController = opener.Controller;

export type PickListManagerWindowDefinitionData = OpenPickListManagerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    pickListManagerWindow: OverlayWire<PickListManagerWindowDefinitionData>;
  }
}

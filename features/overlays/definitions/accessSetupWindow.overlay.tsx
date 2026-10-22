"use client";

/**
 * Opener for the `accessSetupWindow` overlay — the People involved panel (features/access-setup).
 *
 * - `useOpenAccessSetupWindow()` — imperative hook; returns a handle with `close()`.
 * - `<AccessSetupWindowController />` — declarative: open on mount, close on unmount.
 *
 * Pass `recordId` for one record, or `cycleId` for a bulk creation (one panel for the cycle).
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "accessSetupWindow" as const;

export interface OpenAccessSetupWindowOptions {
  headType: string;
  recordId?: string | null;
  cycleId?: string | null;
  recordName?: string | null;
}

export interface AccessSetupWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenAccessSetupWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenAccessSetupWindowOptions) => ({
            headType: opts.headType,
            recordId: opts.recordId ?? null,
            cycleId: opts.cycleId ?? null,
            recordName: opts.recordName ?? null,
          }),
});

export const useOpenAccessSetupWindow = opener.useOpen;

export const AccessSetupWindowController = opener.Controller;

export type AccessSetupWindowDefinitionData = OpenAccessSetupWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    accessSetupWindow: OverlayWire<AccessSetupWindowDefinitionData>;
  }
}

"use client";

/**
 * Opener for the `smartAddHelperWindow` overlay — one Smart Add helper ("focused session") per
 * people-search method. The instance id is the method, so a second click focuses the same window.
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { HelperMethod } from "@/features/marketing/smart-add/helpers/types";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "smartAddHelperWindow" as const;

const opener = appOpener<HelperMethod>(OVERLAY_ID, {
  instanceId: (method: HelperMethod) => method,
  data: (method: HelperMethod) => ({ method }),
});

export const useOpenSmartAddHelper = opener.useOpen;

export type SmartAddHelperWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    smartAddHelperWindow: OverlayWire<SmartAddHelperWindowDefinitionData>;
  }
}

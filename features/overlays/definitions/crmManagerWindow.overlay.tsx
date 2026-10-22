"use client";

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "crmManagerWindow" as const;

export interface CrmManagerWindowHandle {
  close: () => void;
}

const opener = appOpener(OVERLAY_ID);

export const useOpenCrmManagerWindow = opener.useOpen;

export const CrmManagerWindowController = opener.Controller;

export type CrmManagerWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    crmManagerWindow: OverlayWire<CrmManagerWindowDefinitionData>;
  }
}

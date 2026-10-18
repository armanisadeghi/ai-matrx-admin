"use client";

import type { OverlayWire } from "./overlay-types";

export type SaveContactFromSelectionDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    saveContactFromSelection: OverlayWire<SaveContactFromSelectionDefinitionData>;
  }
}

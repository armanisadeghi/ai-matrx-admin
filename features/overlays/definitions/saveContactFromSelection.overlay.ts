"use client";

import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

export type SaveContactFromSelectionDefinitionData = Record<string, unknown>;

export const saveContactFromSelectionOverlay = /* @__PURE__ */ defineOverlay<SaveContactFromSelectionDefinitionData>()({
  id: "saveContactFromSelection",
  label: "Save As Contact",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    saveContactFromSelection: OverlayWire<SaveContactFromSelectionDefinitionData>;
  }
}

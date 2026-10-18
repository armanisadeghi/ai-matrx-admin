"use client";

import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

export type AttachResourcePickerDefinitionData = Record<string, unknown>;

export const attachResourcePickerOverlay = /* @__PURE__ */ defineOverlay<AttachResourcePickerDefinitionData>()({
  id: "attachResourcePicker",
  label: "Choose what to attach",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    attachResourcePicker: OverlayWire<AttachResourcePickerDefinitionData>;
  }
}

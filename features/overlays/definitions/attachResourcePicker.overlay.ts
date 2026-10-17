"use client";

import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

export type AttachResourcePickerDefinitionData = Record<string, unknown>;

export const attachResourcePickerOverlay = defineOverlay<AttachResourcePickerDefinitionData>()({
  id: "attachResourcePicker",
  label: "Choose what to attach",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  render: () => import("./attachResourcePicker.render"),
});

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    attachResourcePicker: OverlayWire<AttachResourcePickerDefinitionData>;
  }
}

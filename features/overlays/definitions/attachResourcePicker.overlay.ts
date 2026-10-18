"use client";

import type { OverlayWire } from "./overlay-types";

export type AttachResourcePickerDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    attachResourcePicker: OverlayWire<AttachResourcePickerDefinitionData>;
  }
}

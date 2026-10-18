"use client";

import type { OverlayWire } from "./overlay-types";
import type { OpenGoogleTasksImportOptions } from "./googleContactsImportWindow.overlay";

export type GoogleTasksImportWindowDefinitionData = OpenGoogleTasksImportOptions;

// Old opener names, unchanged: callers only change the import path.
export * from "./googleContactsImportWindow.overlay";

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    googleTasksImportWindow: OverlayWire<GoogleTasksImportWindowDefinitionData>;
  }
}

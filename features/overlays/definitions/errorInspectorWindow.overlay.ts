"use client";

import type { OverlayWire } from "./overlay-types";

export type ErrorInspectorWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    errorInspectorWindow: OverlayWire<ErrorInspectorWindowDefinitionData>;
  }
}

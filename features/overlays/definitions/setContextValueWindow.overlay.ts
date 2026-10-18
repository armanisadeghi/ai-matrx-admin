"use client";

import type { OverlayWire } from "./overlay-types";

export type SetContextValueWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    setContextValueWindow: OverlayWire<SetContextValueWindowDefinitionData>;
  }
}

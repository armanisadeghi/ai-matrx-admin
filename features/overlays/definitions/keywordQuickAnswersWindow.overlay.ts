"use client";

import type { OverlayWire } from "./overlay-types";

export type KeywordQuickAnswersWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    keywordQuickAnswersWindow: OverlayWire<KeywordQuickAnswersWindowDefinitionData>;
  }
}

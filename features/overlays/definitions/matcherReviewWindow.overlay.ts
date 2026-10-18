"use client";

import type { OverlayWire } from "./overlay-types";

export type MatcherReviewWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    matcherReviewWindow: OverlayWire<MatcherReviewWindowDefinitionData>;
  }
}

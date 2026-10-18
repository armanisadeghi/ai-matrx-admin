"use client";

// The `applyToSourceReview` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./applyToSourceReview.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ApplyToSourceReviewDefinitionData } from "./applyToSourceReview.overlay";

export const applyToSourceReviewOverlay = defineOverlay<ApplyToSourceReviewDefinitionData>()({
  id: "applyToSourceReview",
  label: "Apply to source",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

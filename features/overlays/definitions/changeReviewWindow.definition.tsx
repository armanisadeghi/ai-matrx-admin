"use client";

// The `changeReviewWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./changeReviewWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ChangeReviewWindowDefinitionData } from "./changeReviewWindow.overlay";

export const changeReviewWindowOverlay = defineOverlay<ChangeReviewWindowDefinitionData>()({
  id: "changeReviewWindow",
  label: "Review changes",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});

"use client";

// The `sourceReviewWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./sourceReviewWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SourceReviewWindowDefinitionData } from "./sourceReviewWindow.overlay";

export const sourceReviewWindowOverlay = defineOverlay<SourceReviewWindowDefinitionData>()({
  id: "sourceReviewWindow",
  label: "Review what goes in",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          sourceSet: null,
          options: null,
        },
    windowId: "source-review-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});

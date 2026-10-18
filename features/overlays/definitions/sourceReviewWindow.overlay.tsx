"use client";

/**
 * Opener for the `sourceReviewWindow` overlay — "Review what goes in".
 *
 * The canonical opener is the plain async function `openSourceReview` (it
 * works from handlers and non-React hosts and resolves with the person's
 * choice); this file is its home in the openers directory, plus the hook form
 * the overlay convention expects.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import {
  openSourceReview,
  type SourceReviewOptions,
  type SourceReviewOutcome,
} from "@/features/resource-manager/source-input/review/openSourceReview";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";

export { openSourceReview, type SourceReviewOptions, type SourceReviewOutcome };

/** Hook form: returns `openSourceReview` itself (stable, no per-render state). */
export function useOpenSourceReviewWindow(): typeof openSourceReview {
  return openSourceReview;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SourceReviewWindowDefinitionData = Record<string, unknown>;

export const sourceReviewWindowOverlay = /* @__PURE__ */ defineOverlay<SourceReviewWindowDefinitionData>()({
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



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    sourceReviewWindow: UntypedOverlayWire;
  }
}

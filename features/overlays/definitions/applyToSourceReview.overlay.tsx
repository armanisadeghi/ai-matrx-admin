"use client";

/**
 * Opener for the `applyToSourceReview` overlay — an agent window's answer
 * reviewed (diff → apply) against the text the window was launched from.
 *
 * - `applyToSourceReviewAction()` — the plain action for the rich-document
 *   "Apply to source" handler.
 * - `useOpenApplyToSourceReview()` — imperative hook.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { createOpener } from "@ai-matrx/summon/opener";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "applyToSourceReview" as const;
const opener = createOpener<OpenApplyToSourceReviewOptions>(OVERLAY_ID);

export interface OpenApplyToSourceReviewOptions {
  /** The target registered in rich-document/review/applyTargets. */
  applyTargetId: string;
  /** The answer being applied. */
  proposal: string;
}

export function applyToSourceReviewAction(opts: OpenApplyToSourceReviewOptions) {
  return opener.openAction({ applyTargetId: opts.applyTargetId, proposal: opts.proposal });
}

export function useOpenApplyToSourceReview() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenApplyToSourceReviewOptions) => {
      dispatch(applyToSourceReviewAction(opts));
    },
    [dispatch],
  );
}

export type ApplyToSourceReviewDefinitionData = OpenApplyToSourceReviewOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    applyToSourceReview: OverlayWire<ApplyToSourceReviewDefinitionData>;
  }
}

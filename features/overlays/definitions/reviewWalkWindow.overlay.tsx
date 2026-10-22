"use client";

/**
 * Opener for the `reviewWalkWindow` overlay (multi-instance).
 *
 * - `useOpenReviewWalkWindow()` — imperative hook. Each walked unit
 *   (unit_kind, unit_id) gets its own deterministic instanceId
 *   (`features/review-walk/address.ts`), so walks on different messages float
 *   side by side while re-opening the SAME unit focuses the existing window
 *   instead of stacking a duplicate. The open itself is the shared
 *   `openReviewWalk` thunk — the `?panels=review_walk:` hydrator uses it too.
 * - `<ReviewWalkWindowController />` — declarative wrapper.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { WalkUnitKind } from "@/features/review-walk/types";
import {
  REVIEW_WALK_OVERLAY_ID,
  openReviewWalk,
} from "@/features/review-walk/openReviewWalk";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const opener = createOpener<object>(REVIEW_WALK_OVERLAY_ID);

export interface OpenReviewWalkWindowOptions {
  unitKind: WalkUnitKind;
  unitId: string;
  /** The agent behind the walked conversation, when known — powers the
   * receipt's door to `/agents/{id}/hindsight`. */
  agentId?: string | null;
  agentName?: string | null;
  /** Short role label for the window title ("Live" / "Candidate"). */
  roleLabel?: string | null;
  /** What tells this walk from a sibling with the same role ("Pair 3"). */
  detailLabel?: string | null;
}

export interface ReviewWalkWindowHandle {
  close: () => void;
}

export function useOpenReviewWalkWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenReviewWalkWindowOptions): ReviewWalkWindowHandle => {
      const instanceId = dispatch(openReviewWalk(opts));
      return {
        close: () =>
          dispatch(opener.close(instanceId)),
      };
    },
    [dispatch],
  );
}

export const ReviewWalkWindowController = hookController<OpenReviewWalkWindowOptions>(useOpenReviewWalkWindow);

export type ReviewWalkWindowDefinitionData = OpenReviewWalkWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    reviewWalkWindow: OverlayWire<ReviewWalkWindowDefinitionData>;
  }
}

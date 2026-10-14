"use client";

/**
 * Opener for the `searchReviewWindow` overlay — "Review search results" (features/search-review).
 * The host publishes its session with `usePublishSearchReviewSession` and opens it by id; only the
 * id travels through the overlay data and the address (`?panels=search_review:<sessionId>`).
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@/lib/redux/slices/overlaySlice";

const OVERLAY_ID = "searchReviewWindow" as const;

export function useOpenSearchReviewWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (sessionId: string) => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { sessionId } }));
      return { close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })) };
    },
    [dispatch],
  );
}

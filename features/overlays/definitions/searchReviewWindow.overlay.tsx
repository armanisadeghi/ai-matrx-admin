"use client";

/**
 * Opener for the `searchReviewWindow` overlay — "Review search results" (features/search-review).
 * The host publishes its session with `usePublishSearchReviewSession` and opens it by id; only the
 * id travels through the overlay data and the address (`?panels=search_review:<sessionId>`).
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

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

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type SearchReviewWindowDefinitionData = Record<string, unknown>;

export const searchReviewWindowOverlay = /* @__PURE__ */ defineOverlay<SearchReviewWindowDefinitionData>()({
  id: "searchReviewWindow",
  label: "Review search results",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { sessionId: "" },
    windowId: "search-review-window",
    mobile: "fullscreen",
  },
  link: {
    key: "search_review",
    hydrate: (ctx) => import("./searchReviewWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    searchReviewWindow: OverlayWire<SearchReviewWindowDefinitionData>;
  }
}

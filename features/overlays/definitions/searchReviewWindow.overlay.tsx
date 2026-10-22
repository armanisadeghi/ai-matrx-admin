"use client";

/**
 * Opener for the `searchReviewWindow` overlay — "Review search results" (features/search-review).
 * The host publishes its session with `usePublishSearchReviewSession` and opens it by id; only the
 * id travels through the overlay data and the address (`?panels=search_review:<sessionId>`).
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "searchReviewWindow" as const;

const opener = appOpener<string>(OVERLAY_ID, {
  instanceId: () => undefined,
  data: (sessionId: string) => ({ sessionId }),
});

export const useOpenSearchReviewWindow = opener.useOpen;

export type SearchReviewWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    searchReviewWindow: OverlayWire<SearchReviewWindowDefinitionData>;
  }
}

// lib/redux/selectors/htmlPageSelectors.ts
//
// Memoized selectors for the htmlPages slice.

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store.types";
import {
  selectHtmlPagesById,
  selectHtmlPageOrder,
  selectHtmlPageListStatus,
  selectHtmlPageListError,
  selectActivePageId,
  selectHtmlPageOpStatus,
} from "@/lib/redux/slices/htmlPagesSlice";
import type { HtmlPageRecord } from "@/features/artifacts/types";

// Re-export base selectors for convenience
export {
  selectHtmlPageListStatus,
  selectHtmlPageListError,
  selectActivePageId,
  selectHtmlPageOpStatus,
};

/** All HTML pages as an ordered array (sorted by updatedAt/createdAt desc). */
export const selectAllHtmlPages = createSelector(
  selectHtmlPagesById,
  selectHtmlPageOrder,
  (byId, order): HtmlPageRecord[] =>
    order.map((id) => byId[id]).filter(Boolean) as HtmlPageRecord[],
);

/** Single page by ID. */
export const selectHtmlPageById = (
  state: RootState,
  id: string,
): HtmlPageRecord | undefined => selectHtmlPagesById(state)[id];

/** The currently active page (open in the editor overlay). */
export const selectActivePage = createSelector(
  selectHtmlPagesById,
  selectActivePageId,
  (byId, activeId): HtmlPageRecord | null =>
    activeId ? (byId[activeId] ?? null) : null,
);

/** Total count of published pages. */
export const selectHtmlPageCount = createSelector(
  selectHtmlPageOrder,
  (order) => order.length,
);

/** Published pages only (have a URL). */
export const selectPublishedHtmlPages = createSelector(
  selectAllHtmlPages,
  (pages) => pages.filter((p) => Boolean(p.url)),
);

/** Whether the page list is currently loading. */
export const selectHtmlPagesLoading = createSelector(
  selectHtmlPageListStatus,
  (status) => status === "loading",
);

/** Most recently touched page. */
export const selectMostRecentHtmlPage = createSelector(
  selectAllHtmlPages,
  (pages): HtmlPageRecord | undefined => pages[0],
);

/** Find a page linked to a specific artifact. */
export const selectHtmlPageByArtifactId = createSelector(
  selectAllHtmlPages,
  (_state: RootState, artifactId: string) => artifactId,
  (pages, artifactId): HtmlPageRecord | undefined =>
    pages.find((p) => p.artifactId === artifactId),
);

/** Find a page linked to a source message. */
export const selectHtmlPageBySourceMessageId = createSelector(
  selectAllHtmlPages,
  (_state: RootState, messageId: string) => messageId,
  (pages, messageId): HtmlPageRecord | undefined =>
    pages.find((p) => p.sourceMessageId === messageId),
);

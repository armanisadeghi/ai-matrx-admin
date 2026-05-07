/**
 * features/files/utils/server-search-params.ts
 *
 * Server-side helper that converts a Next.js App Router `searchParams`
 * promise into the prop shape `<PageShell/>` expects. Used by every
 * route under `/files/**` so the URL → state hydration stays
 * consistent and the routes themselves stay one-liners.
 *
 * Designed to fail-soft: a missing `searchParams` (older callers) or
 * malformed values yield an empty patch + null active file id rather
 * than throwing — the user lands on the cleanest possible default view.
 */

import type { UiState } from "@/features/files/types";
import { parseParamsToUiPatch } from "./url-state";

/** Shape of the awaited `searchParams` Next.js App Router gives us. */
export type ServerSearchParams = Record<string, string | string[] | undefined>;

export interface FilesUiHydrationProps {
  initialUiPatch: Partial<UiState>;
  initialFileId: string | null;
}

/**
 * Convert an awaited `searchParams` record into the `initialUiPatch` +
 * `initialFileId` props for `<PageShell/>`. Pass the value AFTER
 * `await searchParams` — this helper is sync.
 *
 *   const sp = await searchParams;
 *   const { initialUiPatch, initialFileId } = readFilesUiFromParams(sp);
 *   return <PageShell initialUiPatch={initialUiPatch} initialFileId={initialFileId} ... />;
 */
export function readFilesUiFromParams(
  searchParams: ServerSearchParams | undefined,
): FilesUiHydrationProps {
  if (!searchParams) {
    return { initialUiPatch: {}, initialFileId: null };
  }
  const { uiPatch, activeFileId } = parseParamsToUiPatch(searchParams);
  return { initialUiPatch: uiPatch, initialFileId: activeFileId };
}

"use client";

/**
 * useProcessedDocumentPages — the PDF extractor's per-page rows for a processed
 * document, read through THE PDF page reader (`features/pdf/data/pdfPages.ts`,
 * view `pdf_unified_pages`; PDF-PLAN U4). One row per page, 1-based
 * `pageNumber`, raw and cleaned text, section fields, blocks/words for bbox
 * overlays, page image id and geometry.
 *
 * Legacy documents that haven't been re-processed return an empty array;
 * the consuming UI surfaces a "re-extract to populate" CTA in that case.
 */

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { fetchPdfPages, invalidatePdfPages, type PdfPageRow } from "@/features/pdf/data/pdfPages";

interface Args {
  processedDocumentId: string;
  enabled?: boolean;
}

const fetchProcessedDocumentPages = (processedDocumentId: string, userId: string | null) =>
  fetchPdfPages({ processedDocumentId }, userId);

/**
 * Drop the cached per-page rows for `processedDocumentId` after a re-extract /
 * re-clean / re-chunk so the next read sees fresh state. No arg = evict all.
 */
export function invalidateProcessedDocumentPages(processedDocumentId?: string): void {
  invalidatePdfPages(processedDocumentId == null ? undefined : { processedDocumentId });
}

const EMPTY_PAGES: PdfPageRow[] = [];

export function useProcessedDocumentPages({
  processedDocumentId,
  enabled = true,
}: Args): {
  pages: PdfPageRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const userId = useAppSelector(selectUserId);
  // Pages are stored WITH the doc they belong to: after a doc switch the old
  // doc's rows are never returned under the new doc (derived at render, so
  // there is no frame where they show).
  const [loaded, setLoaded] = useState<{ docId: string; pages: PdfPageRow[] } | null>(null);
  const pages = loaded && loaded.docId === processedDocumentId ? loaded.pages : EMPTY_PAGES;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Exposed `refresh()` is the explicit "give me fresh data" lever — bust
  // the cache before re-running, otherwise the new effect hits the 30s
  // entry and returns stale rows. The initial mount effect intentionally
  // does NOT invalidate (it relies on the cache for the dedup win).
  const refresh = useCallback(() => {
    if (processedDocumentId) {
      invalidateProcessedDocumentPages(processedDocumentId);
    }
    setRefreshKey((k) => k + 1);
  }, [processedDocumentId]);

  useEffect(() => {
    if (!enabled || !processedDocumentId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    // A switch to another doc must not show the previous doc's pages while loading.
    setLoaded((prev) => (prev && prev.docId !== processedDocumentId ? null : prev));

    (async () => {
      try {
        const result = await fetchProcessedDocumentPages(
          processedDocumentId,
          userId,
        );
        if (cancelled) return;
        setLoaded({ docId: processedDocumentId, pages: result });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load pages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [processedDocumentId, enabled, refreshKey, userId]);

  return { pages, loading, error, refresh };
}

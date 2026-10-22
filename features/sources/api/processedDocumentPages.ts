/**
 * Source portions — one `docproc.processed_document_pages` row per portion of a
 * Source of ANY kind (web page, transcript, scrape, document), keyed by
 * processed document. Moved here from the PDF extractor (PDF-PLAN U4): PDF
 * surfaces read pages through `features/pdf/data/pdfPages.ts` (the view
 * `pdf_unified_pages`); this module serves the Source studio, which shows
 * portions of every Source kind. Allow-listed in `pnpm check:pdf-one-page-reader`.
 *
 * `page_number` is 1-based. Rows carry raw/cleaned text, section fields,
 * blocks/words for bbox overlays, the page image id and the page geometry.
 */

import { supabase } from "@/utils/supabase/client";
import { docprocDb } from "@/utils/supabase/docprocDb";

export interface SourcePortionRow {
  id: string;
  pageIndex: number;
  pageNumber: number;
  width: number | null;
  height: number | null;
  rotation: number | null;
  rawText: string;
  rawCharCount: number;
  cleanedText: string;
  cleanedCharCount: number;
  sectionKind: string | null;
  sectionTitle: string | null;
  isContinuation: boolean;
  usedOcr: boolean;
  extractionMethod: string | null;
  extractionConfidence: number | null;
  blocks: unknown[] | null;
  words: unknown[] | null;
  imageCldFileId: string | null;
  imageDpi: number | null;
}

function rowFromApi(row: Record<string, unknown>): SourcePortionRow {
  return {
    id: row.id as string,
    pageIndex: (row.page_index as number) ?? 0,
    pageNumber: (row.page_number as number) ?? 0,
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    rotation: (row.rotation as number | null) ?? null,
    rawText: (row.raw_text as string) ?? "",
    rawCharCount: (row.raw_char_count as number) ?? 0,
    cleanedText: (row.cleaned_text as string) ?? "",
    cleanedCharCount: (row.cleaned_char_count as number) ?? 0,
    sectionKind: (row.section_kind as string | null) ?? null,
    sectionTitle: (row.section_title as string | null) ?? null,
    isContinuation: (row.is_continuation as boolean) ?? false,
    usedOcr: (row.used_ocr as boolean) ?? false,
    extractionMethod: (row.extraction_method as string | null) ?? null,
    extractionConfidence: (row.extraction_confidence as number | null) ?? null,
    blocks: (row.blocks as unknown[] | null) ?? null,
    words: (row.words as unknown[] | null) ?? null,
    imageCldFileId: (row.image_cld_file_id as string | null) ?? null,
    imageDpi: (row.image_dpi as number | null) ?? null,
  };
}

// ─── Module-scoped fetch dedup + short cache ─────────────────────────────────
//
// The PDF studio remounts when navigating between `/tools/pdf-extractor`
// and `/tools/pdf-extractor/[id]`, so every doc-pick fires the per-page
// SELECT twice — once on the parent shell, once on the parameterized
// child. Multiple surfaces (PdfStudioShell, SyncedPdfTextView) also call
// the hook simultaneously for the same docId, doubling that again.
//
// Same shape as the `fetchProcessedDocument` dedup shipped in `76923f146`:
// an in-flight `Map<key, Promise>` so concurrent callers share one
// Supabase round-trip, plus a small resolved cache so a fresh result is
// reused for `FETCH_PAGES_CACHE_TTL_MS`. The key includes `userId` so a
// session switch can't reuse the previous user's rows.

const FETCH_PAGES_CACHE_TTL_MS = 30_000;

interface PagesCacheEntry {
  resolvedAt: number;
  pages: SourcePortionRow[];
}

const fetchPagesInflight = new Map<string, Promise<SourcePortionRow[]>>();
const fetchPagesCache = new Map<string, PagesCacheEntry>();

function fetchPagesCacheKey(
  processedDocumentId: string,
  userId: string | null,
): string {
  return `${userId ?? "<none>"}:${processedDocumentId}`;
}

export async function fetchProcessedDocumentPages(
  processedDocumentId: string,
  userId: string | null,
): Promise<SourcePortionRow[]> {
  const key = fetchPagesCacheKey(processedDocumentId, userId);

  const cached = fetchPagesCache.get(key);
  if (cached && Date.now() - cached.resolvedAt < FETCH_PAGES_CACHE_TTL_MS) {
    return cached.pages;
  }

  const existing = fetchPagesInflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    // Pages have no lifecycle column — they follow their parent doc. Guard the
    // parent so a soft-deleted/archived doc's pages never render (defense in
    // depth on top of the gated resolvers upstream).
    const { data: parentDoc, error: parentError } = await docprocDb(supabase)
      .from("processed_documents")
      .select("id")
      .eq("id", processedDocumentId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();
    if (parentError) throw parentError;
    if (!parentDoc) return [];
    const { data, error } = await docprocDb(supabase)
      .from("processed_document_pages")
      .select(
        "id, page_index, page_number, width, height, rotation, raw_text, raw_char_count, cleaned_text, cleaned_char_count, section_kind, section_title, is_continuation, used_ocr, extraction_method, extraction_confidence, blocks, words, image_cld_file_id, image_dpi",
      )
      .eq("processed_document_id", processedDocumentId)
      .order("page_index", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(rowFromApi);
  })()
    .then((pages) => {
      // Evicted by an invalidation while in flight = read predates the write.
      if (fetchPagesInflight.get(key) === promise) {
        fetchPagesCache.set(key, { resolvedAt: Date.now(), pages });
      }
      return pages;
    })
    .finally(() => {
      if (fetchPagesInflight.get(key) === promise) {
        fetchPagesInflight.delete(key);
      }
    });

  fetchPagesInflight.set(key, promise);
  return promise;
}

/**
 * Drop the cached per-page rows for `processedDocumentId`. Call after a
 * re-extract / re-clean / re-chunk that rewrites `processed_document_pages`
 * so the next read sees the fresh state instead of the 30s-stale cache.
 *
 * Pass no args to evict everything (e.g. on sign-out / user switch).
 */
export function invalidateProcessedDocumentPages(
  processedDocumentId?: string,
): void {
  if (processedDocumentId == null) {
    fetchPagesCache.clear();
    fetchPagesInflight.clear();
    return;
  }
  for (const key of fetchPagesCache.keys()) {
    if (key.endsWith(`:${processedDocumentId}`)) {
      fetchPagesCache.delete(key);
    }
  }
  for (const key of fetchPagesInflight.keys()) {
    if (key.endsWith(`:${processedDocumentId}`)) {
      fetchPagesInflight.delete(key);
    }
  }
}


/**
 * THE PDF page reader (PDF-PLAN U4). Every PDF surface reads pages here, from
 * the view `public.pdf_unified_pages`, never from `docproc.processed_document_pages`
 * directly (guard: `pnpm check:pdf-one-page-reader`).
 *
 * The view is driven from `files.pages` — the one authoritative page map — so a
 * PDF read by file shows every live page in its current order, rotation and
 * status, including pages with no extraction yet (`hasExtraction: false`).
 * A read by processed document also covers PDF extractions no file page owns
 * (scans, re-extractions): those rows have `fileId: null`.
 *
 * Non-PDF Sources (web pages, transcripts, scrapes) read their portions through
 * `features/sources/api/processedDocumentPages.ts`; that is not this reader's job.
 */

import { supabase } from "@/utils/supabase/client";
import { docprocDb } from "@/utils/supabase/docprocDb";
import type { Database } from "@/types/database.types";

type ViewRow = Database["public"]["Views"]["pdf_unified_pages"]["Row"];

export interface PdfPageRow {
  /** Extraction page id when extracted, else the file page id. */
  id: string;
  pageIndex: number;
  /** 1-based position in the current file (file pages) or in the extraction. */
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
  /** Page-map fields; null for extraction-only rows. */
  fileId: string | null;
  filePageId: string | null;
  sourcePageIndex: number;
  userStatus: string | null;
  userRotation: number | null;
  hasExtraction: boolean;
}

export type PdfPagesKey = { fileId: string } | { processedDocumentId: string };

const COLUMNS =
  "page_id, file_page_id, file_id, processed_document_id, page_index, page_number, source_page_index, width, height, extract_rotation, raw_text, raw_char_count, cleaned_text, cleaned_char_count, section_kind, section_title, is_continuation, used_ocr, extraction_method, extraction_confidence, blocks, words, image_cld_file_id, image_dpi, user_status, user_rotation, has_extraction";

function rowFromView(row: Partial<ViewRow>, i: number): PdfPageRow {
  const pageIndex = row.page_index ?? i;
  return {
    id: row.page_id ?? row.file_page_id ?? `${row.file_id ?? row.processed_document_id}:${pageIndex}`,
    pageIndex,
    pageNumber: row.page_number ?? pageIndex + 1,
    width: row.width ?? null,
    height: row.height ?? null,
    rotation: row.extract_rotation ?? null,
    rawText: row.raw_text ?? "",
    rawCharCount: row.raw_char_count ?? 0,
    cleanedText: row.cleaned_text ?? "",
    cleanedCharCount: row.cleaned_char_count ?? 0,
    sectionKind: row.section_kind ?? null,
    sectionTitle: row.section_title ?? null,
    isContinuation: row.is_continuation ?? false,
    usedOcr: row.used_ocr ?? false,
    extractionMethod: row.extraction_method ?? null,
    extractionConfidence: row.extraction_confidence ?? null,
    blocks: (row.blocks as unknown[] | null) ?? null,
    words: (row.words as unknown[] | null) ?? null,
    imageCldFileId: row.image_cld_file_id ?? null,
    imageDpi: row.image_dpi ?? null,
    fileId: row.file_id ?? null,
    filePageId: row.file_page_id ?? null,
    sourcePageIndex: row.source_page_index ?? pageIndex,
    userStatus: row.user_status ?? null,
    userRotation: row.user_rotation ?? null,
    hasExtraction: row.has_extraction ?? false,
  };
}

function keyColumn(key: PdfPagesKey): ["file_id" | "processed_document_id", string] {
  return "fileId" in key ? ["file_id", key.fileId] : ["processed_document_id", key.processedDocumentId];
}

function keyString(key: PdfPagesKey): string {
  const [col, id] = keyColumn(key);
  return `${col}:${id}`;
}

/** A soft-deleted or archived processed document's pages never render. */
async function processedDocumentIsLive(processedDocumentId: string): Promise<boolean> {
  const { data, error } = await docprocDb(supabase)
    .from("processed_documents")
    .select("id")
    .eq("id", processedDocumentId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// Concurrent callers share one round trip; a resolved read is reused briefly.
// The key carries the user so a session switch never reuses another person's rows.
const CACHE_TTL_MS = 30_000;
const inflight = new Map<string, Promise<PdfPageRow[]>>();
const cache = new Map<string, { resolvedAt: number; pages: PdfPageRow[] }>();

export async function fetchPdfPages(key: PdfPagesKey, userId: string | null): Promise<PdfPageRow[]> {
  const cacheKey = `${userId ?? "<none>"}:${keyString(key)}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.resolvedAt < CACHE_TTL_MS) return hit.pages;
  const running = inflight.get(cacheKey);
  if (running) return running;

  const promise = (async () => {
    if ("processedDocumentId" in key && !(await processedDocumentIsLive(key.processedDocumentId))) {
      return [];
    }
    const [col, id] = keyColumn(key);
    const { data, error } = await supabase
      .from("pdf_unified_pages")
      .select(COLUMNS)
      .eq(col, id)
      .order("page_index", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as Partial<ViewRow>[]).map(rowFromView);
  })()
    .then((pages) => {
      if (inflight.get(cacheKey) === promise) cache.set(cacheKey, { resolvedAt: Date.now(), pages });
      return pages;
    })
    .finally(() => {
      if (inflight.get(cacheKey) === promise) inflight.delete(cacheKey);
    });
  inflight.set(cacheKey, promise);
  return promise;
}

/** Drop cached pages for one key (after a re-extract or page change), or all. */
export function invalidatePdfPages(key?: PdfPagesKey): void {
  if (!key) {
    cache.clear();
    inflight.clear();
    return;
  }
  const suffix = `:${keyString(key)}`;
  for (const k of [...cache.keys()]) if (k.endsWith(suffix)) cache.delete(k);
  for (const k of [...inflight.keys()]) if (k.endsWith(suffix)) inflight.delete(k);
}

/** Page count for a key; `cleanedOnly` counts pages the cleanup has written. */
export async function countPdfPages(key: PdfPagesKey, opts: { cleanedOnly?: boolean } = {}): Promise<number> {
  const [col, id] = keyColumn(key);
  let query = supabase.from("pdf_unified_pages").select("file_page_id", { count: "exact", head: true }).eq(col, id);
  // cleaned_text is NOT NULL (default ''): cleaned_char_count is 0 until the cleanup writes the page.
  if (opts.cleanedOnly) query = query.gt("cleaned_char_count", 0);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** First page's extracted text, or null when there is none yet. */
export async function fetchFirstPdfPageText(key: PdfPagesKey): Promise<string | null> {
  const [col, id] = keyColumn(key);
  const { data, error } = await supabase
    .from("pdf_unified_pages")
    .select("raw_text")
    .eq(col, id)
    .order("page_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.raw_text ?? null;
}

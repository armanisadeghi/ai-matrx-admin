/**
 * features/pdf/workspace/pdfOps.ts — how each workspace tool becomes server calls. Pure.
 *
 * `@ai-matrx/office/pdf` owns the chrome and names what a person asked for (`PdfRunRequest`); this
 * file is the app's side: the one place a request becomes `/utilities/pdf/*` calls. Sources are
 * built ONLY with `buildPdfSourceFromFileId` (the `media.file_id` keystone). Page operations that
 * change the file itself save a NEW VERSION (`output_mode: "replace"`, prior bytes archived, so the
 * file's version history is the durable undo); everything that makes something else (extract, split,
 * crop, redact, compress) makes a NEW FILE with lineage (`output_mode: "derivative"`) and never
 * touches the original.
 */
import type { PdfRunRequest } from "@ai-matrx/office/pdf-model";
import { buildPdfSourceFromFileId } from "../utils/source";

export type PdfCall =
  | { kind: "json"; endpoint: "rotatePages" | "deletePages" | "reorderPages" | "extractPages" | "split" | "cropPages" | "redactPattern"; body: Record<string, unknown>; result: "replaced" | "file" }
  | { kind: "stream-text"; body: Record<string, unknown> }
  | { kind: "stream-tables"; body: Record<string, unknown> }
  | { kind: "compress"; level: number };

const SUMMARY = {
  rotate: "Rotated pages in the PDF workspace",
  delete: "Deleted pages in the PDF workspace",
  reorder: "Reordered pages in the PDF workspace",
} as const;

/** Sorted, de-duplicated 1-based pages as runs of consecutive pages: [1,2,3,5] -> 1-3, 5-5. */
export function contiguousRuns(pages: readonly number[]): Array<{ start: number; end: number }> {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const runs: Array<{ start: number; end: number }> = [];
  for (const p of sorted) {
    const last = runs[runs.length - 1];
    if (last && p === last.end + 1) last.end = p;
    else runs.push({ start: p, end: p });
  }
  return runs;
}

/** The server calls for one request, in the order they must run. */
export function callsFor(fileId: string, request: PdfRunRequest): PdfCall[] {
  const src = buildPdfSourceFromFileId(fileId);
  switch (request.tool) {
    case "apply-pages":
      return request.ops.map((op): PdfCall => {
        if (op.kind === "rotate") {
          return { kind: "json", endpoint: "rotatePages", result: "replaced", body: { ...src, pages: op.pages, rotation: op.rotation, output_mode: "replace", change_summary: SUMMARY.rotate } };
        }
        if (op.kind === "delete") {
          return { kind: "json", endpoint: "deletePages", result: "replaced", body: { ...src, pages: op.pages, output_mode: "replace", change_summary: SUMMARY.delete } };
        }
        return { kind: "json", endpoint: "reorderPages", result: "replaced", body: { ...src, new_order: op.newOrder, output_mode: "replace", change_summary: SUMMARY.reorder } };
      });
    case "extract-pages":
      return [{ kind: "json", endpoint: "extractPages", result: "file", body: { ...src, pages: request.pages, output_mode: "derivative" } }];
    case "split":
      return [{ kind: "json", endpoint: "split", result: "file", body: { ...src, max_pages_per_part: request.maxPagesPerPart, output_mode: "derivative" } }];
    case "crop":
      return [{ kind: "json", endpoint: "cropPages", result: "file", body: { ...src, pages: request.pages, crop_box: request.box, output_mode: "derivative" } }];
    case "redact":
      return [{ kind: "json", endpoint: "redactPattern", result: "file", body: { ...src, pattern: request.pattern, reason: request.reason, output_mode: "derivative" } }];
    case "compress":
      return [{ kind: "compress", level: request.level }];
    case "extract-text": {
      // The Pages field: the server reads a contiguous slice (page_start..page_end), so "1-3, 5" is two calls.
      const pages = (request as { pages?: number[] }).pages;
      if (!pages || pages.length === 0) return [{ kind: "stream-text", body: { ...src } }];
      return contiguousRuns(pages).map((r): PdfCall => ({ kind: "stream-text", body: { ...src, page_start: r.start, page_end: r.end } }));
    }
    case "extract-tables":
      return [{ kind: "stream-tables", body: { ...src, output_format: "csv" } }];
  }
}

/** The new file's id in a persisted-output response (`derivative` and `replace` both carry `file_id`). */
export function fileIdOf(response: unknown): string | null {
  if (response && typeof response === "object") {
    const direct = (response as { file_id?: unknown }).file_id;
    if (typeof direct === "string") return direct;
    // A split answers with its parts.
    const parts = (response as { parts?: unknown; files?: unknown }).parts ?? (response as { files?: unknown }).files;
    if (Array.isArray(parts) && parts[0] && typeof (parts[0] as { file_id?: unknown }).file_id === "string") {
      return (parts[0] as { file_id: string }).file_id;
    }
  }
  return null;
}

// ── Regions, images and OCR (server operations with no other UI: drawn-region redaction, page images, OCR as text). ──
// scrub / strip-metadata / flatten / compress / split already live in the Analysis tool's Doc Ops tab.

export type CleanupOp =
  | { op: "redact-regions"; regions: RedactRegion[]; reason: string; scrubMetadata: boolean }
  | { op: "render-all"; dpi: number; fmt: "png" | "jpg" | "jpeg" | "webp" | "tiff"; jpegQuality: number; pages: number[] | null }
  | { op: "ocr-text"; threshold: number };

export interface RedactRegion {
  page_number: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  replacement: "BLOCK" | "REMOVE";
  preserve_text: boolean;
}

export type CleanupCall =
  /** Makes a NEW FILE with lineage; the original is untouched. */
  | { kind: "file"; endpoint: "redactRegions"; body: Record<string, unknown> }
  /** Returns bytes (a ZIP of page images) the person saves. */
  | { kind: "zip"; endpoint: "renderAll"; body: Record<string, unknown> }
  /** Streams text, forcing OCR on every page. */
  | { kind: "ocr"; body: Record<string, unknown> };

/** How one clean-up request becomes a server call. Sources are built ONLY with `buildPdfSourceFromFileId`. */
export function cleanupCallFor(fileId: string, request: CleanupOp): CleanupCall {
  const src = buildPdfSourceFromFileId(fileId);
  switch (request.op) {
    case "redact-regions":
      return { kind: "file", endpoint: "redactRegions", body: { ...src, regions: request.regions, reason: request.reason, scrub_metadata: request.scrubMetadata, output_mode: "derivative" } };
    case "render-all":
      return { kind: "zip", endpoint: "renderAll", body: { ...src, dpi: request.dpi, fmt: request.fmt, jpeg_quality: request.jpegQuality, ...(request.pages ? { pages: request.pages } : {}) } };
    case "ocr-text":
      return { kind: "ocr", body: { ...src, force_ocr: true, use_ocr_threshold: request.threshold, include_page_metadata: false } };
  }
}

// ── Combine and insert (merge this file with others; splice pages of another file into this one) ──

export interface CombineSource {
  fileId: string;
  /** Pages of that file to use (1-based). Null: all of them. */
  pages: number[] | null;
}

export type CombineOp =
  /** This file first, then each source in order, as a NEW FILE. */
  | { op: "merge"; sources: CombineSource[]; filename: string | null }
  /** The pages of `source` placed after `afterPage` of this file (0: at the start), as a NEW FILE. */
  | { op: "insert"; source: CombineSource; afterPage: number };

export type CombineCall = { kind: "file"; endpoint: "merge" | "insertPages"; body: Record<string, unknown> };

/** How a combine request becomes its one server call. Every file goes in by id (`media.file_id`); the original is never touched. */
export function combineCallFor(fileId: string, request: CombineOp): CombineCall {
  const src = buildPdfSourceFromFileId(fileId);
  if (request.op === "merge") {
    return {
      kind: "file",
      endpoint: "merge",
      body: {
        sources: [src, ...request.sources.map((s) => ({ ...buildPdfSourceFromFileId(s.fileId), ...(s.pages ? { pages: s.pages } : {}) }))],
        output_mode: "derivative",
        ...(request.filename ? { filename: request.filename } : {}),
      },
    };
  }
  return {
    kind: "file",
    endpoint: "insertPages",
    body: {
      ...src,
      source_media: { file_id: request.source.fileId },
      after_page: request.afterPage,
      ...(request.source.pages ? { source_pages: request.source.pages } : {}),
      output_mode: "derivative",
    },
  };
}

// ── Strip repeated regions (headers and footers removed from the extracted text of every page) ──

export interface StripRepeatedOp {
  /** Null: the server's own default. */
  minPagesRatio: number | null;
  minConfidence: number | null;
  acceptedRegionIds: string[] | null;
}

/** The streamed call that returns the text of every page without its repeated regions. */
export function stripRepeatedCallFor(fileId: string, request: StripRepeatedOp): { body: Record<string, unknown> } {
  return {
    body: {
      ...buildPdfSourceFromFileId(fileId),
      ...(request.minPagesRatio !== null ? { min_pages_ratio: request.minPagesRatio } : {}),
      ...(request.minConfidence !== null ? { min_confidence: request.minConfidence } : {}),
      ...(request.acceptedRegionIds && request.acceptedRegionIds.length ? { accepted_region_ids: request.acceptedRegionIds } : {}),
    },
  };
}

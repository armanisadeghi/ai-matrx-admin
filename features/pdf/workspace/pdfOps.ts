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
    case "extract-text":
      return [{ kind: "stream-text", body: { ...src } }];
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

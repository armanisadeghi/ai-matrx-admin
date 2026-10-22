/**
 * Surface manifest — one dropped export (`matrx-user/export-library`), route `/exports/[libraryId]`.
 *
 * An export file the person brought in (a mailbox, a chat history, …) read into a library: what it is,
 * how far indexing has got, the counts the page shows and the filter on the item list. Emitter:
 * `ExportLibraryPage` (`features/exports/components/`). The item rows themselves are the shared list
 * shell's and are not declared here.
 *
 * Parent: Knowledge — bringing an export in is ingestion (domain tree: knowledge › ingestion).
 * READ-ONLY: sending items on is the person's press.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const EXPORT_LIBRARY_SURFACE_NAME = "matrx-user/export-library";

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  autoContext: true,
  typicalCharCount: 30,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("export_library_id", "Export ID", "string", 100, "UUID of the export library (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("export_load_status", "Load status", "string", 110, '"loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 7 }),
  v("export_read_error", "Read error", "string", 115, "Why the export could not be read, or null.", { autoContext: false }),
  v("export_name", "Name", "string", 120, "The export's name."),
  v("export_source", "Source", "string", 130, "What it was exported from (e.g. Gmail, WhatsApp), as detected."),
  v("export_status", "Status", "string", 140, "The library's status as stored.", { autoContext: false }),
  v("export_index_phase", "Indexing", "string", 150, '"idle", "starting", "running", "completed" or "failed".', { typicalCharCount: 9 }),
  v(
    "export_counts",
    "Counts",
    "object",
    160,
    "What the page shows: { indexing, total, filtered, filterDescription, outbound, withAttachments, words, characters } — each count says whether it is final or still counting.",
    { typicalCharCount: 600 },
  ),
  v("export_filter_description", "Filter", "string", 170, "The filter on the item list, in the server's words; empty when unfiltered.", { typicalCharCount: 80 }),
];

const declared: SurfaceManifest = {
  surfaceName: EXPORT_LIBRARY_SURFACE_NAME,
  situation: "They are looking at the export {export_name|they brought in} from {export_source|an outside service} (indexing: {export_index_phase|unknown}).",
  inheritsFrom: "matrx-default/knowledge",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Export library",
  description: "One export the person brought in: what it is, indexing progress and its counts.",
  urlPattern: "/exports/[libraryId]",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
};

export const exportLibraryManifest = declared;

export function createExportLibraryScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

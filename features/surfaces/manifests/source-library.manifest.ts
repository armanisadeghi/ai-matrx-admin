/**
 * Surface manifest — one source library (`matrx-user/source-library`), route `/libraries/[id]`.
 *
 * A catalog of an outside media source (a YouTube channel, a playlist, …): what it is, the metrics
 * that fill in while the catalog streams, and how many jobs it has started. Emitters: `LibraryPage`
 * (provider, the id) and its body (contributes the row and metrics once loaded) in
 * `features/source-library/components/LibraryPage.tsx`. The sources table is the shared list shell's.
 *
 * Parent: Media (domain tree: media › media-source-catalog).
 * READ-ONLY: the server Actions on a selection (transcribe, …) start paid jobs and stay the person's press.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const SOURCE_LIBRARY_SURFACE_NAME = "matrx-user/source-library";

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
  v("source_library_id", "Library ID", "string", 100, "UUID of the library (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("source_library_load_status", "Load status", "string", 110, '"loading", "loaded" or "failed".', { typicalCharCount: 7 }),
  v("source_library_name", "Name", "string", 120, "The library's name (e.g. the channel's name)."),
  v("source_library_source", "Source", "string", 130, "Where it comes from (e.g. youtube)."),
  v("source_library_kind", "Kind", "string", 140, "What kind of source it is (e.g. channel, playlist)."),
  v("source_library_url", "Address", "string", 150, "The source's own web address.", { typicalCharCount: 60 }),
  v("source_library_description", "Description", "string", 160, "The source's description, when it has one.", { autoContext: false, typicalCharCount: 400 }),
  v(
    "source_library_metrics",
    "Metrics",
    "object",
    170,
    "{ total, counts_by_kind, date_range { earliest, latest, span_days }, total_hours, median_seconds }; null until the first metrics read.",
    { typicalCharCount: 300 },
  ),
  v("source_library_job_count", "Jobs", "number", 180, "How many jobs this library has started (transcribe and other Actions).", { typicalCharCount: 3 }),
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: SOURCE_LIBRARY_SURFACE_NAME,
  situation: "They are looking at the source library {source_library_name|they opened} ({source_library_source|an outside source}).",
  inheritsFrom: "matrx-default/media",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Source library",
  description: "One catalog of an outside media source: what it is, its metrics and its jobs.",
  urlPattern: "/libraries/[id]",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
};

export const sourceLibraryManifest = declared;

export function createSourceLibraryScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

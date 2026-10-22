/**
 * Surface manifest — one rendered document (`matrx-user/rendered-document`), route `/d/[renderId]`.
 *
 * A document made from a template's wording for one record, frozen at that moment (what a signature
 * on it is over). Emitter: the route page `app/(core)/d/[renderId]/page.tsx`.
 *
 * READ-ONLY: the words are frozen by design. Its custom fields render through the shared
 * `EntityCustomFields` component, which is not this page's own editor and is not declared here.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const RENDERED_DOCUMENT_SURFACE_NAME = "matrx-user/rendered-document";

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
  autoContext: false,
  typicalCharCount: valueType === "number" ? 3 : 36,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("render_id", "Document ID", "string", 100, "UUID of the rendered document (from the address).", { alwaysAvailable: true, autoContext: true }),
  v("document_load_status", "Load status", "string", 110, '"loading", "loaded" or "refused" (no access or no such document).', {
    alwaysAvailable: true,
    autoContext: true,
    typicalCharCount: 8,
  }),
  v("document_body", "Document", "string", 120, "The document's words exactly as rendered (Markdown).", {
    autoContext: true,
    typicalCharCount: 5000,
    inlineUpTo: 10000,
  }),
  v("rendered_at", "Made", "string", 130, "When the document was made.", { autoContext: true, typicalCharCount: 25 }),
  v("document_version", "Wording version", "number", 140, "The version of the template's wording it was made from."),
  v("template_id", "Template ID", "string", 150, "The document template it came from."),
  v("record_id", "Record ID", "string", 160, "The record it was made for."),
  v("document_organization_name", "Organization", "string", 170, "The organization it was made in.", { autoContext: true }),
];

const declared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: RENDERED_DOCUMENT_SURFACE_NAME,
  situation:
    "They are reading a document made {rendered_at|at some point} in {document_organization_name|its organization}; its words are frozen and cannot be changed.",
  inheritsFrom: "matrx-default/content",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Rendered document",
  description: "One document made from a template for a record, frozen as it was made.",
  urlPattern: "/d/[renderId]",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
};

/** No typed `readiness` (D2: earned, never typed). The installed `@ai-matrx/chat` type still
 * requires the key until the D2 package change ships, hence the one cast. */
export const renderedDocumentManifest = declared as SurfaceManifest;

export function createRenderedDocumentScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

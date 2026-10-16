/**
 * features/file-analysis/api/file-analysis.ts
 *
 * REST wrappers for the new file-analysis surface (analysis pipeline, page
 * management, annotations, redaction mask/restore, entities, search,
 * region extraction, server render-with-overlay). Mirrors the
 * `features/files/api/files.ts` style — thin typed wrappers over the
 * shared `client` helpers.
 *
 * Backend routes built in this round and exposed via OpenAPI:
 *   GET    /files/{file_id}/analysis
 *   POST   /files/{file_id}/analysis/refresh
 *   GET    /files/{file_id}/pages
 *   GET    /files/{file_id}/active-pages
 *   GET    /files/{file_id}/pages/{page_id}
 *   POST   /files/{file_id}/pages/{page_id}/exclude
 *   POST   /files/{file_id}/pages/{page_id}/include
 *   POST   /files/{file_id}/pages/{page_id}/rotate
 *   POST   /files/{file_id}/pages/{page_id}/override-text
 *   GET    /files/{file_id}/overrides
 *   GET    /files/{file_id}/annotations
 *   POST   /files/{file_id}/annotations
 *   PUT    /files/{file_id}/annotations/{aid}
 *   DELETE /files/{file_id}/annotations/{aid}
 *   POST   /files/{file_id}/annotations/extract-at-bbox
 *   POST   /files/{file_id}/annotations/snap-bbox
 *   POST   /files/{file_id}/annotations/bulk-from-candidates
 *   GET    /files/{file_id}/annotations/manifest
 *   GET    /annotations/label-catalog
 *   GET    /files/{file_id}/key-findings
 *   GET    /files/{file_id}/entities
 *   POST   /files/{file_id}/entities
 *   PUT    /files/{file_id}/entities/{eid}
 *   DELETE /files/{file_id}/entities/{eid}
 *   POST   /files/{file_id}/entities/find-similar
 *   POST   /files/{file_id}/annotations/{aid}/promote-to-entity
 *   POST   /files/{file_id}/search
 *   POST   /files/{file_id}/regions/extract
 *   POST   /files/{file_id}/render-page-with-overlay
 *   GET    /files/{file_id}/extracted-text
 *   POST   /files/{file_id}/redact/mask
 *   POST   /redact/restore
 *   POST   /redact/sessions/{session_id}/revoke
 *   GET    /redact/escrow/wrapping-key
 *   POST   /redact/escrow/recover
 */

import {
  delJson,
  getJson,
  postJson,
  postNdjson,
  type RequestOptions,
} from "@/lib/python-client";
// Every request about one file carries THAT file's organization (read from the file, never
// the picker) — the same rule as features/files/api/files.ts (VERIFIER-23 #4 sibling census).
import { withFileOrganization } from "@/features/files/api/fileOrganization";
import type { components } from "@ai-matrx/api/types";
import type { TypedStreamEvent } from "@ai-matrx/agents/generated/stream-events";
import { activePagesEndpoint, bulkFromCandidatesEndpoint, createAnnotationEndpoint, createEntityEndpoint, escrowRecover, escrowWrappingKey, excludePageEndpoint, extractAtBboxEndpoint, extractRegionEndpoint, fetchAnalysis, fetchLabelCatalog, findSimilarEndpoint, getPageEndpoint, keyFindingsEndpoint, listEntitiesEndpoint, listOverridesEndpoint, listPagesEndpoint, manifestEndpoint, overridePageTextEndpoint, redactMask, redactRestore, renderPageWithOverlayEndpoint, snapBboxEndpoint, updateAnnotationEndpoint, updateEntityEndpoint } from "@ai-matrx/api/files";
import { serverApi, callOptionsFrom } from "@/lib/api/server-api";
import { createClient } from "@/utils/supabase/client";
import { requireUserId } from "@/utils/auth/getUserId";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { operationFailed } from "@/utils/errors";

// ─── Type re-exports (named locally for callers) ────────────────────────────

type Schemas = components["schemas"];

export type FileAnalysisResponse = Schemas["FileAnalysisResponse"];
export type FileAnalysisHead = Schemas["FileAnalysisHead"];
export type FileAnalysisResultRow = Schemas["FileAnalysisResultRow"];
export type AnalyzeRefreshBody = Schemas["AnalyzeRefreshBody"];

// Typed data events for the analysis-refresh NDJSON stream (2026-07
// stream-everything conversion; the old 202 AnalyzeRefreshResponse is gone):
// import FileAnalysisStartedData / FileDetectorCompletedData /
// FileAnalysisCompleteData from "@ai-matrx/agents/generated/stream-events".

export type AnnotationOut = Schemas["AnnotationOut"];
export type AnnotationCreateBody = Schemas["AnnotationCreateBody"];
export type AnnotationUpdateBody = Schemas["AnnotationUpdateBody"];
export type LabelCatalogResponse = Schemas["LabelCatalogResponse"];
export type LabelCatalogEntry = Schemas["LabelCatalogEntry"];
export type ExtractAtBboxBody = Schemas["ExtractAtBboxBody"];
export type ExtractAtBboxResponse = Schemas["ExtractAtBboxResponse"];
export type SnapBboxBody = Schemas["SnapBboxBody"];
export type SnapBboxResponse = Schemas["SnapBboxResponse"];
export type BulkCandidateBody = Schemas["BulkCandidateBody"];
export type BulkCandidateResponse = Schemas["BulkCandidateResponse"];
export type KeyFindingsResponse = Schemas["KeyFindingsResponse"];
export type ManifestResponse = Schemas["ManifestResponse"];

export type FilePageOut = Schemas["FilePageOut"];
export type FilePageOverrideOut = Schemas["FilePageOverrideOut"];
export type ExcludePageBody = Schemas["ExcludePageBody"];
export type RotatePageBody = Schemas["RotatePageBody"];
export type OverridePageTextBody = Schemas["OverridePageTextBody"];
export type ActivePageIdsResponse = Schemas["ActivePageIdsResponse"];

export type SearchRequest =
  Schemas["aidream__api__routers__file_search__SearchRequest"];

// In-file search also streams now (`file_search_started` →
// N × `file_search_page` → `file_search_complete`); the old blocking
// SearchResponse/SearchHitOut schemas are gone from the OpenAPI spec.
// Import FileSearchPageData / FileSearchCompleteData / FileSearchHitItem
// from "@ai-matrx/agents/generated/stream-events".

export type RegionExtractRequest = Schemas["RegionExtractRequest"];
export type RegionExtractResponse = Schemas["RegionExtractResponse"];

export type RenderRequest = Schemas["RenderRequest"];
export type RenderResponse = Schemas["RenderResponse"];

export type EntityOut = Schemas["EntityOut"];
export type EntityCreateBody = Schemas["EntityCreateBody"];
export type EntityUpdateBody = Schemas["EntityUpdateBody"];
export type FindSimilarBody = Schemas["FindSimilarBody"];
export type FindSimilarResponse = Schemas["FindSimilarResponse"];
export type FindSimilarCandidate = Schemas["FindSimilarCandidate"];

export type ExtractedTextResponse = Schemas["ExtractedTextResponse"];
export type ExtractedTextPageOut = Schemas["ExtractedTextPageOut"];

export type MaskRequestBody = Schemas["MaskRequestBody"];
export type MaskResponse = Schemas["MaskResponse"];
export type RestoreRequestBody = Schemas["RestoreRequestBody"];
export type RestoreResponse =
  Schemas["aidream__api__routers__file_analysis__RestoreResponse"];
export type EscrowWrappingKeyResponse = Schemas["EscrowWrappingKeyResponse"];
export type EscrowRecoverBody = Schemas["EscrowRecoverBody"];
export type EscrowRecoverResponse = Schemas["EscrowRecoverResponse"];

type Result<T> = Promise<{ data: T }>;
const fid = (id: string) => encodeURIComponent(id);

// ─── Analysis ────────────────────────────────────────────────────────────────

export function getAnalysis(
  fileId: string,
  opts: RequestOptions = {},
): Result<FileAnalysisResponse> {
  return fetchAnalysis(serverApi, { path: { file_id: fileId } }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

/**
 * Re-run the detector pipeline. STREAMS per-detector progress (NDJSON):
 * `file_analysis_started` → N × `file_detector_completed` → terminal
 * `file_analysis_complete`, whose `head` + `results` are byte-compatible
 * with the `GET /files/{file_id}/analysis` response — write them straight
 * into the shared cache, never refetch.
 *
 * Caveat: if an analysis for this file is already in flight, the refresh
 * JOINS it — the stream may go straight to the terminal event with no
 * per-detector progress.
 */
export function refreshAnalysisStream(
  fileId: string,
  body: AnalyzeRefreshBody,
  opts: RequestOptions = {},
): AsyncGenerator<TypedStreamEvent, void, void> {
  return postNdjson<AnalyzeRefreshBody>(
    `/files/${fid(fileId)}/analysis/refresh`,
    body,
    withFileOrganization(fileId, opts),
  );
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export function listPages(
  fileId: string,
  opts: RequestOptions = {},
): Result<FilePageOut[]> {
  return listPagesEndpoint(serverApi, { path: { file_id: fileId } }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function getActivePageIds(
  fileId: string,
  opts: RequestOptions = {},
): Result<ActivePageIdsResponse> {
  return activePagesEndpoint(serverApi, { path: { file_id: fileId } }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function getPage(
  fileId: string,
  pageId: string,
  opts: RequestOptions = {},
): Result<FilePageOut> {
  return getPageEndpoint(serverApi, { path: {
      file_id: fileId,
      page_id: pageId,
    } }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function excludePage(
  fileId: string,
  pageId: string,
  body: ExcludePageBody,
  opts: RequestOptions = {},
): Result<FilePageOut> {
  return excludePageEndpoint(serverApi, { path: {
      file_id: fileId,
      page_id: pageId,
    }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function includePage(
  fileId: string,
  pageId: string,
  opts: RequestOptions = {},
): Result<FilePageOut> {
  return postJson<FilePageOut, Record<string, never>>(
    `/files/${fid(fileId)}/pages/${fid(pageId)}/include`,
    {},
    withFileOrganization(fileId, opts),
  );
}

export function rotatePage(
  fileId: string,
  pageId: string,
  body: RotatePageBody,
  opts: RequestOptions = {},
): Result<{ id: string; rotation: number }> {
  return postJson<{ id: string; rotation: number }, RotatePageBody>(
    `/files/${fid(fileId)}/pages/${fid(pageId)}/rotate`,
    body,
    withFileOrganization(fileId, opts),
  );
}

export function overridePageText(
  fileId: string,
  pageId: string,
  body: OverridePageTextBody,
  opts: RequestOptions = {},
): Result<FilePageOverrideOut> {
  return overridePageTextEndpoint(serverApi, { path: {
      file_id: fileId,
      page_id: pageId,
    }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function listOverrides(
  fileId: string,
  opts: RequestOptions = {},
): Result<FilePageOverrideOut[]> {
  return listOverridesEndpoint(serverApi, { path: { file_id: fileId } }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

// ─── Annotations ─────────────────────────────────────────────────────────────

export function listAnnotations(
  fileId: string,
  params: {
    labelCategory?: string;
    pageNumber?: number;
    includeRejected?: boolean;
  } = {},
  opts: RequestOptions = {},
): Result<AnnotationOut[]> {
  const qs: string[] = [];
  if (params.labelCategory)
    qs.push(`label_category=${encodeURIComponent(params.labelCategory)}`);
  if (params.pageNumber !== undefined)
    qs.push(`page_number=${params.pageNumber}`);
  if (params.includeRejected) qs.push("include_rejected=true");
  const q = qs.length ? `?${qs.join("&")}` : "";
  return getJson<AnnotationOut[]>(
    `/files/${fid(fileId)}/annotations${q}`,
    withFileOrganization(fileId, opts),
  );
}

export function createAnnotation(
  fileId: string,
  body: AnnotationCreateBody,
  opts: RequestOptions = {},
): Result<AnnotationOut> {
  return createAnnotationEndpoint(serverApi, { path: { file_id: fileId }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function updateAnnotation(
  fileId: string,
  annotationId: string,
  body: AnnotationUpdateBody,
  opts: RequestOptions = {},
): Result<AnnotationOut> {
  return updateAnnotationEndpoint(serverApi, { path: {
      file_id: fileId,
      annotation_id: annotationId,
    }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function deleteAnnotation(
  fileId: string,
  annotationId: string,
  opts: RequestOptions = {},
): Result<null> {
  return delJson<null>(
    `/files/${fid(fileId)}/annotations/${fid(annotationId)}`,
    withFileOrganization(fileId, opts),
  );
}

export function extractAtBbox(
  fileId: string,
  body: ExtractAtBboxBody,
  opts: RequestOptions = {},
): Result<ExtractAtBboxResponse> {
  return extractAtBboxEndpoint(serverApi, { path: {
      file_id: fileId,
    }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function snapBbox(
  fileId: string,
  body: SnapBboxBody,
  opts: RequestOptions = {},
): Result<SnapBboxResponse> {
  return snapBboxEndpoint(serverApi, { path: { file_id: fileId }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function bulkFromCandidates(
  fileId: string,
  body: BulkCandidateBody,
  opts: RequestOptions = {},
): Result<BulkCandidateResponse> {
  return bulkFromCandidatesEndpoint(serverApi, { path: {
      file_id: fileId,
    }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function getKeyFindings(
  fileId: string,
  opts: RequestOptions = {},
): Result<KeyFindingsResponse> {
  return keyFindingsEndpoint(serverApi, { path: { file_id: fileId } }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function getAnnotationManifest(
  fileId: string,
  opts: RequestOptions = {},
): Result<ManifestResponse> {
  return manifestEndpoint(serverApi, { path: { file_id: fileId } }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

// ─── Label catalog ───────────────────────────────────────────────────────────

export interface AnalysisPreferences {
  per_detector_enabled: Record<string, boolean>;
  default_tier_per_detector: Record<string, string>;
  default_redaction_mode: string;
}

/** Detector preferences — read and written straight in Postgres
 *  (`users.user_analysis_preferences`, row-level security = the caller's own row).
 *  The Python server is not involved. */
const DEFAULT_PREFS: AnalysisPreferences = {
  per_detector_enabled: {},
  default_tier_per_detector: {},
  default_redaction_mode: "reversible",
};

export async function getAnalysisPreferences(
  _opts: RequestOptions = {},
): Result<AnalysisPreferences> {
  const { data, error } = await createClient()
    .schema("users")
    .from("user_analysis_preferences")
    .select("per_detector_enabled, default_tier_per_detector, default_redaction_mode")
    .eq("user_id", requireUserId())
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (error) throw operationFailed("load your detector preferences", error);
  if (!data) return { data: { ...DEFAULT_PREFS } };
  return {
    data: {
      per_detector_enabled: (data.per_detector_enabled ?? {}) as Record<string, boolean>,
      default_tier_per_detector: (data.default_tier_per_detector ?? {}) as Record<string, string>,
      default_redaction_mode: data.default_redaction_mode || "reversible",
    },
  };
}

export async function putAnalysisPreferences(
  body: AnalysisPreferences,
  _opts: RequestOptions = {},
): Result<AnalysisPreferences & { status: string }> {
  const userId = requireUserId();
  const table = createClient().schema("users").from("user_analysis_preferences");
  const updates = {
    per_detector_enabled: body.per_detector_enabled,
    default_tier_per_detector: body.default_tier_per_detector,
    default_redaction_mode: body.default_redaction_mode,
  };
  const existing = await table.select("id").eq("user_id", userId).is("deleted_at", null).limit(1).maybeSingle();
  if (existing.error) throw operationFailed("save your detector preferences", existing.error);
  if (existing.data) {
    const { error } = await table.update(updates).eq("id", existing.data.id);
    if (error) throw operationFailed("save your detector preferences", error);
  } else {
    // Every insert names its organization; nothing chooses one for it.
    const { error } = await table.insert({
      ...updates,
      user_id: userId,
      created_by: userId,
      organization_id: await ensureOrgId(null),
    } as never);
    if (error) throw operationFailed("save your detector preferences", error);
  }
  return { data: { ...updates, status: "saved" } };
}

export function getLabelCatalog(
  opts: RequestOptions = {},
): Result<LabelCatalogResponse> {
  return fetchLabelCatalog(serverApi, {}, callOptionsFrom(opts)).then((data) => ({ data }));
}

// ─── Entities ────────────────────────────────────────────────────────────────

export function listEntities(
  fileId: string,
  opts: RequestOptions = {},
): Result<EntityOut[]> {
  return listEntitiesEndpoint(serverApi, { path: { file_id: fileId } }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function createEntity(
  fileId: string,
  body: EntityCreateBody,
  opts: RequestOptions = {},
): Result<EntityOut> {
  return createEntityEndpoint(serverApi, { path: { file_id: fileId }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function updateEntity(
  fileId: string,
  entityId: string,
  body: EntityUpdateBody,
  opts: RequestOptions = {},
): Result<EntityOut> {
  return updateEntityEndpoint(serverApi, { path: {
      file_id: fileId,
      entity_id: entityId,
    }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function deleteEntity(
  fileId: string,
  entityId: string,
  opts: RequestOptions = {},
): Result<null> {
  return delJson<null>(`/files/${fid(fileId)}/entities/${fid(entityId)}`, withFileOrganization(fileId, opts));
}

export function findSimilar(
  fileId: string,
  body: FindSimilarBody,
  opts: RequestOptions = {},
): Result<FindSimilarResponse> {
  return findSimilarEndpoint(serverApi, { path: { file_id: fileId }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function promoteAnnotationToEntity(
  fileId: string,
  annotationId: string,
  opts: RequestOptions = {},
): Result<EntityOut> {
  return postJson<EntityOut, Record<string, never>>(
    `/files/${fid(fileId)}/annotations/${fid(annotationId)}/promote-to-entity`,
    {},
    withFileOrganization(fileId, opts),
  );
}

// ─── Search / region / render ───────────────────────────────────────────────

/**
 * Search inside a file. STREAMS results per page (NDJSON):
 * `file_search_started` → N × `file_search_page` (hits per scanned page) →
 * terminal `file_search_complete` with the full hit list + `truncated`.
 */
export function searchInFileStream(
  fileId: string,
  body: SearchRequest,
  opts: RequestOptions = {},
): AsyncGenerator<TypedStreamEvent, void, void> {
  return postNdjson<SearchRequest>(`/files/${fid(fileId)}/search`, body, withFileOrganization(fileId, opts));
}

export function extractRegion(
  fileId: string,
  body: RegionExtractRequest,
  opts: RequestOptions = {},
): Result<RegionExtractResponse> {
  return extractRegionEndpoint(serverApi, { path: { file_id: fileId }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function renderPageWithOverlay(
  fileId: string,
  body: RenderRequest,
  opts: RequestOptions = {},
): Result<RenderResponse> {
  return renderPageWithOverlayEndpoint(serverApi, { path: {
      file_id: fileId,
    }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

// ─── Extracted text (Knowledge-ready) ─────────────────────────────────────────────

export function getExtractedText(
  fileId: string,
  params: { includeExcluded?: boolean; includeOverrides?: boolean } = {},
  opts: RequestOptions = {},
): Result<ExtractedTextResponse> {
  const qs: string[] = [];
  if (params.includeExcluded) qs.push("include_excluded=true");
  if (params.includeOverrides === false) qs.push("include_overrides=false");
  const q = qs.length ? `?${qs.join("&")}` : "";
  return getJson<ExtractedTextResponse>(
    `/files/${fid(fileId)}/extracted-text${q}`,
    withFileOrganization(fileId, opts),
  );
}

// ─── Reversible redaction ───────────────────────────────────────────────────

export function maskFile(
  fileId: string,
  body: MaskRequestBody,
  opts: RequestOptions = {},
): Result<MaskResponse> {
  return redactMask(serverApi, { path: { file_id: fileId }, body: body }, callOptionsFrom(withFileOrganization(fileId, opts))).then((data) => ({ data }));
}

export function restoreText(
  body: RestoreRequestBody,
  opts: RequestOptions = {},
): Result<RestoreResponse> {
  return redactRestore(serverApi, { body: body }, callOptionsFrom(opts)).then((data) => ({ data }));
}

export function revokeSession(
  sessionId: string,
  opts: RequestOptions = {},
): Result<null> {
  return postJson<null, Record<string, never>>(
    `/redact/sessions/${fid(sessionId)}/revoke`,
    {},
    opts,
  );
}

// ─── Key escrow (org recovery, D31) ─────────────────────────────────────────

/** Escrow KMS RSA public key for CLIENT-side session-key wrapping. */
export function getEscrowWrappingKey(
  opts: RequestOptions = {},
): Result<EscrowWrappingKeyResponse> {
  return escrowWrappingKey(serverApi, {}, callOptionsFrom(opts)).then((data) => ({ data }));
}

/** Org-authorized, audit-logged KMS unwrap of an escrowed session key. */
export function recoverEscrowedKey(
  body: EscrowRecoverBody,
  opts: RequestOptions = {},
): Result<EscrowRecoverResponse> {
  return escrowRecover(serverApi, { body: body }, callOptionsFrom(opts)).then((data) => ({ data }));
}

/**
 * Typed client for the video studio's server doors (aidream `/video-projects` + the social words door).
 * Every call names the brand's organization. Reads of lists go direct to Supabase (`./service`).
 */

import { BackendApiError } from "@ai-matrx/api";

import { getJson, postJson } from "@/lib/python-client";

import type {
  EstimateAnswer,
  JsonDoc,
  PostVideoMedia,
  PostWordsAnswer,
  VariantAnswer,
  VideoProjectAnswer,
} from "./types";

const BASE = "/video-projects";

interface CallOptions {
  organizationId: string;
  signal?: AbortSignal;
}

function opts(o: CallOptions) {
  return { organizationId: o.organizationId, signal: o.signal };
}

export async function createVideoProject(
  body: { post_id: string; name: string; brand_id?: string; document?: JsonDoc },
  o: CallOptions,
): Promise<VideoProjectAnswer> {
  return (await postJson<VideoProjectAnswer>(BASE, body, opts(o))).data;
}

export async function getVideoProject(projectId: string, o: CallOptions): Promise<VideoProjectAnswer> {
  return (await getJson<VideoProjectAnswer>(`${BASE}/${projectId}`, opts(o))).data;
}

/**
 * The version the server holds when a patch was refused as stale (409), else null. The server names the head in
 * `expectedVersion` and the caller's own base in `actualVersion`; -1 when it named neither.
 */
export function conflictVersion(error: unknown): number | null {
  if (!(error instanceof BackendApiError) || error.status !== 409) return null;
  const raw = error.details as { expectedVersion?: unknown; detail?: { expectedVersion?: unknown } } | null;
  const head = raw?.expectedVersion ?? raw?.detail?.expectedVersion;
  return typeof head === "number" ? head : -1;
}

export async function appendPatch(
  projectId: string,
  body: { base_version: number; patch: JsonDoc; document?: JsonDoc; note?: string },
  o: CallOptions,
): Promise<{ project_id: string; version: number }> {
  return (await postJson<{ project_id: string; version: number }>(`${BASE}/${projectId}/patches`, body, opts(o))).data;
}

export async function listVariants(projectId: string, o: CallOptions): Promise<VariantAnswer[]> {
  return (await getJson<VariantAnswer[]>(`${BASE}/${projectId}/variants`, opts(o))).data;
}

export async function createVariant(
  projectId: string,
  body: { label: string; ops: JsonDoc[]; base_version?: number },
  o: CallOptions,
): Promise<VariantAnswer> {
  return (await postJson<VariantAnswer>(`${BASE}/${projectId}/variants`, body, opts(o))).data;
}

export async function estimateProject(projectId: string, document: JsonDoc | null, o: CallOptions): Promise<EstimateAnswer> {
  return (await postJson<EstimateAnswer>(`/video-generation/${projectId}/estimate`, { document }, opts(o))).data;
}

/** Word timings for the post's stored video (stored on the shared transcript; system-paid STT). */
export async function fetchPostWords(postId: string, o: CallOptions): Promise<PostWordsAnswer> {
  return (await postJson<PostWordsAnswer>(`/social/posts/${postId}/words`, {}, opts(o))).data;
}

export async function listPostVideoMedia(postId: string, o: CallOptions): Promise<PostVideoMedia[]> {
  return (await getJson<PostVideoMedia[]>(`/social/posts/${postId}/media`, opts(o))).data;
}

// features/ai-models/discovery/api.ts
//
// Model discovery (unified models P1): the WORK goes to aidream —
//   POST /admin/ai-catalog/discovery/resolve                   { link }
//   POST /admin/ai-catalog/discovery/candidates/{id}/promote   PromotePicks
//   POST /admin/ai-catalog/discovery/candidates/{id}/dismiss   { reason }
//   POST /admin/ai-catalog/discovery/variants/{id}/test
// and every READ goes direct to the database (ai.model_candidate, ai.model_variant, …).
// Design: common-docs/systems/ai/ai-models/projects/unified-models/DESIGN.md §3.2.

import { postJsonAsUser } from "@/lib/api/post-json-as-user";
import { supabase } from "@/utils/supabase/client";

export interface Ambiguity {
  code: string;
  variant: string | null;
  path: string;
  detail: string;
  words: string;
}

export interface SuggestedArtifact {
  role: string;
  path_in_repo: string;
  url: string;
  size_bytes: number;
  sha256: string | null;
  shard_index: number | null;
  shard_count: number | null;
  required_for: string[];
}

export interface SuggestedVariant {
  key: string;
  format: string;
  quant: string;
  architecture: string;
  chat_template_kind: string;
  total_bytes: number;
  core_bytes: number;
  memory_bytes_min: number | null;
  memory_bytes_recommended: number | null;
  fit_basis: string;
  artifacts: SuggestedArtifact[];
  ambiguous: boolean;
}

export interface SuggestedMedia {
  kind: "maker_logo" | "image";
  source_url: string;
  alt: string;
  file_id: string | null;
  cdn_url: string | null;
  error: string | null;
}

export interface Suggested {
  repo: string;
  revision: string;
  card_url: string;
  author: string;
  maker: string;
  base_model: string[];
  gated: string;
  license_id: string | null;
  license_url: string | null;
  pipeline_tag: string | null;
  summary: string;
  summary_source?: string;
  capabilities?: { input: string[]; output: string[]; interaction: string };
  capabilities_basis?: string;
  maker_match?: { matched: boolean; words: string; provider_id: string | null; provider_name: string };
  tags: string[];
  links: { label: string; url: string }[];
  media: SuggestedMedia[];
  variants: SuggestedVariant[];
  ignored_files: string[];
  ambiguities: Ambiguity[];
  notes: string[];
  checked_at?: string;
}

export interface Candidate {
  id: string;
  repo: string | null;
  revision: string | null;
  state: string;
  origin: string;
  model_id: string | null;
  updated_at: string;
  suggested: Suggested;
}

export interface PromotePicks {
  variant_keys?: string[] | null;
  default_variant_key?: string | null;
  projector_picks?: Record<string, string>;
  provider_id?: string | null;
  common_name?: string | null;
  summary?: string | null;
  hero_file_id?: string | null;
  thumbnail_file_id?: string | null;
  gallery_file_ids?: string[];
  tags?: string[] | null;
  offer?: boolean;
  offer_without_test_run?: boolean;
  /** Only sent when the admin changed them; omitted = promote's automatic choice. */
  page?: string;
  shelf?: string;
  shelf_title?: string;
}

export interface Placement {
  page: string;
  shelf: string;
  shelf_title: string;
}

export interface PlacementDefault extends Placement {
  spec_pages: string[];
}

export interface PromoteResult {
  candidate_id: string;
  model_id: string;
  model_name: string;
  variants: {
    variant_id: string;
    key: string;
    review_state: string;
    file_check: string;
    label: string;
  }[];
  notes?: string[];
  presentation_changes?: { kept: string[]; replaced: string[]; set: string[] };
  media?: { file_id?: string; step: string; ok: boolean; words?: string }[];
}

/** PATCH /admin/ai-catalog/discovery/models/{id}/listing — every field optional except expected_updated_at. */
export interface ListingEdit {
  expected_updated_at: string | null;
  name?: string;
  common_name?: string | null;
  description?: string | null;
  display_order?: number | null;
  active?: boolean;
  /** Flat merge; a null value removes that key. */
  facts?: Record<string, unknown>;
  facts_replace?: boolean;
}

export interface ListingResult {
  model_id: string;
  name: string;
  common_name: string | null;
  description: string | null;
  display_order: number | null;
  facts: Record<string, unknown>;
  active: boolean;
  offered_variants: unknown[];
  updated_at: string;
  /** The fields that really changed (empty = nothing did). */
  changed?: string[];
  /** "Saved: …" or "No changes." — what the server did, in words. */
  words: string;
}

export interface CallAuth {
  baseUrl: string | null;
  accessToken: string | null;
  organizationId: string | null | undefined;
}

async function post<T>(auth: CallAuth, path: string, body: Record<string, unknown> = {}, method: "POST" | "PATCH" = "POST"): Promise<T> {
  if (!auth.baseUrl) throw new Error("No AI Matrx server address is configured.");
  if (!auth.accessToken) throw new Error("Sign in again; no session was found.");
  return postJsonAsUser<T>({
    baseUrl: auth.baseUrl,
    accessToken: auth.accessToken,
    organizationId: auth.organizationId,
    path,
    body,
    method,
  });
}

export const discoveryApi = {
  /** The Catalogs page's one model edit: names, description, order, active (offered), facts; 409 when stale. */
  editListing: (auth: CallAuth, modelId: string, edit: ListingEdit) =>
    post<ListingResult>(auth, `/admin/ai-catalog/discovery/models/${modelId}/listing`, edit as unknown as Record<string, unknown>, "PATCH"),
  resolve: (auth: CallAuth, link: string) =>
    post<Candidate>(auth, "/admin/ai-catalog/discovery/resolve", { link }),
  promote: (auth: CallAuth, candidateId: string, picks: PromotePicks) =>
    post<PromoteResult>(
      auth,
      `/admin/ai-catalog/discovery/candidates/${candidateId}/promote`,
      picks as Record<string, unknown>,
    ),
  dismiss: (auth: CallAuth, candidateId: string, reason: string) =>
    post<Candidate>(auth, `/admin/ai-catalog/discovery/candidates/${candidateId}/dismiss`, {
      reason,
    }),
  defaultPlacement: (auth: CallAuth, caps: { input: string[]; output: string[] }) =>
    post<PlacementDefault>(auth, "/admin/ai-catalog/discovery/placement", caps),
  movePlacement: (auth: CallAuth, modelId: string, to: Placement) =>
    post<Placement & { model_id: string; words: string }>(
      auth,
      `/admin/ai-catalog/discovery/models/${modelId}/placement`,
      to as unknown as Record<string, unknown>,
    ),
  test: (auth: CallAuth, variantId: string) =>
    post<{ status: string; detail: string }>(
      auth,
      `/admin/ai-catalog/discovery/variants/${variantId}/test`,
    ),
};

// ── Reads (direct) ─────────────────────────────────────────────────────────

export async function listCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .schema("ai")
    .from("model_candidate")
    .select("id, repo, revision, state, origin, model_id, updated_at, suggested")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Candidate[];
}

type ModelFormat = "ctranslate2" | "diffusers_dir" | "ggml_bin" | "gguf" | "mlx" | "onnx" | "pt" | "safetensors";

export interface PromotedVariant {
  id: string;
  key: string;
  quant: string;
  review_state: string;
  tested_on_current_runtime: boolean;
  is_default: boolean;
  architecture: string;
  chat_template_kind: string;
  format: ModelFormat;
  metadata: {
    test_request?: {
      status: string;
      requested_at?: string;
      started_at?: string;
      finished_at?: string;
      result?: string;
      reason?: string;
      expect?: string;
      run_id?: string | null;
    };
  } | null;
}

export interface VerificationRun {
  id: string;
  variant_id: string | null;
  check_kind: string;
  result: string;
  trigger: string;
  os: string | null;
  arch: string | null;
  hardware_class: string | null;
  measured: Record<string, unknown>;
  finished_at: string | null;
}

export interface CompatRow {
  id: string;
  hardware_class: string;
  quant: string;
  architecture: string;
  chat_template_kind: string;
  status: string;
  runtime_build_id: string;
  runtime_build: { os: string; arch: string; runtime_version: string | null; is_active: boolean } | null;
}

export async function loadPromoted(modelId: string): Promise<{
  variants: PromotedVariant[];
  runs: VerificationRun[];
  compat: CompatRow[];
  inPublic: boolean;
}> {
  const variantsRes = await supabase
    .schema("ai")
    .from("model_variant")
    .select(
      "id, key, quant, review_state, tested_on_current_runtime, is_default, architecture, chat_template_kind, format, metadata",
    )
    .eq("model_id", modelId)
    .is("deleted_at", null)
    .order("key");
  if (variantsRes.error) throw variantsRes.error;
  const variants = (variantsRes.data ?? []) as PromotedVariant[];
  const ids = variants.map((v) => v.id);
  const [runsRes, publicRes] = await Promise.all([
    ids.length
      ? supabase
          .schema("ai")
          .from("model_verification_run")
          .select("id, variant_id, check_kind, result, trigger, os, arch, hardware_class, measured, finished_at")
          .in("variant_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.schema("ai").from("model_public").select("id").eq("id", modelId).maybeSingle(),
  ]);
  if (runsRes.error) throw runsRes.error;
  const compat: CompatRow[] = [];
  for (const v of variants) {
    const { data, error } = await supabase
      .schema("ai")
      .from("runtime_compat")
      .select(
        "id, hardware_class, quant, architecture, chat_template_kind, status, runtime_build_id, runtime_build(os, arch, runtime_version, is_active)",
      )
      .eq("format", v.format)
      .eq("quant", v.quant)
      .eq("architecture", v.architecture)
      .eq("chat_template_kind", v.chat_template_kind)
      .is("deleted_at", null);
    if (error) throw error;
    for (const row of data ?? []) {
      const r = row as unknown as CompatRow;
      // Only the builds users can get today; a retired build's row is history, not compatibility.
      if (r.runtime_build && !r.runtime_build.is_active) continue;
      if (!compat.some((c) => c.id === r.id)) compat.push(r);
    }
  }
  return {
    variants,
    runs: (runsRes.data ?? []) as VerificationRun[],
    compat,
    inPublic: Boolean(publicRes.data),
  };
}

/** Every Models page / shelf already in use (distinct, live rows), and optionally one model's current placement. */
export async function loadPlacements(
  modelId?: string,
): Promise<{ inUse: Placement[]; current: Placement | null }> {
  const { data, error } = await supabase
    .schema("ai")
    .from("model_presentation")
    .select("model_id, page, shelf, shelf_title")
    .is("deleted_at", null)
    .not("page", "is", null)
    .limit(2000);
  if (error) throw error;
  const rows = (data ?? []) as unknown as (Placement & { model_id: string })[];
  const seen = new Map<string, Placement>();
  for (const r of rows) {
    if (r.page && r.shelf) seen.set(`${r.page}|${r.shelf}`, { page: r.page, shelf: r.shelf, shelf_title: r.shelf_title });
  }
  const mine = modelId ? rows.find((r) => r.model_id === modelId) : undefined;
  return {
    inUse: [...seen.values()],
    current: mine ? { page: mine.page, shelf: mine.shelf, shelf_title: mine.shelf_title } : null,
  };
}

export async function listMakers(): Promise<{ id: string; name: string; slug: string | null }[]> {
  const { data, error } = await supabase
    .schema("ai")
    .from("provider")
    .select("id, name, slug")
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; slug: string | null }[];
}

/** The words an admin sees for a variant's state (DESIGN.md §5 Q4 default labels). */
export function testedLabel(v: { tested_on_current_runtime: boolean }): string {
  return v.tested_on_current_runtime ? "Tested by AI Matrx" : "Not yet tested by us";
}

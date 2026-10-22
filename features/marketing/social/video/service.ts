/**
 * Video studio — direct reads under RLS (lists never go through the server).
 *
 * A brand's video projects = `social.video_project` rows linked to the brand by a
 * `social_video_project → web_brand` association; each row's reference post (thumbnail) and variant
 * count come from the same tables the doors write.
 */

import { readAllRows } from "@ai-matrx/data/db";

import { supabase } from "@/utils/supabase/client";

import type { VideoProjectListItem, VideoProjectRow } from "./types";

interface EdgeRow {
  source_id: string;
  target_id: string;
}

export async function readBrandVideoProjects(brandId: string): Promise<VideoProjectListItem[]> {
  const brandEdges = await readAllRows<EdgeRow>(
    ({ from, to }) =>
      supabase
        .schema("platform")
        .from("associations")
        .select("source_id, target_id")
        .eq("source_type", "social_video_project")
        .eq("target_type", "web_brand")
        .eq("target_id", brandId)
        .is("deleted_at", null)
        .order("source_id", { ascending: true })
        .range(from, to)
        .returns<EdgeRow[]>(),
    { label: "platform.associations (video project → brand)" },
  );
  return readProjectItems(brandEdges.map((e) => e.source_id));
}

/** A list row on the cross-brand page: the project card's facts + the brand it belongs to. */
export interface CrossBrandVideoItem extends VideoProjectListItem {
  brandId: string;
  brandName: string;
}

/**
 * Every video project the person can read, across all brands and organizations (RLS decides; the active
 * organization is never a filter). Projects with no brand link are left out: a card must open a brand's page.
 */
export async function readAllVideoProjects(): Promise<CrossBrandVideoItem[]> {
  const edges = await readAllRows<EdgeRow>(
    ({ from, to }) =>
      supabase
        .schema("platform")
        .from("associations")
        .select("source_id, target_id")
        .eq("source_type", "social_video_project")
        .eq("target_type", "web_brand")
        .is("deleted_at", null)
        .order("source_id", { ascending: true })
        .range(from, to)
        .returns<EdgeRow[]>(),
    { label: "platform.associations (all video project → brand)" },
  );
  const brandOf = new Map<string, string>();
  for (const e of edges) if (!brandOf.has(e.source_id)) brandOf.set(e.source_id, e.target_id);
  const items = await readProjectItems([...brandOf.keys()]);
  const brandIds = [...new Set(brandOf.values())];
  const names = new Map<string, string>();
  for (let i = 0; i < brandIds.length; i += 100) {
    const { data, error } = await supabase.schema("web").from("brand").select("id, name").in("id", brandIds.slice(i, i + 100));
    if (error) throw error;
    for (const b of data ?? []) names.set(b.id, b.name);
  }
  return items.map((item) => {
    const brandId = brandOf.get(item.project.id) as string;
    return { ...item, brandId, brandName: names.get(brandId) ?? "Brand" };
  });
}

async function readProjectItems(ids: string[]): Promise<VideoProjectListItem[]> {
  if (ids.length === 0) return [];
  const [projects, postEdges, variants] = await Promise.all([
    supabase
      .schema("social")
      .from("video_project")
      .select("id, name, status, head_version, organization_id, created_by, created_at, updated_at")
      .in("id", ids)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .returns<VideoProjectRow[]>(),
    supabase
      .schema("platform")
      .from("associations")
      .select("source_id, target_id")
      .eq("source_type", "social_video_project")
      .eq("target_type", "social_post")
      .in("source_id", ids)
      .is("deleted_at", null)
      .returns<EdgeRow[]>(),
    supabase.schema("social").from("video_variant").select("project_id").in("project_id", ids).returns<{ project_id: string }[]>(),
  ]);
  if (projects.error) throw projects.error;
  if (postEdges.error) throw postEdges.error;
  if (variants.error) throw variants.error;

  const postOf = new Map(postEdges.data.map((e) => [e.source_id, e.target_id]));
  const postIds = [...new Set(postOf.values())];
  const posts = postIds.length
    ? await supabase
        .schema("social")
        .from("post")
        .select("id, platform, thumbnail_url, thumbnail_file_id")
        .in("id", postIds)
        .returns<{ id: string; platform: string; thumbnail_url: string | null; thumbnail_file_id: string | null }[]>()
    : { data: [], error: null };
  if (posts.error) throw posts.error;
  const postById = new Map(posts.data.map((p) => [p.id, p]));
  const variantCount = new Map<string, number>();
  for (const v of variants.data) variantCount.set(v.project_id, (variantCount.get(v.project_id) ?? 0) + 1);

  return projects.data.map((project) => {
    const postId = postOf.get(project.id) ?? null;
    const post = postId ? postById.get(postId) : undefined;
    return {
      project,
      postId,
      thumbnailUrl: post?.thumbnail_url ?? null,
      hasStoredThumbnail: Boolean(post?.thumbnail_file_id),
      platform: post?.platform ?? null,
      variantCount: variantCount.get(project.id) ?? 0,
    };
  });
}

/** The reference post's display facts for the project page. */
export async function readReferencePost(postId: string) {
  const { data, error } = await supabase
    .schema("social")
    .from("post")
    .select("id, platform, url, caption, thumbnail_url, duration_seconds, language")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Stored patches after `afterVersion` (the `AppliedPatch` history a pinned variant rebases over). */
export async function readCompositionHistory(projectId: string, afterVersion: number): Promise<Array<{ version: number; patch: unknown }>> {
  const { data, error } = await supabase
    .schema("social")
    .from("video_composition_version")
    .select("composition_version, patch")
    .eq("project_id", projectId)
    .gt("composition_version", afterVersion)
    .order("composition_version", { ascending: true });
  if (error) throw error;
  return data.map((r) => ({ version: r.composition_version, patch: r.patch }));
}

export interface VideoStructureFacts {
  analysisId: string;
  durationSeconds: number | null;
  sceneCuts: number[];
  shots: Array<{ start: number; end: number; roll: string; description?: string | null }>;
  beats: Array<{ role: string; start: number; end: number; summary?: string | null }>;
  hook: { spoken_text?: string | null; on_screen_text?: string | null; visual?: string | null; device?: string | null } | null;
  onScreenText: Array<{ text: string; start: number; end: number }>;
  nearestCaptionPreset: string | null;
  pacing: { cuts_per_min?: number | null; avg_shot_s?: number | null; style?: string | null } | null;
  whyItWorks: string | null;
}

/** The reference's newest `video_structure` analysis (lane VC-04), or null when it has not run. */
export async function readVideoStructure(postId: string): Promise<VideoStructureFacts | null> {
  const { data, error } = await supabase
    .schema("social")
    .from("post_analysis")
    .select("id, payload, status")
    .eq("post_id", postId)
    .eq("kind", "video_structure")
    .eq("status", "complete")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const p = (data?.payload ?? null) as {
    ground_truth?: { scene_cuts?: number[]; duration_seconds?: number };
    shots?: VideoStructureFacts["shots"];
    beats?: VideoStructureFacts["beats"];
    hook?: VideoStructureFacts["hook"];
    on_screen_text?: VideoStructureFacts["onScreenText"];
    caption_style?: { nearest_preset?: string | null } | null;
    pacing?: VideoStructureFacts["pacing"];
    why_it_works?: string | null;
  } | null;
  if (!data || !p) return null;
  return {
    analysisId: data.id,
    durationSeconds: p.ground_truth?.duration_seconds ?? null,
    sceneCuts: p.ground_truth?.scene_cuts ?? [],
    shots: p.shots ?? [],
    beats: p.beats ?? [],
    hook: p.hook ?? null,
    onScreenText: p.on_screen_text ?? [],
    nearestCaptionPreset: p.caption_style?.nearest_preset ?? null,
    pacing: p.pacing ?? null,
    whyItWorks: p.why_it_works ?? null,
  };
}


/** A variant batch the server holds for a project: what a reloaded page shows while it runs, and after it stopped. */
export interface ActiveBatch {
  runId: string;
  /** `processing` while it runs. */
  status: string;
  createdAt: string;
  heartbeatAt: string | null;
  variantIds: string[];
  rows: Array<{ variant_id: string; status: string; stage?: string | null; message?: string | null; error?: string | null }>;
}

/**
 * The newest variant batch (last 6 hours, the signed-in person's) that names any of these variants, read from the run
 * record the batch writes at every step boundary. A reload finds a batch still going here instead of showing nothing.
 */
export async function readActiveBatch(variantIds: readonly string[]): Promise<ActiveBatch | null> {
  if (!variantIds.length) return null;
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .schema("chat")
    .from("agent_run")
    .select("id,status,created_at,last_heartbeat_at,request,result")
    .eq("kind", "video_variant_batch")
    .is("deleted_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<Array<{ id: string; status: string; created_at: string; last_heartbeat_at: string | null; request: { variants?: string[] } | null; result: { variants?: ActiveBatch["rows"] } | null }>>();
  if (error) throw error;
  const mine = new Set(variantIds);
  const row = (data ?? []).find((r) => (r.request?.variants ?? []).some((v) => mine.has(v)));
  if (!row) return null;
  return { runId: row.id, status: row.status, createdAt: row.created_at, heartbeatAt: row.last_heartbeat_at, variantIds: row.request?.variants ?? [], rows: row.result?.variants ?? [] };
}

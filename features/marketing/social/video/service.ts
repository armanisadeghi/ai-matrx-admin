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
  const ids = brandEdges.map((e) => e.source_id);
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
  sceneCuts: number[];
  shots: Array<{ start: number; end: number; roll: string; description?: string | null }>;
  whyItWorks: string | null;
}

/** The reference's `video_structure` analysis (lane VC-04), or null when it has not run. */
export async function readVideoStructure(postId: string): Promise<VideoStructureFacts | null> {
  const { data, error } = await supabase
    .schema("social")
    .from("post_analysis")
    .select("payload, status")
    .eq("post_id", postId)
    .eq("kind", "video_structure")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const p = (data?.payload ?? null) as {
    ground_truth?: { scene_cuts?: number[] };
    shots?: VideoStructureFacts["shots"];
    why_it_works?: string | null;
  } | null;
  if (!p) return null;
  return { sceneCuts: p.ground_truth?.scene_cuts ?? [], shots: p.shots ?? [], whyItWorks: p.why_it_works ?? null };
}

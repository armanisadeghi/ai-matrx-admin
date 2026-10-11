/**
 * Captured posts — what this organization's own browser read, shown as real posts (SCHEMA.md A7).
 *
 * `social.captured_post` is Layer B: one row per (organization, account, platform post id), written by the
 * server when a browser capture lands, read here under RLS (only the capturing organization's members get
 * rows). The account page merges them with the shared cache's posts:
 *
 * - a captured post the cache already holds is the SAME card (matched by `post_id`, else by every identity
 *   the post answers to); the cache wins on every figure it has, the capture fills what it lacks;
 * - a captured post the cache lacks becomes its own card, id `captured:<row id>`, marked From your browser;
 * - outlier multiples are recomputed over the union (the server's rule, `aidream services/social/stats.py`):
 *   a post's baseline is the median of the account's latest N OTHER posts' primary metric, no score below
 *   the minimum, percentile by mid-rank.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/client";

import { ageHoursOf, hookLineOf } from "../mappers";
import { OUTLIER_BASELINE_POSTS, OUTLIER_MIN_POSTS, median, outlierMetric } from "../outlier";
import type { PostCardModel, PostMediaRef, PostStatRow, SocialPostRow } from "../types";
import { postKeys } from "./postMatch";

export const CAPTURED_PREFIX = "captured:";
export const FROM_BROWSER_LABEL = "From your browser";

export const isCapturedPostId = (postId: string | null | undefined): boolean =>
  typeof postId === "string" && postId.startsWith(CAPTURED_PREFIX);
export const capturedRowId = (postId: string): string => postId.slice(CAPTURED_PREFIX.length);
export const capturedCardId = (rowId: string): string => `${CAPTURED_PREFIX}${rowId}`;

/** Doors of the capturing organization's stored images (aidream `GET /social/captured-posts/...`). */
export const capturedThumbnailDoor = (postId: string): string => `/social/captured-posts/${capturedRowId(postId)}/thumbnail`;
export const capturedMediaDoor = (postId: string, fileId: string): string =>
  `/social/captured-posts/${capturedRowId(postId)}/media/${fileId}`;

export interface CapturedPostRow {
  id: string;
  organization_id: string;
  profile_id: string;
  platform: string;
  platform_post_id: string;
  post_id: string | null;
  source_document_id: string | null;
  url: string | null;
  format: string;
  caption: string | null;
  posted_at: string | null;
  posted_label: string | null;
  duration_seconds: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  thumbnail_url: string | null;
  thumbnail_file_id: string | null;
  file_ids: string[];
  extras: Record<string, unknown>;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

const PAGE = 1000;

function client(): SupabaseClient {
  return createClient() as unknown as SupabaseClient;
}

/** Every captured post of one account this person's organizations hold, newest first. */
export async function readCapturedPosts(profileId: string, signal?: AbortSignal): Promise<CapturedPostRow[]> {
  const out: CapturedPostRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = client()
      .schema("social")
      .from("captured_post")
      .select("*")
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    if (error) throw new Error(`Could not read your captured posts: ${error.message}`);
    const rows = (data ?? []) as CapturedPostRow[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

export async function readCapturedPost(postId: string): Promise<CapturedPostRow | null> {
  const { data, error } = await client()
    .schema("social")
    .from("captured_post")
    .select("*")
    .eq("id", capturedRowId(postId))
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not read this captured post: ${error.message}`);
  return (data as CapturedPostRow | null) ?? null;
}

/**
 * Point the organization's captured row at the shared post it now is (after a public read of its link).
 * Only `post_id` changes; the row stays the organization's.
 */
export async function linkCapturedPost(postId: string, sharedPostId: string): Promise<void> {
  const { error } = await client()
    .schema("social")
    .from("captured_post")
    .update({ post_id: sharedPostId })
    .eq("id", capturedRowId(postId));
  if (error) throw new Error(`Could not link the captured post: ${error.message}`);
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function postUrl(row: CapturedPostRow, handle: string | null): string {
  if (row.url) return row.url;
  if (row.platform === "tiktok" && handle) return `https://www.tiktok.com/@${handle.replace(/^@/, "")}/video/${row.platform_post_id}`;
  return "";
}

/** One captured post as a card. Its multiple is set by `mergeCapturedPosts` over the whole account. */
export function capturedToCard(row: CapturedPostRow, handle: string | null, now: number = Date.now()): PostCardModel {
  const postId = capturedCardId(row.id);
  return {
    postId,
    platform: row.platform,
    profileId: row.profile_id,
    handle,
    format: row.format,
    url: postUrl(row, handle),
    thumbnailUrl: row.thumbnail_url,
    thumbnailFileId: row.thumbnail_file_id,
    hookLine: hookLineOf({ caption: row.caption, title: null }),
    postedAt: row.posted_at,
    durationSeconds: num(row.duration_seconds),
    views: num(row.views),
    likes: num(row.likes),
    comments: num(row.comments),
    shares: num(row.shares),
    isAd: false,
    removed: false,
    fromBrowser: true,
    outlier: { score: null, baselineViews: null, percentile: null, baselineWindow: null, ageHours: ageHoursOf(row.posted_at, now) },
    outlierScore: null,
    percentile: null,
  };
}

function primaryValue(p: PostCardModel): number | null {
  const metric = outlierMetric(p.platform);
  if (metric === "views") return p.views;
  if (metric === "likes") return p.likes;
  return null;
}

/**
 * The server's outlier rule over a list of one account's posts (stats.py): baseline = median of the latest
 * `window` OTHER posts that report the primary metric (newest first, undated last), none below `minPosts`.
 */
export function recomputeOutliers(
  posts: PostCardModel[],
  { window = OUTLIER_BASELINE_POSTS, minPosts = OUTLIER_MIN_POSTS, now = Date.now() }: { window?: number; minPosts?: number; now?: number } = {},
): PostCardModel[] {
  const at = (p: PostCardModel) => {
    const t = p.postedAt ? Date.parse(p.postedAt) : NaN;
    return Number.isFinite(t) ? t : -Infinity;
  };
  const ordered = [...posts].sort((a, b) => at(b) - at(a));
  return posts.map((p) => {
    const metric = outlierMetric(p.platform);
    if (metric !== "views" && metric !== "likes") return p;
    const value = primaryValue(p);
    const history = ordered
      .filter((o) => o.postId !== p.postId)
      .slice(0, window * 3)
      .map(primaryValue)
      .filter((v): v is number => v !== null)
      .slice(0, window);
    const med = history.length >= minPosts ? median(history) : null;
    const base = med !== null && med > 0 ? med : null;
    const score = value !== null && base !== null ? value / base : null;
    const percentile =
      value !== null && base !== null && history.length
        ? Math.round((10000 * (history.filter((v) => v < value).length + 0.5 * history.filter((v) => v === value).length)) / history.length) / 100
        : null;
    return {
      ...p,
      outlier: {
        ...(metric !== "views" ? { metric } : {}),
        ...(value === null ? { noViews: true } : {}),
        score,
        baselineViews: base,
        percentile,
        baselineWindow: window,
        ageHours: ageHoursOf(p.postedAt, now),
      },
      outlierScore: score,
      percentile,
    };
  });
}

/**
 * The account's posts: the shared cache's, then the organization's captured posts it lacks; the cache wins on
 * every figure it has and the capture fills the rest. Newest first. With no captured posts the list is the
 * cache's own (server-computed multiples untouched).
 */
export function mergeCapturedPosts(
  shared: PostCardModel[],
  captured: CapturedPostRow[],
  { handle = null, now = Date.now() }: { handle?: string | null; now?: number } = {},
): PostCardModel[] {
  if (captured.length === 0) return shared;
  const byId = new Map(shared.map((p, i) => [p.postId, i]));
  const byKey = new Map<string, number>();
  shared.forEach((p, i) => {
    for (const k of postKeys(p.platform, null, p.url)) byKey.set(k, i);
  });
  const out = [...shared];
  const seen = new Set<string>();
  for (const row of captured) {
    const keys = postKeys(row.platform, row.platform_post_id, row.url);
    const hit = (row.post_id ? byId.get(row.post_id) : undefined) ?? [...keys].map((k) => byKey.get(k)).find((i) => i !== undefined);
    if (hit !== undefined) {
      const x = out[hit];
      out[hit] = {
        ...x,
        views: x.views ?? num(row.views),
        likes: x.likes ?? num(row.likes),
        comments: x.comments ?? num(row.comments),
        shares: x.shares ?? num(row.shares),
        postedAt: x.postedAt ?? row.posted_at,
        hookLine: x.hookLine || hookLineOf({ caption: row.caption, title: null }),
      };
      continue;
    }
    if ([...keys].some((k) => seen.has(k))) continue;
    for (const k of keys) seen.add(k);
    out.push(capturedToCard(row, handle, now));
  }
  const at = (p: PostCardModel) => (p.postedAt ? Date.parse(p.postedAt) || -Infinity : -Infinity);
  return recomputeOutliers(out.sort((a, b) => at(b) - at(a)), { now });
}

/** A captured post in the post window's shape (the window reads the same row type for every post). */
export function capturedDetail(row: CapturedPostRow, handle: string | null): { post: SocialPostRow; stat: PostStatRow } {
  const postId = capturedCardId(row.id);
  const post = {
    id: postId,
    organization_id: row.organization_id,
    created_at: row.created_at,
    created_by: null,
    updated_at: row.updated_at,
    updated_by: null,
    custom_fields: {},
    deleted_at: null,
    metadata: { from_browser: true },
    version: 1,
    visibility: "internal",
    shown_to: null,
    published_to_web: false,
    published_to_web_at: null,
    published_to_web_by: null,
    platform: row.platform,
    platform_post_id: row.platform_post_id,
    profile_id: row.profile_id,
    url: postUrl(row, handle),
    format: row.format,
    title: null,
    caption: row.caption,
    posted_at: row.posted_at,
    duration_seconds: num(row.duration_seconds),
    hashtags: [],
    mentions: [],
    music: null,
    language: null,
    thumbnail_url: row.thumbnail_url,
    thumbnail_file_id: row.thumbnail_file_id,
    is_ad: false,
    youtube_video_id: null,
    status: "live",
    status_changed_at: null,
    provider: "browser",
    first_seen_at: row.captured_at,
    last_refreshed_at: row.captured_at,
    raw_payload: {},
  } as unknown as SocialPostRow;
  const stat = {
    id: postId,
    post_id: postId,
    organization_id: row.organization_id,
    views: num(row.views),
    likes: num(row.likes),
    comments: num(row.comments),
    shares: num(row.shares),
    saves: num(row.saves),
    engagement_rate: null,
    baseline_views: null,
    baseline_window: null,
    outlier_score: null,
    percentile: null,
    velocity_24h: null,
    metrics_observed_at: row.captured_at,
    computed_at: row.captured_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: null,
    updated_by: null,
    custom_fields: {},
    metadata: {},
    version: 1,
  } as unknown as PostStatRow;
  return { post, stat };
}

/** The stored images of a captured post, as the post window's media list. */
export function capturedMediaRefs(row: CapturedPostRow): PostMediaRef[] {
  const postId = capturedCardId(row.id);
  return (row.file_ids ?? []).map((fileId, i) => ({
    file_id: fileId,
    role: i === 0 ? "image" : `image_${i}`,
    mime_type: null,
    size_bytes: null,
    door: capturedMediaDoor(postId, fileId),
  }));
}

/** "281 posts from your browser · Oct 9" — the one-line capture summary. */
export function capturedSummary(count: number, capturedAt: string | null): string {
  const when = capturedAt ? new Date(capturedAt) : null;
  const date = when && Number.isFinite(when.getTime()) ? when.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  const what = `${count} ${count === 1 ? "post" : "posts"} from your browser`;
  return date ? `${what} · ${date}` : what;
}

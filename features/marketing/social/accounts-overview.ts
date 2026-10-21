/**
 * The Accounts overview's numbers (pure; unit-tested in `__tests__/accounts-overview.test.ts`).
 *
 * Every figure comes from what is stored: the tracked accounts, their posts with stats, and their
 * follower snapshots. Nothing is estimated. The brand's numbers count only the brand's own
 * accounts on this brand: a person's own account (ownerKind "person") and an account attached
 * through a connection but not added to this brand are never the brand's audience.
 *
 * A window is the trailing N days; "prior" is the N days before it, so every delta compares like
 * with like. A number with nothing behind it is null, never 0.
 */

import { OUTLIER_TIER_THRESHOLDS } from "./outlier";
import type { AccountRow, BrandPost, ProfileSnapshotRow } from "./types";

const DAY_MS = 86_400_000;

export const OVERVIEW_WINDOWS = [7, 30, 90] as const;
export type OverviewWindow = (typeof OVERVIEW_WINDOWS)[number];

type Snapshot = Pick<ProfileSnapshotRow, "profile_id" | "observed_at" | "follower_count">;

/** The brand's own accounts on this brand (the set every brand KPI counts). */
export function brandAccounts(rows: readonly AccountRow[]): AccountRow[] {
  return rows.filter((r) => r.role === "own" && r.ownerKind !== "person" && !r.unassigned && r.trackedAccountId);
}

export function competitorAccounts(rows: readonly AccountRow[]): AccountRow[] {
  return rows.filter((r) => r.role === "competitor" && r.trackedAccountId);
}

export interface PostFigures {
  posts: number;
  /** Sum of views over posts that report views; null when none do. */
  views: number | null;
  /** Mean views per post that reports views. */
  avgViews: number | null;
  /** (likes + comments + shares) / views, as a fraction; null without views. */
  engagement: number | null;
  /** Posts at or over the neutral outlier tier (2x the account's usual). */
  outliers: number;
  bestScore: number | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function inRange(iso: string | null, from: number, to: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t > from && t <= to;
}

export function postFigures(posts: readonly BrandPost[]): PostFigures {
  let views = 0;
  let withViews = 0;
  let interactions = 0;
  let engagedViews = 0;
  let outliers = 0;
  let bestScore: number | null = null;
  for (const p of posts) {
    const v = num(p.views);
    if (v !== null) {
      views += v;
      withViews += 1;
      if (v > 0) {
        interactions += (num(p.likes) ?? 0) + (num(p.comments) ?? 0) + (num(p.shares) ?? 0);
        engagedViews += v;
      }
    }
    const s = num(p.outlierScore);
    if (s !== null) {
      if (s >= OUTLIER_TIER_THRESHOLDS.neutral) outliers += 1;
      if (bestScore === null || s > bestScore) bestScore = s;
    }
  }
  return {
    posts: posts.length,
    views: withViews ? views : null,
    avgViews: withViews ? views / withViews : null,
    engagement: engagedViews > 0 ? interactions / engagedViews : null,
    outliers,
    bestScore,
  };
}

/** Posts of these accounts posted inside (from, to]. */
function postsOf(posts: readonly BrandPost[], accountIds: ReadonlySet<string>, from: number, to: number): BrandPost[] {
  return posts.filter((p) => accountIds.has(p.trackedAccountId) && inRange(p.postedAt, from, to));
}

/** Follower readings per profile, oldest first. */
function readingsByProfile(snapshots: readonly Snapshot[], profileIds: ReadonlySet<string>) {
  const out = new Map<string, { t: number; v: number }[]>();
  for (const s of snapshots) {
    if (!s.profile_id || !profileIds.has(s.profile_id)) continue;
    const t = Date.parse(s.observed_at);
    const v = num(s.follower_count);
    if (!Number.isFinite(t) || v === null) continue;
    const list = out.get(s.profile_id) ?? [];
    list.push({ t, v });
    out.set(s.profile_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.t - b.t);
  return out;
}

function valueAt(list: readonly { t: number; v: number }[], t: number): number | null {
  let found: number | null = null;
  for (const p of list) {
    if (p.t <= t) found = p.v;
    else break;
  }
  return found;
}

export interface FollowerChange {
  /** Net followers gained (accounts with a reading at both ends). */
  net: number;
  /** net / followers at the start. */
  fraction: number | null;
  /** The span the change covers: the window, or less when the readings start inside it. */
  spanDays: number;
}

/** History shorter than this says nothing about growth. */
const MIN_SPAN_DAYS = 2;

/**
 * Net follower change over the window, summed over accounts with a reading at the window's start
 * (or, when readings began inside the window, their first one) and a later one. The span is the
 * longest one measured, so a 30d tile over 9 days of history says "over 9d", never "30d".
 * Null when no account has two readings at least two days apart.
 */
export function followerChange(accounts: readonly AccountRow[], snapshots: readonly Snapshot[], days: number, now: number): FollowerChange | null {
  const ids = new Set(accounts.map((a) => a.profileId).filter((id): id is string => Boolean(id)));
  const readings = readingsByProfile(snapshots, ids);
  const start = now - days * DAY_MS;
  let net = 0;
  let base = 0;
  let spanMs = 0;
  for (const list of readings.values()) {
    const first = [...list].reverse().find((p) => p.t <= start) ?? list.find((p) => p.t > start);
    const last = list.at(-1);
    if (!first || !last || last.t - Math.max(first.t, start) < MIN_SPAN_DAYS * DAY_MS) continue;
    net += last.v - first.v;
    base += first.v;
    // Readings from before the window cover all of it; readings that began inside it cover from there to now.
    spanMs = Math.max(spanMs, first.t <= start ? days * DAY_MS : now - first.t);
  }
  if (!spanMs) return null;
  return { net, fraction: base > 0 ? net / base : null, spanDays: Math.min(days, Math.round(spanMs / DAY_MS)) };
}

/** The bucket size for a window's history lines: daily up to two weeks, weekly beyond. */
function bucketDays(days: number): number {
  return days <= 14 ? 1 : 7;
}

/** Summed followers at each bucket end (accounts with a reading by then). Null under two distinct values. */
export function followerTrend(accounts: readonly AccountRow[], snapshots: readonly Snapshot[], days: number, now: number): number[] | null {
  const ids = new Set(accounts.map((a) => a.profileId).filter((id): id is string => Boolean(id)));
  const readings = [...readingsByProfile(snapshots, ids).values()];
  if (!readings.length) return null;
  const step = bucketDays(days) * DAY_MS;
  const count = Math.ceil(days / bucketDays(days));
  const values: number[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const t = now - i * step;
    let sum = 0;
    let any = false;
    for (const list of readings) {
      const v = valueAt(list, t);
      if (v !== null) {
        sum += v;
        any = true;
      }
    }
    if (any) values.push(sum);
  }
  return values.length >= 2 && new Set(values).size > 1 ? values : null;
}

/** Posts and views per bucket over the window, oldest first. */
export function activityTrend(posts: readonly BrandPost[], accountIds: ReadonlySet<string>, days: number, now: number) {
  const step = bucketDays(days) * DAY_MS;
  const count = Math.ceil(days / bucketDays(days));
  const postCounts: number[] = [];
  const views: number[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const to = now - i * step;
    const bucket = postsOf(posts, accountIds, to - step, to);
    postCounts.push(bucket.length);
    views.push(bucket.reduce((s, p) => s + (num(p.views) ?? 0), 0));
  }
  return {
    posts: postCounts.some((n) => n > 0) ? postCounts : null,
    views: views.some((n) => n > 0) ? views : null,
    period: bucketDays(days) === 1 ? "Per day" : "Per week",
  };
}

export interface PlatformRow {
  platform: string;
  accounts: number;
  followers: number | null;
  /** This platform's share of the brand's followers (0..1). */
  share: number | null;
  figures: PostFigures;
}

/** The brand's accounts by platform, biggest audience first. */
export function platformRows(accounts: readonly AccountRow[], posts: readonly BrandPost[], days: number, now: number): PlatformRow[] {
  const total = accounts.reduce((s, a) => s + (a.followers ?? 0), 0);
  const byPlatform = new Map<string, AccountRow[]>();
  for (const a of accounts) byPlatform.set(a.platform, [...(byPlatform.get(a.platform) ?? []), a]);
  const from = now - days * DAY_MS;
  return [...byPlatform.entries()]
    .map(([platform, list]) => {
      const followers = list.some((a) => a.followers !== null) ? list.reduce((s, a) => s + (a.followers ?? 0), 0) : null;
      const ids = new Set(list.map((a) => a.trackedAccountId as string));
      return {
        platform,
        accounts: list.length,
        followers,
        share: followers !== null && total > 0 ? followers / total : null,
        figures: postFigures(postsOf(posts, ids, from, now)),
      };
    })
    .sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));
}

export interface LeaderRow {
  /** "brand" for the brand's own accounts together; else the competitor's row id. */
  id: string;
  isBrand: boolean;
  account: AccountRow | null;
  followers: number | null;
  postsPerWeek: number;
  figures: PostFigures;
}

/** The brand (its own accounts together) against each tracked competitor over the window, by average views. */
export function leaderboard(
  brand: readonly AccountRow[],
  competitors: readonly AccountRow[],
  posts: readonly BrandPost[],
  days: number,
  now: number,
): LeaderRow[] {
  const from = now - days * DAY_MS;
  const weeks = days / 7;
  const row = (id: string, list: readonly AccountRow[], isBrand: boolean): LeaderRow => {
    const ids = new Set(list.map((a) => a.trackedAccountId as string));
    const figures = postFigures(postsOf(posts, ids, from, now));
    return {
      id,
      isBrand,
      account: isBrand ? null : (list[0] ?? null),
      followers: list.some((a) => a.followers !== null) ? list.reduce((s, a) => s + (a.followers ?? 0), 0) : null,
      postsPerWeek: figures.posts / weeks,
      figures,
    };
  };
  const rows = [row("brand", brand, true), ...competitors.map((c) => row(c.rowId, [c], false))];
  return rows.sort((a, b) => (b.figures.avgViews ?? -1) - (a.figures.avgViews ?? -1) || (b.followers ?? -1) - (a.followers ?? -1));
}

export interface OverviewModel {
  days: number;
  brandCount: number;
  competitorCount: number;
  followers: number | null;
  followerChange: FollowerChange | null;
  followerTrend: number[] | null;
  current: PostFigures;
  prior: PostFigures;
  activity: ReturnType<typeof activityTrend>;
  /** The brand's views as a share of brand + competitor views in the window (needs a competitor). */
  shareOfViews: number | null;
  platforms: PlatformRow[];
  leaders: LeaderRow[];
  topPosts: BrandPost[];
}

export function buildOverview(args: {
  rows: readonly AccountRow[];
  posts: readonly BrandPost[];
  snapshots: readonly Snapshot[];
  days: number;
  now?: number;
}): OverviewModel {
  const now = args.now ?? Date.now();
  const { posts, snapshots, days } = args;
  const brand = brandAccounts(args.rows);
  const competitors = competitorAccounts(args.rows);
  const brandIds = new Set(brand.map((a) => a.trackedAccountId as string));
  const competitorIds = new Set(competitors.map((a) => a.trackedAccountId as string));
  const from = now - days * DAY_MS;
  const currentPosts = postsOf(posts, brandIds, from, now);
  const current = postFigures(currentPosts);
  const prior = postFigures(postsOf(posts, brandIds, from - days * DAY_MS, from));
  const rivalViews = postFigures(postsOf(posts, competitorIds, from, now)).views;
  const shareOfViews =
    competitors.length && current.views !== null && rivalViews !== null && current.views + rivalViews > 0
      ? current.views / (current.views + rivalViews)
      : null;
  return {
    days,
    brandCount: brand.length,
    competitorCount: competitors.length,
    followers: brand.some((a) => a.followers !== null) ? brand.reduce((s, a) => s + (a.followers ?? 0), 0) : null,
    followerChange: followerChange(brand, snapshots, days, now),
    followerTrend: followerTrend(brand, snapshots, days, now),
    current,
    prior,
    activity: activityTrend(posts, brandIds, days, now),
    shareOfViews,
    platforms: platformRows(brand, posts, days, now),
    leaders: competitors.length ? leaderboard(brand, competitors, posts, days, now) : [],
    topPosts: [...currentPosts].sort((a, b) => (num(b.views) ?? -1) - (num(a.views) ?? -1)).slice(0, 6),
  };
}

/** Relative change from prior to current; null when there is no prior to compare with. */
export function relativeChange(current: number | null, prior: number | null): number | null {
  if (current === null || prior === null || prior === 0) return null;
  return (current - prior) / prior;
}

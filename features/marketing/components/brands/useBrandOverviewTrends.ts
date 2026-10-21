"use client";

/**
 * The brand Overview's KPI trend lines: one lean, cached read per series, never a fan-out per tile.
 *
 * - Audience: `social.profile_snapshot` follower counts for the brand's own profiles, last 30 days.
 *   Summed per snapshot day; each account carries its latest known count forward (and its first
 *   count back), so an account read on a different day never shows as a jump or a dip.
 * - Posts per week: `social.post.posted_at` for those profiles, last 12 weeks, bucketed by week.
 * - Search clicks per day: `seo.gsc_perf_timeseries` for the rollup's own 28-day window, summed per day.
 *   There is no multi-site timeseries RPC; a brand owns a handful of sites, read in one parallel batch.
 *
 * Every series is `null` when there is no real history (fewer than two points, or nothing in the
 * window): the tile then draws no line rather than a flat invented one.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase/client";
import type { KpiTrend } from "@/components/official/kpi/KpiTile";
import { getGscTimeseries } from "@/features/marketing/search-console/data";
import type { GscResolvedPeriods } from "@/features/marketing/search-console/types";

/** The KPI tile's own trend shape. */
export type TrendSeries = KpiTrend;

const DAY = 86_400_000;
export const FOLLOWER_TREND_DAYS = 30;
export const POST_TREND_WEEKS = 12;

function sinceIso(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

/** Pure: per-day sums with carry-forward/back per profile. Exported for tests. */
export function followerSeries(rows: readonly { profile_id: string; observed_at: string; follower_count: number | null }[]): number[] {
  const byProfile = new Map<string, { day: string; count: number }[]>();
  const days = new Set<string>();
  for (const r of rows) {
    if (r.follower_count === null) continue;
    const day = r.observed_at.slice(0, 10);
    days.add(day);
    const list = byProfile.get(r.profile_id) ?? [];
    list.push({ day, count: r.follower_count });
    byProfile.set(r.profile_id, list);
  }
  const ordered = [...days].sort();
  if (ordered.length < 2) return [];
  return ordered.map((day) => {
    let total = 0;
    for (const list of byProfile.values()) {
      // Rows arrive oldest first: the last one at or before `day`, else the first one.
      let value = list[0]!.count;
      for (const point of list) {
        if (point.day > day) break;
        value = point.count;
      }
      total += value;
    }
    return total;
  });
}

/** Pure: posts per week, oldest week first. Exported for tests. */
export function weeklyPostSeries(postedAt: readonly string[], weeks: number, now = Date.now()): number[] {
  const buckets = new Array<number>(weeks).fill(0);
  for (const iso of postedAt) {
    const age = Math.floor((now - Date.parse(iso)) / (7 * DAY));
    if (age >= 0 && age < weeks) buckets[weeks - 1 - age]! += 1;
  }
  return buckets;
}

export function useBrandOverviewTrends({
  profileIds,
  postProfileIds,
  siteIds,
  gscPeriods,
  gscReady,
}: {
  /** The brand's own (company) profiles: the Audience number counts only these. */
  profileIds: readonly string[];
  /** Every profile the Posts number counts (brand and people's accounts). */
  postProfileIds: readonly string[];
  siteIds: readonly string[];
  /** The search-clicks KPI's own window, so the line and the number cover the same days. */
  gscPeriods: GscResolvedPeriods;
  gscReady: boolean;
}) {
  const profileKey = [...profileIds].sort().join(",");
  const postKey = [...postProfileIds].sort().join(",");
  const siteKey = [...siteIds].sort().join(",");

  const followers = useQuery({
    queryKey: ["marketing", "brand-overview", "follower-trend", profileKey],
    queryFn: async ({ signal }): Promise<TrendSeries | null> => {
      const { data, error } = await supabase
        .schema("social")
        .from("profile_snapshot")
        .select("profile_id, observed_at, follower_count")
        .in("profile_id", [...profileIds])
        .gte("observed_at", sinceIso(FOLLOWER_TREND_DAYS))
        .order("observed_at", { ascending: true })
        .limit(2000)
        .abortSignal(signal);
      if (error) throw new Error(error.message);
      const values = followerSeries(data ?? []);
      return values.length >= 2 ? { values, period: `${FOLLOWER_TREND_DAYS} days`, label: "Followers" } : null;
    },
    enabled: profileIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const posts = useQuery({
    queryKey: ["marketing", "brand-overview", "post-trend", postKey],
    queryFn: async ({ signal }): Promise<TrendSeries | null> => {
      const { data, error } = await supabase
        .schema("social")
        .from("post")
        .select("posted_at")
        .in("profile_id", [...postProfileIds])
        .is("deleted_at", null)
        .gte("posted_at", sinceIso(POST_TREND_WEEKS * 7))
        .limit(2000)
        .abortSignal(signal);
      if (error) throw new Error(error.message);
      const dates = (data ?? []).map((r) => r.posted_at).filter((d): d is string => Boolean(d));
      if (dates.length === 0) return null;
      return { values: weeklyPostSeries(dates, POST_TREND_WEEKS), period: `${POST_TREND_WEEKS} weeks`, label: "Posts per week" };
    },
    enabled: postProfileIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const clicks = useQuery({
    queryKey: ["marketing", "brand-overview", "click-trend", siteKey, gscPeriods.current.start, gscPeriods.current.end],
    queryFn: async ({ signal }): Promise<TrendSeries | null> => {
      const window: GscResolvedPeriods = { current: gscPeriods.current, compare: null };
      const perSite = await Promise.all(siteIds.map((id) => getGscTimeseries(id, window, {}, signal)));
      const byDay = new Map<string, number>();
      for (const rows of perSite) {
        for (const r of rows) {
          if (r.period !== "current") continue;
          byDay.set(r.day, (byDay.get(r.day) ?? 0) + (r.clicks ?? 0));
        }
      }
      const values = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
      if (values.length < 2 || values.every((v) => v === 0)) return null;
      return { values, period: `${values.length} days`, label: "Search clicks per day" };
    },
    enabled: siteIds.length > 0 && gscReady,
    staleTime: 5 * 60_000,
  });

  return { followers: followers.data ?? null, posts: posts.data ?? null, clicks: clicks.data ?? null };
}

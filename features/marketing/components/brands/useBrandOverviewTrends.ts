"use client";

/**
 * The brand Overview's KPI trend lines: one lean, cached read per series, never a fan-out per tile.
 *
 * - Audience: `social.profile_snapshot` follower counts for the brand's own profiles, last 30 days.
 *   Summed per snapshot day; each account carries its latest known count forward (and its first
 *   count back), so an account read on a different day never shows as a jump or a dip.
 * - Posts per week: `social.post.posted_at` for those profiles, last 12 weeks, bucketed by week.
 *   People's accounts never enter either line (a founder's personal X is not the brand's audience).
 * - Search clicks: `seo.gsc_perf_timeseries` for the rollup's own 28-day window and the one before it,
 *   summed per day. It is ALSO the KPI's number: the traffic-class rollup counts only clicks on queries
 *   Google names (data-destruction 2026-10-21: 39 of 331), the Search Console total is every click.
 *   There is no multi-site timeseries RPC; a brand owns a handful of sites, read in one parallel batch.
 *
 * Every series is `null` when there is no real history (fewer than two points, or nothing in the
 * window): the tile then draws no line rather than a flat invented one.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase/client";
import type { KpiTrend } from "@ai-matrx/design-system/controls";
import { getGscBreakdown, getGscTimeseries } from "@/features/marketing/search-console/data";
import { useGscPortfolioRollup } from "@/features/marketing/search-console/components/ambassador/useGscPortfolioRollup";
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

/** Pure: the days a series of observations really covers ("8 days" when history began 8 days ago). */
export function historySpanLabel(isoDays: readonly string[]): string | null {
  const days = [...new Set(isoDays.map((d) => d.slice(0, 10)))].sort();
  if (days.length < 2) return null;
  const span = Math.round((Date.parse(days[days.length - 1] ?? "") - Date.parse(days[0] ?? "")) / DAY) + 1;
  return `${span} day${span === 1 ? "" : "s"}`;
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
  siteIds,
}: {
  /** The brand's own (company) profiles: Audience and Posts count only these; people's accounts stand apart. */
  profileIds: readonly string[];
  siteIds: readonly string[];
}) {
  const profileKey = [...profileIds].sort().join(",");

  const followers = useQuery({
    queryKey: ["marketing", "brand-overview", "follower-trend", profileKey],
    queryFn: async ({ signal }): Promise<FollowerTrend | null> => {
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
      const rows = (data ?? []).filter((r) => r.follower_count !== null);
      const values = followerSeries(rows);
      // The line is labelled by the history we really hold, never the window we asked for.
      const period = historySpanLabel(rows.map((r) => r.observed_at));
      // A line of zeros says nothing the "0" beside it does not.
      if (values.length < 2 || !period || !values.some((v) => v > 0)) return null;
      return { values, period, label: "Followers", net: (values[values.length - 1] ?? 0) - (values[0] ?? 0) };
    },
    enabled: profileIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const posts = useQuery({
    queryKey: ["marketing", "brand-overview", "post-trend", profileKey],
    queryFn: async ({ signal }): Promise<TrendSeries | null> => {
      const { data, error } = await supabase
        .schema("social")
        .from("post")
        .select("posted_at")
        .in("profile_id", [...profileIds])
        .is("deleted_at", null)
        .gte("posted_at", sinceIso(POST_TREND_WEEKS * 7))
        .limit(2000)
        .abortSignal(signal);
      if (error) throw new Error(error.message);
      const dates = (data ?? []).map((r) => r.posted_at).filter((d): d is string => Boolean(d));
      if (dates.length === 0) return null;
      return { values: weeklyPostSeries(dates, POST_TREND_WEEKS), period: `${POST_TREND_WEEKS} weeks`, label: "Posts per week" };
    },
    enabled: profileIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const search = useBrandSearchClicks(siteIds);

  return {
    followers: followers.data ?? null,
    posts: posts.data ?? null,
    /** Every Google Search click (the Search Console total), not only clicks on queries Google names. */
    clicks: search.clicks,
    clicksLoading: search.loading,
    clicksError: search.error,
  };
}

/**
 * The brand's Search Console total over the portfolio rollup's own 28-day window: clicks, impressions,
 * impression-weighted average position, the prior window, and the last day Google has data for. The
 * Overview tile and the Web & search tab both read this one cache entry, so they never disagree.
 */
export function useBrandSearchClicks(siteIds: readonly string[]) {
  const gsc = useGscPortfolioRollup(siteIds, "28d");
  const periods = gsc.periods;
  const siteKey = [...siteIds].sort().join(",");
  const query = useQuery({
    queryKey: [
      "marketing", "brand-overview", "clicks", siteKey,
      periods.current.start, periods.current.end, periods.compare?.start ?? null, periods.compare?.end ?? null,
    ],
    queryFn: async ({ signal }): Promise<SearchClicks> => {
      const perSite = await Promise.all(siteIds.map((id) => getGscTimeseries(id, periods, {}, signal)));
      return summarizeSearch(perSite.flat(), periods);
    },
    enabled: siteIds.length > 0 && !gsc.isLoading,
    staleTime: 5 * 60_000,
  });
  return {
    clicks: query.data ?? null,
    loading: siteIds.length > 0 && (gsc.isLoading || query.isLoading),
    error: query.error,
    periods,
  };
}

/** Pure: one window's Search Console rows (every site) into the KPI's numbers. Exported for tests. */
export function summarizeSearch(
  rows: readonly { period: string; day: string; clicks: number | null; impressions: number | null; avg_position: number | null }[],
  periods: GscResolvedPeriods,
): SearchClicks {
  const byDay = new Map<string, number>();
  let total = 0;
  let compareTotal = 0;
  let impressions = 0;
  let positionWeight = 0;
  let lastDay = "";
  for (const r of rows) {
    if (r.period !== "current") {
      compareTotal += r.clicks ?? 0;
      continue;
    }
    total += r.clicks ?? 0;
    const shown = r.impressions ?? 0;
    impressions += shown;
    if (r.avg_position !== null && shown > 0) positionWeight += r.avg_position * shown;
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + (r.clicks ?? 0));
    if ((shown > 0 || (r.clicks ?? 0) > 0) && r.day > lastDay) lastDay = r.day;
  }
  const values = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  // The KPI's own window, not the count of days that had rows.
  const span = Math.round((Date.parse(periods.current.end) - Date.parse(periods.current.start)) / DAY) + 1;
  return {
    hasData: rows.length > 0,
    total,
    compareTotal: periods.compare ? compareTotal : null,
    deltaPct: periods.compare && compareTotal > 0 ? (total - compareTotal) / compareTotal : null,
    impressions,
    avgPosition: impressions > 0 ? positionWeight / impressions : null,
    dataEnd: lastDay || null,
    trend: values.length >= 2 && values.some((v) => v > 0) ? { values, period: `${span} days`, label: "Search clicks per day" } : null,
  };
}

/** The brand's top Google queries by clicks over the same window (Search Console rows, every site, merged). */
export function useBrandTopQueries(siteIds: readonly string[], periods: GscResolvedPeriods, enabled: boolean) {
  const siteKey = [...siteIds].sort().join(",");
  return useQuery({
    queryKey: ["marketing", "brand-overview", "top-queries", siteKey, periods.current.start, periods.current.end],
    queryFn: async ({ signal }): Promise<TopQuery[]> => {
      const current: GscResolvedPeriods = { current: periods.current, compare: null };
      const perSite = await Promise.all(
        siteIds.map((id) =>
          getGscBreakdown(id, current, {}, { dimension: "query", search: "", sort: "clicks", sortDir: "desc", page: 1, pageSize: 3 }, signal),
        ),
      );
      const merged = new Map<string, TopQuery>();
      for (const { rows } of perSite) {
        for (const r of rows) {
          if (!r.key || (r.clicks ?? 0) <= 0) continue;
          const prev = merged.get(r.key);
          merged.set(r.key, { query: r.key, clicks: (prev?.clicks ?? 0) + (r.clicks ?? 0) });
        }
      }
      return [...merged.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 3);
    },
    enabled: enabled && siteIds.length > 0,
    staleTime: 5 * 60_000,
  });
}

export interface TopQuery {
  query: string;
  clicks: number;
}

export interface FollowerTrend extends TrendSeries {
  /** Followers gained (or lost) across the line's real span. */
  net: number;
}

export interface SearchClicks {
  hasData: boolean;
  total: number;
  /** The prior window's clicks (null when there is no prior window). */
  compareTotal: number | null;
  deltaPct: number | null;
  impressions: number;
  /** Impression-weighted average position (null with no impressions). */
  avgPosition: number | null;
  /** The last day Google reported data for (Search Console lags 2-3 days). */
  dataEnd: string | null;
  trend: TrendSeries | null;
}

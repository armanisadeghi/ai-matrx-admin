"use client";

/**
 * How long a data fetch takes, said to the person and tracked (owner, 2026-10-22: "it's rediculous that we're not
 * showing the time it takes for these in our results"). The server stamps every stage on the job
 * (`scraper.data_fetch_job`: created_at, started_at, provider_ready_at, collected_at, saved_at, finished_at,
 * duration_ms); this file turns them into plain words and reads two doors:
 *
 * - `scraper.data_fetch_typical_speed` — every signed-in person: per source, the median (and p95) of the latest
 *   finished runs (how many is the knob `data_library.typical_speed_sample_runs`). Timings only, no cost.
 * - `scraper.data_source_methods` / `scraper.data_fetch_under_the_hood` — super admin only, for the opt-in
 *   "Under the hood" view (`./UnderTheHood`).
 */

import { useQuery } from "@tanstack/react-query";
import { formatDurationMs } from "@ai-matrx/kit/format";

import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";

/** The new doors are not in the generated types yet: one narrow, named shape for them. */
type UntypedRpc = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
const scraperRpc = () => createClient().schema("scraper") as unknown as UntypedRpc;

/** "45s", "10m 09s", "1h 02m" — the kit's one duration formatter. Pure. */
export const durationWords = (ms: number): string => formatDurationMs(ms, { style: "compact" });

/** "Took 10m 09s". Pure. */
export const tookWords = (ms: number): string => `Took ${durationWords(ms)}`;

/** A typical length, rounded the way a person says it: "~40s", "~2 min", "~1h 2m". Pure. */
export const roughDurationWords = (ms: number): string =>
  `~${ms < 60_000 ? formatDurationMs(ms, { style: "compact" }) : formatDurationMs(ms, { style: "coarse", round: "nearest" })}`;

/** "Usually ~2 min". Pure. */
export const usuallyWords = (ms: number): string => `Usually ${roughDurationWords(ms)}`;

export interface SourceSpeed {
  typicalMs: number;
  p95Ms: number;
  runs: number;
}

/** One finished run is not "usual". */
const USUAL_FROM_RUNS = 2;

interface SpeedRow {
  source_key: string;
  typical_ms: number | null;
  p95_ms: number | null;
  runs: number | null;
}

/** The door's rows → a map by source, keeping only sources with enough finished runs. Pure. */
export function speedsByKey(rows: readonly SpeedRow[] | null | undefined): Record<string, SourceSpeed> {
  const out: Record<string, SourceSpeed> = {};
  for (const r of rows ?? []) {
    if (!r?.source_key || r.typical_ms == null || (r.runs ?? 0) < USUAL_FROM_RUNS) continue;
    out[r.source_key] = { typicalMs: r.typical_ms, p95Ms: r.p95_ms ?? r.typical_ms, runs: r.runs ?? 0 };
  }
  return out;
}

export const typicalSpeedsKey = ["data-sources", "typical-speeds"] as const;

/** Every source's usual speed, in ONE read shared by the cards and the runs (a small list: sources with runs). */
export function useTypicalSpeeds() {
  return useQuery({
    queryKey: typicalSpeedsKey,
    queryFn: async (): Promise<Record<string, SourceSpeed>> => {
      const { data, error } = await scraperRpc().rpc("data_fetch_typical_speed", { p_source_keys: null });
      if (error) throw operationFailed("read how long data sources usually take", error);
      return speedsByKey(data as SpeedRow[] | null);
    },
    staleTime: 5 * 60_000,
  });
}

/** One source's usual speed (from the shared read). */
export function useTypicalSpeed(sourceKey: string | null | undefined): SourceSpeed | null {
  const speeds = useTypicalSpeeds();
  return sourceKey ? (speeds.data?.[sourceKey] ?? null) : null;
}

export type FetchMethod = "live_scrape" | "dataset" | "api";

export interface SourceMethod {
  provider: string | null;
  method: FetchMethod | null;
  method_words: string;
}

/** Admin only: how every source gets its records ({ key: {provider, method} }), one read. */
export function useSourceMethods(enabled: boolean) {
  return useQuery({
    queryKey: ["data-sources", "source-methods"],
    queryFn: async (): Promise<Record<string, SourceMethod>> => {
      const { data, error } = await scraperRpc().rpc("data_source_methods");
      if (error) throw operationFailed("read how data sources get their records", error);
      return (data as Record<string, SourceMethod> | null) ?? {};
    },
    enabled,
    staleTime: 10 * 60_000,
  });
}

export interface UnderTheHoodAttempt {
  seq: number;
  provider: string | null;
  outcome: string | null;
  error_class: string | null;
  http_status: number | null;
  latency_ms: number | null;
  vendor_cost_usd: number | string | null;
  units: number | string | null;
}

export interface UnderTheHoodRun {
  job_id: string;
  source_key: string;
  source_label: string | null;
  status: string;
  provider: string | null;
  method: FetchMethod | null;
  method_words: string;
  request: { method?: string; endpoint?: string | null; params?: unknown; body?: unknown; auth?: string; then?: string[] } | null;
  vendor_job_id: string | null;
  dataset_id: string | null;
  stages: Record<"queued" | "sent" | "provider_ready" | "collected" | "saved" | "done", string | null>;
  stage_log: { stage: string; at: string }[];
  duration_ms: number | null;
  records: { requested: number; delivered: number | null; matched: number | null; billed: number; saved_new: number; saved_updated: number };
  attempts: UnderTheHoodAttempt[];
  retries: number;
  store_attempts: unknown;
  empty_reason: string | null;
  error_code: string | null;
  error: string | null;
  door: string | null;
  vendor_cost_usd: number | string | null;
  charged_usd: number | string | null;
  points: number | null;
}

/** Admin only: one run, everything that ran under it. Re-read while the run is open. */
export function useUnderTheHood(jobId: string | null | undefined, enabled: boolean, open = false) {
  return useQuery({
    queryKey: ["data-sources", "under-the-hood", jobId ?? null],
    queryFn: async (): Promise<UnderTheHoodRun | null> => {
      const { data, error } = await scraperRpc().rpc("data_fetch_under_the_hood", { p_job_id: jobId });
      if (error) throw operationFailed("read what ran for this fetch", error);
      return (data as UnderTheHoodRun | null) ?? null;
    },
    enabled: enabled && Boolean(jobId),
    refetchInterval: open ? 5000 : false,
    staleTime: 0,
  });
}

/** The stage timeline in order, each with how long it took after the one before. Pure. */
export function stageTimeline(stages: UnderTheHoodRun["stages"]): { stage: string; label: string; at: string; tookMs: number | null }[] {
  const order: [keyof UnderTheHoodRun["stages"], string][] = [
    ["queued", "Queued"],
    ["sent", "Sent to provider"],
    ["provider_ready", "Provider ready"],
    ["collected", "Collected"],
    ["saved", "Saved"],
    ["done", "Done"],
  ];
  const out: { stage: string; label: string; at: string; tookMs: number | null }[] = [];
  let prev: number | null = null;
  for (const [key, label] of order) {
    const at = stages?.[key];
    if (!at) continue;
    const t = Date.parse(at);
    out.push({ stage: key, label, at, tookMs: prev == null ? null : Math.max(0, t - prev) });
    prev = t;
  }
  return out;
}

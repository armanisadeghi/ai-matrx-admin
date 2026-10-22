"use client";

/**
 * The library's fetch runs, read client-direct from `scraper.data_fetch_job` under RLS (the row the
 * server writes as the run moves: status, then the table it fills, then the counts). Three reads:
 *
 * - `useDataFetchJob(id)` — one run, re-read every few seconds while it is open, so the page learns
 *   the table the moment the server names it and the rows can fill inline as they land;
 * - `useOpenJob(sourceKey)` — the newest open run of a source, for reconnecting after a reload;
 * - `usePastRuns(sourceKeys)` — the earlier runs of a source (or every source of a task), newest first.
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RecordFilter } from "@ai-matrx/records";

import { createClient } from "@/utils/supabase/client";
import { getJob, getJobRowKeys } from "../server";
import { useLibraryOrganizationId } from "./hooks";

export const OPEN_STATUSES = ["queued", "fetching", "waiting_for_provider", "storing"] as const;

export const isOpenStatus = (status: string | null | undefined): boolean =>
  !!status && (OPEN_STATUSES as readonly string[]).includes(status);

export interface FetchJobRow {
  id: string;
  source_key: string;
  status: string;
  table_id: string | null;
  table_name: string | null;
  rows_created: number;
  rows_updated: number;
  inputs: unknown;
  max_records: number;
  error: string | null;
  created_at: string;
  finished_at: string | null;
  /** The table's key column (its NAME). */
  key_column: string | null;
  /** The store's field KEY of that column ("place_id"), the short word the server wrote beside the run's keys. */
  row_key_field: string | null;
  /** The worker's lease on an open run; lapsed = nobody is advancing it. */
  lease_until: string | null;
}

export const JOB_COLUMNS =
  "id, source_key, status, table_id, table_name, rows_created, rows_updated, inputs, max_records, error, created_at, finished_at, key_column, lease_until, row_key_field:metadata->>row_key_field";

const POLL_OPEN_MS = 3000;

export const fetchJobKey = (jobId: string | null) => ["data-sources", "job-row", jobId] as const;
export const pastRunsKey = (sourceKeys: readonly string[]) => ["data-sources", "past-runs", [...sourceKeys].sort().join(",")] as const;
export const PAST_RUNS_PREFIX = ["data-sources", "past-runs"] as const;

// Widened to a plain string: the typed select parser cannot read the `metadata->>` alias (TS2589).
const COLUMNS: string = JOB_COLUMNS;

const jobs = () => createClient().schema("scraper").from("data_fetch_job");

/** One run's row; re-read while it is open (the table appears mid-run, the counts at the end). */
export function useDataFetchJob(jobId: string | null) {
  return useQuery({
    queryKey: fetchJobKey(jobId),
    queryFn: async (): Promise<FetchJobRow | null> => {
      const { data, error } = await jobs().select(COLUMNS).eq("id", jobId ?? "").maybeSingle();
      if (error) throw error;
      return (data as unknown as FetchJobRow | null) ?? null;
    },
    enabled: Boolean(jobId),
    refetchInterval: (q) => (isOpenStatus((q.state.data as FetchJobRow | null | undefined)?.status) ? POLL_OPEN_MS : false),
    staleTime: 0,
  });
}

/** How the grid relates to one run: its own rows, rows still to come, or (honestly) the whole shared table. */
export type RunScope = "this-run" | "coming" | "all-rows";

const KEYS_PAGE = 2000;

export const runKeysKey = (jobId: string | null, status: string | null | undefined, rows: number) =>
  ["data-sources", "run-row-keys", jobId, isOpenStatus(status) ? "open" : "closed", rows] as const;

/**
 * The keys of the rows ONE run stored, read only for the run on view (never with the Past runs list):
 * the server pages them out of their own table so a run of thousands of rows costs the list nothing.
 * Re-read while the run is open, so the rows land in the grid as they are stored.
 */
export function useRunRowKeys(job: Pick<FetchJobRow, "id" | "status" | "rows_created" | "rows_updated"> | null | undefined) {
  const organizationId = useLibraryOrganizationId();
  return useQuery({
    queryKey: runKeysKey(job?.id ?? null, job?.status, (job?.rows_created ?? 0) + (job?.rows_updated ?? 0)),
    queryFn: async (): Promise<string[]> => {
      const keys: string[] = [];
      for (;;) {
        const page = await getJobRowKeys(job?.id ?? "", { organizationId: organizationId ?? "", offset: keys.length, limit: KEYS_PAGE });
        keys.push(...page.keys);
        if (page.keys.length === 0 || keys.length >= page.total) break;
      }
      return keys;
    },
    enabled: Boolean(job?.id) && Boolean(organizationId),
    refetchInterval: isOpenStatus(job?.status) ? POLL_OPEN_MS : false,
    staleTime: 0,
  });
}

/**
 * The grid filter that shows only this run's rows: every run of a source writes one shared table, so
 * the rows are told apart by the keys the server recorded for the run. A list value is "is either" to
 * the store's filter (a record holding any of the keys). Null when the run has no keys to filter by.
 * Pure.
 */
export function runRowFilter(job: Pick<FetchJobRow, "row_key_field"> | null | undefined, keys: readonly string[] | null | undefined): RecordFilter | null {
  // The store's filter reads the field KEY ("place_id"), which the server wrote beside the keys; the
  // job's key_column is the column's NAME ("Place Id") and the store refuses it as a filter key.
  const field = typeof job?.row_key_field === "string" && job.row_key_field ? job.row_key_field : null;
  if (!field || !keys || keys.length === 0) return null;
  // The store reads a list as "is either" on any column; its TS type only names the scalar forms.
  return { [field]: [...keys] } as unknown as RecordFilter;
}

/**
 * Which rows the grid may honestly show for this run. A run still filling with no stored rows yet is
 * "coming" (the skeleton holds the place); a run whose keys cannot be told (older than per-run results,
 * or its key field never resolved) is "all-rows", and the page must SAY so. Pure.
 */
export function runScope(
  job: Pick<FetchJobRow, "key_column" | "row_key_field" | "status"> | null | undefined,
  keys: readonly string[] | null | undefined,
): RunScope {
  if (runRowFilter(job, keys)) return "this-run";
  if (isOpenStatus(job?.status) && (job?.key_column || job?.row_key_field)) return "coming";
  return "all-rows";
}

/** How long past its lease an open run waits before the page asks the server to look at it. */
export const STALLED_AFTER_MS = 15_000;
const NUDGE_EVERY_MS = 30_000;

/** An open run whose worker lease has lapsed: nothing is advancing it. Pure. */
export function isStalled(job: Pick<FetchJobRow, "status" | "lease_until"> | null | undefined, now: number = Date.now()): boolean {
  if (!job || !isOpenStatus(job.status) || !job.lease_until) return false;
  const lease = Date.parse(job.lease_until);
  return Number.isFinite(lease) && now - lease > STALLED_AFTER_MS;
}

/**
 * The page reads runs straight from the table, so nothing on the server learns that a run's worker is
 * gone (a restart mid-run). A stalled run is therefore shown to the server, whose read finishes a paid
 * run or closes one that never reached the provider (and says so on the run). Re-asked every 30 s.
 */
export function useResumeStalledRun(job: Pick<FetchJobRow, "id" | "status" | "lease_until"> | null | undefined) {
  const organizationId = useLibraryOrganizationId();
  const queryClient = useQueryClient();
  const jobId = job?.id ?? null;
  const stalled = isStalled(job);
  useEffect(() => {
    if (!jobId || !stalled || !organizationId) return;
    const nudge = () => {
      void getJob(jobId, { organizationId })
        .catch(() => undefined) // the next tick asks again; the run's own row says what is true
        .finally(() => void queryClient.invalidateQueries({ queryKey: fetchJobKey(jobId) }));
    };
    nudge();
    const timer = setInterval(nudge, NUDGE_EVERY_MS);
    return () => clearInterval(timer);
  }, [jobId, stalled, organizationId, queryClient]);
}

/** The newest open fetch of this source (read under RLS), for reconnect after a reload. */
export function useOpenJob(sourceKey: string) {
  return useQuery({
    queryKey: ["data-sources", "open-job", sourceKey],
    queryFn: async (): Promise<string | null> => {
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data, error } = await jobs()
        .select("id")
        .eq("source_key", sourceKey)
        .in("status", [...OPEN_STATUSES])
        .gte("created_at", since)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as { id?: string } | null)?.id ?? null;
    },
    staleTime: 0,
  });
}

const PAST_RUNS_LIMIT = 50;

/** Earlier runs of these sources, newest first (what RLS lets this person read). */
export function usePastRuns(sourceKeys: readonly string[]) {
  return useQuery({
    queryKey: pastRunsKey(sourceKeys),
    queryFn: async (): Promise<FetchJobRow[]> => {
      const { data, error } = await jobs()
        .select(COLUMNS)
        .in("source_key", [...sourceKeys])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAST_RUNS_LIMIT);
      if (error) throw error;
      return (data as unknown as FetchJobRow[] | null) ?? [];
    },
    enabled: sourceKeys.length > 0,
    staleTime: 15_000,
  });
}

/** What the run asked for, in the person's own words ("plumbers · Austin, TX"). Pure. */
export function inputsText(inputs: unknown): string {
  const sets = Array.isArray(inputs) ? inputs : inputs && typeof inputs === "object" ? [inputs] : [];
  const words: string[] = [];
  for (const set of sets) {
    if (!set || typeof set !== "object") continue;
    for (const v of Object.values(set as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) words.push(v.trim());
      else if (typeof v === "number" && Number.isFinite(v)) words.push(String(v));
    }
  }
  return words.join(" · ");
}

/** The run's plain status word. */
export function runStatusLabel(status: string): string {
  if (status === "done") return "Done";
  if (status === "failed" || status === "error" || status === "refused") return "Failed";
  if (status === "cancelled") return "Stopped";
  if (status === "queued") return "Queued";
  if (status === "fetching") return "Sending your request";
  if (status === "waiting_for_provider") return "Collecting at the source";
  if (status === "storing") return "Saving rows";
  if (isOpenStatus(status)) return "Running";
  return status;
}

/** Finished runs sampled to learn how long a source usually takes. */
const TYPICAL_SAMPLE = 30;

/** The median of the finished runs' lengths, in ms; null when fewer than two finished (one is not "typical"). Pure. */
export function medianRunMs(runs: ReadonlyArray<Pick<FetchJobRow, "status" | "created_at" | "finished_at">>): number | null {
  const lengths = runs
    .filter((r) => r.status === "done" && r.finished_at)
    .map((r) => Date.parse(r.finished_at as string) - Date.parse(r.created_at))
    .filter((ms) => Number.isFinite(ms) && ms > 0)
    .sort((a, b) => a - b);
  if (lengths.length < 2) return null;
  const mid = Math.floor(lengths.length / 2);
  return lengths.length % 2 ? lengths[mid] : Math.round((lengths[mid - 1] + lengths[mid]) / 2);
}

/** How long this source usually takes (median of its finished runs under RLS), for the in-flight hint. */
export function useTypicalRunMs(sourceKey: string | null | undefined) {
  return useQuery({
    queryKey: ["data-sources", "typical-run-ms", sourceKey ?? null],
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await jobs()
        .select("status, created_at, finished_at")
        .eq("source_key", sourceKey ?? "")
        .eq("status", "done")
        .is("deleted_at", null)
        .not("finished_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(TYPICAL_SAMPLE);
      if (error) throw error;
      return medianRunMs((data as unknown as FetchJobRow[] | null) ?? []);
    },
    enabled: Boolean(sourceKey),
    staleTime: 5 * 60_000,
  });
}

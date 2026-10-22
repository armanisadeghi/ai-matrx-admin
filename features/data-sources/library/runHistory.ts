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

import { useQuery } from "@tanstack/react-query";
import type { RecordFilter } from "@ai-matrx/records";

import { createClient } from "@/utils/supabase/client";

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
  /** The table's key column and, in `metadata.row_keys`, the keys of the rows THIS run stored. */
  key_column: string | null;
  metadata: unknown;
}

const JOB_COLUMNS =
  "id, source_key, status, table_id, table_name, rows_created, rows_updated, inputs, max_records, error, created_at, finished_at, key_column, metadata";

const POLL_OPEN_MS = 3000;

export const fetchJobKey = (jobId: string | null) => ["data-sources", "job-row", jobId] as const;
export const pastRunsKey = (sourceKeys: readonly string[]) => ["data-sources", "past-runs", [...sourceKeys].sort().join(",")] as const;
export const PAST_RUNS_PREFIX = ["data-sources", "past-runs"] as const;

const jobs = () => createClient().schema("scraper").from("data_fetch_job");

/** One run's row; re-read while it is open (the table appears mid-run, the counts at the end). */
export function useDataFetchJob(jobId: string | null) {
  return useQuery({
    queryKey: fetchJobKey(jobId),
    queryFn: async (): Promise<FetchJobRow | null> => {
      const { data, error } = await jobs().select(JOB_COLUMNS).eq("id", jobId ?? "").maybeSingle();
      if (error) throw error;
      return (data as FetchJobRow | null) ?? null;
    },
    enabled: Boolean(jobId),
    refetchInterval: (q) => (isOpenStatus((q.state.data as FetchJobRow | null | undefined)?.status) ? POLL_OPEN_MS : false),
    staleTime: 0,
  });
}

/**
 * The grid filter that shows only this run's rows: every run of a source writes one shared table, so
 * the rows are told apart by the keys the server recorded on the job. A list value is "is either" to
 * the store's filter (a record holding any of the keys). Null when the job has no keys to filter by
 * (a run from before they were kept shows the whole table, as it always did). Pure.
 */
export function runRowFilter(job: Pick<FetchJobRow, "key_column" | "metadata"> | null | undefined): RecordFilter | null {
  const column = job?.key_column;
  const meta = job?.metadata;
  const keys = meta && typeof meta === "object" ? (meta as { row_keys?: unknown }).row_keys : null;
  if (!column || !Array.isArray(keys) || keys.length === 0) return null;
  // The store reads a list as "is either" on any column; its TS type only names the scalar forms.
  return { [column]: keys } as unknown as RecordFilter;
}

/** True when the job names a key column but has stored no keys yet (a run still filling). */
export const runHasNoRowsYet = (job: Pick<FetchJobRow, "key_column" | "metadata" | "status"> | null | undefined): boolean =>
  Boolean(job?.key_column) && runRowFilter(job) === null && isOpenStatus(job?.status);

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
        .select(JOB_COLUMNS)
        .in("source_key", [...sourceKeys])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAST_RUNS_LIMIT);
      if (error) throw error;
      return (data as FetchJobRow[] | null) ?? [];
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
  if (status === "fetching") return "Fetching";
  if (status === "waiting_for_provider") return "Waiting";
  if (status === "storing") return "Saving";
  if (isOpenStatus(status)) return "Running";
  return status;
}

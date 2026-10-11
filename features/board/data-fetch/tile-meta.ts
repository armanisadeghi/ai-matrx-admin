/**
 * What a "Get data" Table tile remembers on the board (pure). A tile source's `meta` holds strings
 * only, so the record is one JSON string under `data_fetch`:
 *   before the table exists: the chosen source, its field values, how many, and the running job;
 *   after: where the rows came from (source, input, when, how many) — the source bar reads it.
 */

import type { NodeSource } from "../board/document";
import type { DataFetchInput, DataFetchResult } from "../../data-sources/contract";

export const DATA_FETCH_META_KEY = "data_fetch";

export interface DataFetchDraft {
  sourceKey?: string;
  values?: Record<string, string>;
  count?: number;
  /** The job the server is running for this tile (reconnect after a reload). */
  jobId?: string;
  /** What Fetch asked for (the provenance is built from it when the job ends). */
  request?: DataFetchRequest;
}

export interface DataFetchRequest {
  sourceKey: string;
  sourceLabel: string;
  input: DataFetchInput;
  count: number;
}

export interface DataFetchProvenance {
  sourceKey: string;
  sourceLabel: string;
  input: DataFetchInput;
  count: number;
  fetchedAt: string;
  rows: number;
  jobId?: string;
  valuesAsText?: number;
  limitApplied?: { setting: string; value: number } | null;
}

export interface DataFetchTileMeta {
  draft?: DataFetchDraft;
  fetched?: DataFetchProvenance;
}

export function readDataFetchMeta(meta: Record<string, string> | undefined): DataFetchTileMeta | null {
  const raw = meta?.[DATA_FETCH_META_KEY];
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as DataFetchTileMeta) : null;
  } catch {
    return null;
  }
}

export function withDataFetchMeta(meta: Record<string, string> | undefined, next: DataFetchTileMeta): Record<string, string> {
  return { ...(meta ?? {}), [DATA_FETCH_META_KEY]: JSON.stringify(next) };
}

export function provenanceOf(
  result: DataFetchResult,
  req: DataFetchRequest,
  previous?: DataFetchProvenance,
  now: Date = new Date(),
): DataFetchProvenance {
  return {
    sourceKey: req.sourceKey,
    sourceLabel: req.sourceLabel,
    input: req.input,
    count: req.count,
    fetchedAt: now.toISOString(),
    rows: (previous?.rows ?? 0) + result.rows_created,
    jobId: result.job_id || undefined,
    valuesAsText: result.values_as_text,
    limitApplied: result.limit_applied,
  };
}

/** A "Get data" tile: a Table tile (`data-table`, no id yet) that starts as the fetch panel. */
export function getDataSource(draft: DataFetchDraft = {}): NodeSource {
  return { kind: "entity", entity: "data-table", id: null, meta: withDataFetchMeta(undefined, { draft }) };
}

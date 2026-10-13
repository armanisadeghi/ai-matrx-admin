/**
 * What the fetched-table bar says, as plain functions (tested without a screen). The row count is the
 * TABLE's real live count; the last job's counts are only "this refresh: N new · M changed".
 */

import { hasChanges, summaryParts } from "./changes";
import { isOpenJob, type DataFetchSpec } from "./contract";

export interface BarFactsInput {
  /** The table's real live row count (null while unknown). */
  liveRows: number | null;
  spec: DataFetchSpec | null;
  /** A host's memory of the fetch (the board tile) — a fallback only while the live count is unknown. */
  rememberedRows?: number | null;
  /** What a plain Refresh re-fetches (the stored count). */
  refreshCount: number;
  /** The size cap per fetch, when the organization has one. */
  limit: number | null;
  /** True while this tab's own refresh is streaming. */
  runBusy: boolean;
}

export interface BarFacts {
  rows: number;
  refreshCount: number;
  allCount: number;
  showAll: boolean;
  busy: boolean;
  /** The finished job whose change set "View changes" opens; null when there is none to open. */
  changesJob: DataFetchSpec | null;
  changesLabel: string | null;
  changesFlag: "some" | "none" | null;
  /** "this refresh: N new · M changed" from the last finished job. */
  thisRefresh: string | null;
}

export function barFacts(i: BarFactsInput): BarFacts {
  const spec = i.spec;
  const rows = i.liveRows ?? i.rememberedRows ?? (spec ? spec.rowsCreated + spec.rowsUpdated : 0);
  const refreshCount = i.refreshCount;
  const allCount = Math.min(rows, i.limit ?? rows);
  const showAll = rows > refreshCount && allCount > refreshCount;
  const busy = i.runBusy || isOpenJob(spec?.status);
  const done = spec?.status === "done" ? spec : (spec?.lastDone ?? null);
  const parts = summaryParts(done?.changes ?? null);
  const some = hasChanges(done?.changes ?? null);
  return {
    rows,
    refreshCount,
    allCount,
    showAll,
    busy,
    changesJob: parts ? done : null,
    changesLabel: parts ? (some ? parts.join(" · ") : "Nothing changed") : null,
    changesFlag: parts ? (some ? "some" : "none") : null,
    thisRefresh: parts ? `this refresh: ${parts.join(" · ")}` : null,
  };
}

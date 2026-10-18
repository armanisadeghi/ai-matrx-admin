/**
 * backgroundRun — what a long background copy started by the `records` tool (`notion_sync`
 * with `import_root`, or a mapping with `background: true`) IS right now, read from the durable
 * workflow run it started (system workflow `notion_import`, node `import`, or `mapped_sync`,
 * node `sync`). Pure: no React, no Redux — `BackgroundRunCard` draws it.
 *
 * The run is the truth, never the tool answer: the run outlives the turn, and the same card is
 * drawn again when the conversation is reopened, from the `run_id` in the persisted answer.
 *
 *  - Progress arrives as `node_progress` (`message` "<step>: <detail>", `current`, `total`).
 *    An import walks six named stages; `total` GROWS while reading discovers pages, and a late
 *    "columns" pass follows "rows". So the bar is a RATCHET: the stage never steps back and the
 *    fill never shrinks (streamed shapes only move forward).
 *  - A mapped copy reports "Slice N: X added, Y updated so far" with no total: the bar is the
 *    indeterminate sweep until it ends.
 *  - When it ends, the node's output is the report (import: tables / counts / losses; copy:
 *    added / updated / archived / conflicts). A stopped run names the server's own sentence.
 */

import type { NodeInvocationState, WorkflowRunState } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import { runIsOver } from "@/features/workflow-runtime/types";

export type BackgroundRunKind = "import" | "copy";

/** The import's stages, in the order the importer walks them (aidream `notion_import.progress`). */
export const IMPORT_STAGES = [
  { id: "reading", label: "Reading" },
  { id: "tables", label: "Tables" },
  { id: "columns", label: "Columns" },
  { id: "rows", label: "Rows" },
  { id: "pages", label: "Pages" },
  { id: "report", label: "Report" },
] as const;

/** The node each system workflow runs its one step on. */
const NODE_OF: Record<BackgroundRunKind, string> = { import: "import", copy: "sync" };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

// ── the progress line ──────────────────────────────────────────────────────────

export interface ProgressSample {
  /** Index into IMPORT_STAGES, or null (a copy, or a message with no known stage). */
  stageIndex: number | null;
  /** What it is on right now, one short line. */
  detail: string | null;
  current: number | null;
  total: number | null;
}

/** "rows: Players" → stage 3, "Players". A copy's "Slice 2: …" is all detail. */
export function readProgressMessage(kind: BackgroundRunKind, message: string | null): Pick<ProgressSample, "stageIndex" | "detail"> {
  const text = str(message);
  if (!text) return { stageIndex: null, detail: null };
  if (kind === "import") {
    const colon = text.indexOf(":");
    const head = (colon >= 0 ? text.slice(0, colon) : text).trim().toLowerCase();
    const index = IMPORT_STAGES.findIndex((stage) => stage.id === head);
    if (index >= 0) return { stageIndex: index, detail: colon >= 0 ? str(text.slice(colon + 1)) : null };
  }
  return { stageIndex: null, detail: text };
}

// ── the ratchet ────────────────────────────────────────────────────────────────

export interface ProgressRatchet {
  /** The furthest stage reached (−1: none yet). */
  stageIndex: number;
  /** The furthest overall fill reached, 0..1. */
  fraction: number;
}

export const RATCHET_START: ProgressRatchet = { stageIndex: -1, fraction: 0 };

/**
 * The overall fill a sample stands for: each stage is an equal slice of the bar, filled by its
 * own done / total. Null when the sample says nothing measurable.
 */
export function sampleFraction(sample: ProgressSample, stageCount: number = IMPORT_STAGES.length): number | null {
  const part = sample.current != null && sample.total != null && sample.total > 0
    ? Math.min(1, Math.max(0, sample.current / sample.total))
    : null;
  if (sample.stageIndex == null) return part;
  return (sample.stageIndex + (part ?? 0)) / stageCount;
}

/**
 * The next ratchet: never a step back, never a shrinking bar. Returns `prev` itself when nothing
 * moves forward, so a caller holding it in state does not re-render.
 */
export function advanceRatchet(
  prev: ProgressRatchet,
  sample: ProgressSample | null,
  finished: boolean,
  stageCount: number = IMPORT_STAGES.length,
): ProgressRatchet {
  if (finished) {
    const done = { stageIndex: Math.max(prev.stageIndex, stageCount - 1), fraction: 1 };
    return done.stageIndex === prev.stageIndex && prev.fraction === 1 ? prev : done;
  }
  if (!sample) return prev;
  const stageIndex = Math.max(prev.stageIndex, sample.stageIndex ?? -1);
  const fraction = Math.max(prev.fraction, Math.min(0.99, sampleFraction(sample, stageCount) ?? 0));
  return stageIndex === prev.stageIndex && fraction === prev.fraction ? prev : { stageIndex, fraction };
}

// ── the reports ────────────────────────────────────────────────────────────────

export interface ImportLoss {
  kind: string | null;
  item: string;
  reason: string | null;
}

export interface ImportReport {
  kind: "import";
  /** Table ids the import made, in the order Notion listed their databases. */
  tableIds: string[];
  /** What came over, by what ("rows" 431, "pages" 12 …), zero counts dropped. */
  counts: { label: string; count: number }[];
  different: ImportLoss[];
  notCarried: ImportLoss[];
  reportTableId: string | null;
}

export interface CopyReport {
  kind: "copy";
  added: number;
  updated: number;
  archived: number;
  /** Per table, from the last slice's summary, when it names any. */
  perTable: { tableId: string | null; name: string | null; added: number; updated: number; archived: number }[];
  conflicts: number;
  finished: boolean;
}

function losses(list: unknown): ImportLoss[] {
  if (!Array.isArray(list)) return [];
  const out: ImportLoss[] = [];
  for (const raw of list) {
    const entry = obj(raw);
    const item = str(entry?.item);
    if (!entry || !item) continue;
    out.push({ kind: str(entry.kind), item, reason: str(entry.reason) });
  }
  return out;
}

export function readImportReport(output: Record<string, unknown> | null): ImportReport | null {
  if (!output) return null;
  const tables = obj(output.tables);
  if (!tables && !obj(output.counts)) return null;
  const counts = Object.entries(obj(output.counts) ?? {})
    .map(([label, count]) => ({ label, count: num(count) ?? 0 }))
    .filter((entry) => entry.count > 0);
  return {
    kind: "import",
    tableIds: Object.values(tables ?? {}).filter((id): id is string => typeof id === "string" && id.length > 0),
    counts,
    different: losses(output.came_with_a_difference),
    notCarried: losses(output.not_carried),
    reportTableId: str(output.report_table_id),
  };
}

function countOf(value: unknown): number {
  return num(value) ?? 0;
}

export function readCopyReport(output: Record<string, unknown> | null): CopyReport | null {
  if (!output || (output.added === undefined && output.updated === undefined && output.finished === undefined)) return null;
  // The last slice's summary is per job, one table each (aidream `SyncReport.summary()`):
  // `jobs: [{table, table_id, created, adopted, updated, archived}]`.
  const jobs = obj(output.summary)?.jobs;
  const perTable: CopyReport["perTable"] = [];
  for (const raw of Array.isArray(jobs) ? jobs : []) {
    const job = obj(raw);
    if (!job) continue;
    perTable.push({
      tableId: str(job.table_id),
      name: str(job.table),
      added: countOf(job.created) + countOf(job.adopted),
      updated: countOf(job.updated),
      archived: countOf(job.archived),
    });
  }
  return {
    kind: "copy",
    added: countOf(output.added),
    updated: countOf(output.updated),
    archived: countOf(output.archived),
    perTable,
    conflicts: Array.isArray(output.conflicts) ? output.conflicts.length : 0,
    finished: output.finished === true,
  };
}

// ── the whole view ─────────────────────────────────────────────────────────────

export type BackgroundRunPhase = "opening" | "waiting" | "working" | "finished" | "stopped";

export interface BackgroundRunView {
  kind: BackgroundRunKind;
  phase: BackgroundRunPhase;
  /** What is being brought in, when the run says (its `name` / the mapping's name). */
  name: string | null;
  sample: ProgressSample | null;
  /** ISO time of the last progress, for "last moved Xs ago". */
  lastMovedAt: string | null;
  startedAt: string | null;
  /** The run's end, once it is over. */
  endedAt: string | null;
  report: ImportReport | CopyReport | null;
  /** The server's own sentence for a stopped run. */
  stoppedBecause: string | null;
  /** Why the run cannot be read right now (never the run's own failure). */
  readFailure: string | null;
}

/** Which copy this run is, from what it was started with, else its node. */
export function runKindOf(run: Pick<WorkflowRunState, "input" | "nodeOrder"> | null, hint: BackgroundRunKind | null): BackgroundRunKind {
  const input = run?.input ?? null;
  if (input && ("root" in input)) return "import";
  if (input && ("map" in input)) return "copy";
  if (run?.nodeOrder.includes("import")) return "import";
  if (run?.nodeOrder.includes("sync")) return "copy";
  return hint ?? "import";
}

function nodeInvocation(run: WorkflowRunState, nodeId: string): NodeInvocationState | null {
  const keys = run.nodeAggregates[nodeId]?.invocationKeys ?? [];
  for (let i = keys.length - 1; i >= 0; i--) {
    const invocation = run.nodes[keys[i]];
    if (invocation) return invocation;
  }
  return null;
}

function errorSentence(error: Record<string, unknown> | null | undefined): string | null {
  if (!error) return null;
  return str(error.message) ?? str(obj(error.error)?.message) ?? null;
}

export function readBackgroundRun(run: WorkflowRunState | null, hint: BackgroundRunKind | null): BackgroundRunView {
  const kind = runKindOf(run, hint);
  const empty: BackgroundRunView = {
    kind, phase: "opening", name: null, sample: null, lastMovedAt: null, startedAt: null, endedAt: null,
    report: null, stoppedBecause: null, readFailure: null,
  };
  if (!run) return empty;
  const input = run.input ?? {};
  const name = kind === "import" ? str(input.name) : str(obj(input.map)?.name);
  const node = nodeInvocation(run, NODE_OF[kind]);
  const progress = node?.progress ?? null;
  const sample: ProgressSample | null = progress
    ? { ...readProgressMessage(kind, progress.message), current: progress.current, total: progress.total }
    : null;
  const over = runIsOver(run.status);
  const output = node?.output ?? null;
  // A copy that stopped part-way keeps its counts in the failure's details.
  const details = obj(node?.error?.details);
  const report = kind === "import" ? readImportReport(output) : readCopyReport(output ?? details);
  const failed = over && run.status !== "completed";
  const phase: BackgroundRunPhase = !run.statusKnown
    ? "opening"
    : over
      ? (failed || node?.phase === "failed" ? "stopped" : "finished")
      : run.status === "pending" && !progress
        ? "waiting"
        : "working";
  return {
    kind,
    phase,
    name,
    sample,
    lastMovedAt: progress?.ts ?? node?.startedAt ?? run.startedAtTs,
    startedAt: run.startedAtTs,
    endedAt: over ? run.statusTs : null,
    report,
    stoppedBecause: phase === "stopped" ? (str(node?.error?.message) ?? errorSentence(run.error)) : null,
    readFailure: run.readFailure,
  };
}

// ── words ──────────────────────────────────────────────────────────────────────

/** "Last moved" only says something once the quiet is long enough to wonder about. */
export const QUIET_AFTER_MS = 20_000;

export const STATUS_WORD: Record<BackgroundRunPhase, string> = {
  opening: "Opening",
  waiting: "Queued",
  working: "Working",
  finished: "Finished",
  stopped: "Stopped",
};

export function whatToDoWhenStopped(kind: BackgroundRunKind): string {
  return kind === "import"
    ? "Run it again; nothing is copied twice."
    : "Run it again to continue; finished rows are kept.";
}

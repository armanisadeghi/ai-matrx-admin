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
 *    An import walks nine named stages; `total` GROWS while reading discovers pages, and a late
 *    "columns" pass follows "rows". So the bar is a RATCHET: the stage never steps back and the
 *    fill never shrinks (streamed shapes only move forward).
 *  - A mapped copy reports "Slice N: X added, Y updated so far" with no total: the bar is the
 *    indeterminate sweep until it ends.
 *  - When it ends, the node's output is the report (import: tables / counts / losses; copy:
 *    added / updated / archived / conflicts). A stopped run names the server's own sentence.
 */

import { isShutdownCancel, type NodeInvocationState, type WorkflowRunState } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import { runIsOver } from "@/features/workflow-runtime/types";
import { LOOK_ACTIONS, lookActionOf, lookTitle, type LookAction } from "./lookActions";

/** "look": a late notion_sync call (a preview, a find, Sync now …) run in the background — moves nothing it does not say. */
export type BackgroundRunKind = "import" | "copy" | "workflow" | "look";

/** The import's stages, in the order the importer walks them (aidream `notion_import.progress`). */
export const IMPORT_STAGES = [
  { id: "reading", label: "Reading" },
  { id: "files", label: "Files" },
  { id: "tables", label: "Tables" },
  { id: "columns", label: "Columns" },
  { id: "rows", label: "Rows" },
  { id: "views", label: "Views" },
  { id: "pages", label: "Pages" },
  { id: "comments", label: "Comments" },
  { id: "report", label: "Report" },
] as const;

/** The node each system workflow runs its one step on. */
const NODE_OF: Record<Exclude<BackgroundRunKind, "workflow">, string> = { import: "import", copy: "sync", look: "import" };

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
  /**
   * The run is held, not failing: Notion asked us to slow down, or another import holds the
   * organization's turn (aidream progress step "waiting"). Said on the active step; the stage
   * and its count stay where they were.
   */
  waiting?: boolean;
}

/** "rows: Players" → stage 4, "Players". "waiting: Notion asked …" → a hold. A copy's "Slice 2: …" is all detail. */
export function readProgressMessage(kind: BackgroundRunKind, message: string | null): Pick<ProgressSample, "stageIndex" | "detail" | "waiting"> {
  const text = str(message);
  if (!text) return { stageIndex: null, detail: null };
  if (kind === "import" || kind === "look") {
    const colon = text.indexOf(":");
    const head = (colon >= 0 ? text.slice(0, colon) : text).trim().toLowerCase();
    if (head === "waiting") return { stageIndex: null, detail: colon >= 0 ? str(text.slice(colon + 1)) : null, waiting: true };
    if (kind === "look") return { stageIndex: null, detail: text };
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

/** What a finished look found, from the server's own `look_summary`: only what that action counts. */
export interface LookReport {
  kind: "look";
  action: LookAction;
  title: string;
  /** The server's one sentence about the answer. */
  said: string | null;
  facts: { label: string; count: number }[];
  /** What may be missing, in the server's words. */
  note: string | null;
  movesSomething: boolean;
}

export function readLookReport(output: Record<string, unknown> | null, action: LookAction): LookReport | null {
  const summary = obj(output?.look_summary);
  if (!output || !summary) return null;
  const facts: LookReport["facts"] = [];
  for (const raw of Array.isArray(summary.facts) ? summary.facts : []) {
    const fact = obj(raw);
    const label = str(fact?.label);
    if (label) facts.push({ label, count: num(fact?.count) ?? 0 });
  }
  return {
    kind: "look",
    action,
    title: str(summary.title) ?? LOOK_ACTIONS[action].title,
    said: str(summary.said),
    facts,
    note: str(summary.note),
    movesSomething: summary.moves_something === true,
  };
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

/**
 * "sleeping": parked on a durable timer (flow.sleep / wait_until; interrupt payload `matrx_sleep.wake_at`),
 * resumes by itself, nothing asked of the person. "needs_you": parked on a question for the person (awaiting_input / interrupted); "paused": held
 * (paused / pausing); "cancelled": the person's own stop, not a failure. The backend never wakes the
 * chat for a park, so the card is the only signal.
 */
export type BackgroundRunPhase = "opening" | "waiting" | "working" | "needs_you" | "sleeping" | "paused" | "resuming" | "finished" | "stopped" | "cancelled";

/** What a run a release cancelled says while the recovery sweep brings it back. */
export const RESUMING_WORDS = "Paused by a server update, resuming…";

/** Over for good: a release's cancel is not (the sweep resumes it, lane UI1). */
function runEnded(run: Pick<WorkflowRunState, "status" | "cancelReason">): boolean {
  return runIsOver(run.status) && !(run.status === "cancelled" && isShutdownCancel(run.cancelReason));
}

/** A workflow run with no named stage list: how far through its steps it is. */
export interface WorkflowReport {
  kind: "workflow";
  /** Steps that finished (completed or skipped). */
  steps: number;
  /** The top-level keys of the run's output, for the one-line summary. */
  outputKeys: string[];
}

/** One generic stage per step, in the order the run started them. */
export interface WorkflowStage {
  id: string;
  label: string;
}

/** "data.mapped_sync" → "Mapped sync"; a bare node id when the step names no type. */
export function stepLabel(specType: string | null, nodeId: string): string {
  const raw = (specType ? specType.split(".").pop() : null) || nodeId;
  const words = raw.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : nodeId;
}

export function workflowStages(run: Pick<WorkflowRunState, "nodeOrder" | "nodeAggregates"> | null): WorkflowStage[] {
  if (!run) return [];
  return run.nodeOrder.map((nodeId) => ({ id: nodeId, label: stepLabel(run.nodeAggregates[nodeId]?.specType ?? null, nodeId) }));
}

const STEP_DONE: ReadonlySet<NodeInvocationState["phase"]> = new Set(["settled", "skipped"]);

/** Where a workflow run is: the furthest step started, how many steps are done, the live step's words. */
export function workflowSample(run: WorkflowRunState): { sample: ProgressSample | null; done: number; latest: NodeInvocationState | null } {
  let done = 0;
  let furthest = -1;
  let latest: NodeInvocationState | null = null;
  run.nodeOrder.forEach((nodeId, index) => {
    const invocation = nodeInvocation(run, nodeId);
    if (!invocation) return;
    if (STEP_DONE.has(invocation.phase)) done += 1;
    furthest = index;
    if (!latest || (invocation.startedAt ?? "") >= (latest.startedAt ?? "")) latest = invocation;
  });
  if (furthest < 0) return { sample: null, done, latest: null };
  const live = latest as NodeInvocationState | null;
  const progress = live?.progress ?? null;
  const label = live ? stepLabel(live.specType, live.nodeId) : null;
  return {
    sample: {
      stageIndex: furthest,
      detail: str(progress?.message) ?? label,
      current: progress?.current ?? null,
      total: progress?.total ?? null,
    },
    done,
    latest: live,
  };
}

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
  report: ImportReport | CopyReport | WorkflowReport | LookReport | null;
  /** The server's own sentence for a stopped run. */
  stoppedBecause: string | null;
  /** Why the run cannot be read right now (never the run's own failure). */
  readFailure: string | null;
  /** The question a parked run waits on, when it names one. */
  ask: string | null;
  /** ISO time a timer-parked run wakes at; null for any other run. */
  wakeAt: string | null;
}

/** Which copy this run is, from what it was started with, else its node. */
export function runKindOf(run: Pick<WorkflowRunState, "input" | "nodeOrder"> | null, hint: BackgroundRunKind | null): BackgroundRunKind {
  if (hint === "workflow") return "workflow";
  const input = run?.input ?? null;
  if (lookActionOf(input)) return "look";
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
    report: null, stoppedBecause: null, readFailure: null, ask: null, wakeAt: null,
  };
  if (!run) return empty;
  // The adapter is refolding the run's saved history (a refresh, a rejoin): those events are the
  // past arriving in order, not the run moving. Hold the opening shimmer until it lands, then the
  // first sample IS where the run is — the bar never re-walks the log from zero.
  if (run.replaying) return empty;
  if (kind === "workflow") return readWorkflowRun(run, empty);
  const input = run.input ?? {};
  const lookAction = kind === "look" ? lookActionOf(input) ?? "sync" : null;
  const name = kind === "import" ? str(input.name) : kind === "look" ? lookTitle(input, lookAction ?? "sync") : str(obj(input.map)?.name);
  const node = nodeInvocation(run, NODE_OF[kind]);
  const progress = node?.progress ?? null;
  const sample: ProgressSample | null = progress
    ? { ...readProgressMessage(kind, progress.message), current: progress.current, total: progress.total }
    : null;
  const over = runEnded(run);
  const output = node?.output ?? null;
  // A copy that stopped part-way keeps its counts in the failure's details.
  const details = obj(node?.error?.details);
  const report = kind === "import"
    ? readImportReport(output)
    : kind === "look"
      ? readLookReport(output, lookAction ?? "sync")
      : readCopyReport(output ?? details);
  const phase = phaseOf(run, progress != null, node?.phase === "failed");
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
    ask: askOf(run),
    wakeAt: wakeAtOf(run),
  };
}

/** What the parked run asks, in its own words, when the interrupt carries one. */
function askOf(run: WorkflowRunState): string | null {
  const payload = run.interrupt?.payload ?? null;
  if (!payload) return null;
  return str(payload.question) ?? str(payload.prompt) ?? str(payload.message) ?? str(payload.ask) ?? null;
}

/** A durable timer park carries `matrx_sleep` in its interrupt payload (aidream workflow_worker). */
function sleepOf(run: WorkflowRunState): Record<string, unknown> | null {
  return obj(run.interrupt?.payload?.matrx_sleep);
}

function wakeAtOf(run: WorkflowRunState): string | null {
  return run.status === "interrupted" ? str(sleepOf(run)?.wake_at) : null;
}

function phaseOf(run: WorkflowRunState, progressed: boolean, stepFailed: boolean): BackgroundRunPhase {
  if (!run.statusKnown) return "opening";
  if (run.status === "cancelled" && isShutdownCancel(run.cancelReason)) return "resuming";
  if (run.status === "cancelled") return "cancelled";
  if (runIsOver(run.status)) return run.status !== "completed" || stepFailed ? "stopped" : "finished";
  if (run.status === "interrupted" && sleepOf(run)) return "sleeping";
  if (run.status === "awaiting_input" || run.status === "interrupted") return "needs_you";
  if (run.status === "paused" || run.status === "pausing") return "paused";
  return run.status === "pending" && !progressed ? "waiting" : "working";
}

/** Any agent-started workflow run: generic stages from its steps, the run's own end. */
function readWorkflowRun(run: WorkflowRunState, empty: BackgroundRunView): BackgroundRunView {
  const { sample, done, latest } = workflowSample(run);
  const over = runEnded(run);
  const phase = phaseOf(run, sample != null, false);
  const output = obj(latest?.output);
  return {
    ...empty,
    phase,
    sample,
    lastMovedAt: latest?.progress?.ts ?? latest?.startedAt ?? run.startedAtTs,
    startedAt: run.startedAtTs,
    endedAt: over ? run.statusTs : null,
    report: over ? { kind: "workflow", steps: Math.max(done, run.stepsExecuted ?? 0), outputKeys: Object.keys(output ?? {}) } : null,
    stoppedBecause: phase === "stopped" ? (str(latest?.error?.message) ?? errorSentence(run.error)) : null,
    readFailure: run.readFailure,
    ask: askOf(run),
    wakeAt: wakeAtOf(run),
  };
}

// ── words ──────────────────────────────────────────────────────────────────────

/** "Last moved" only says something once the quiet is long enough to wonder about. */
export const QUIET_AFTER_MS = 20_000;

export const STATUS_WORD: Record<BackgroundRunPhase, string> = {
  opening: "Opening",
  waiting: "Queued",
  working: "Working",
  needs_you: "Waiting on you",
  sleeping: "Waiting",
  paused: "Paused",
  resuming: "Resuming",
  finished: "Finished",
  stopped: "Stopped",
  cancelled: "Canceled",
};

/**
 * A working run quiet this long gets its quiet time stated as a fact. The run store carries no
 * heartbeat or job lease, so the card never says anything about workers.
 */
export const STALLED_AFTER_MS = 300_000;

/** The one quiet line under the bar while a run is not over: failure, stall, or a short quiet note. */
export function quietNote(view: Pick<BackgroundRunView, "phase" | "readFailure">, quietMs: number, formatQuiet: (ms: number) => string): string {
  if (view.readFailure) return view.readFailure;
  if (view.phase === "resuming") return RESUMING_WORDS;
  if (view.phase !== "working" || quietMs < QUIET_AFTER_MS) return "";
  if (quietMs >= STALLED_AFTER_MS) return `No progress for ${formatQuiet(quietMs)}`;
  return `Still working · last moved ${formatQuiet(quietMs)} ago`;
}

export function whatToDoWhenStopped(kind: BackgroundRunKind): string {
  if (kind === "workflow") return "Open the run to see the step and continue it.";
  if (kind === "look") return "Ask again; nothing was changed by looking.";
  return kind === "import"
    ? "Run it again; nothing is copied twice."
    : "Run it again to continue; finished rows are kept.";
}

// ── the whole Notion job, as ONE list of steps (lane UI1) ──────────────────────

/**
 * A whole-Notion import is one job across up to two runs: the look that previews it (and asks the
 * ONE question when tables of the person's could be touched), then the import's own run. The chat
 * shows it as one list of every step from the start — Preview, the choice, then the import's
 * stages — each waiting, working with its count, done, or skipped with the reason.
 */
export const JOB_STEPS = [
  { id: "preview", label: "Preview" },
  { id: "choice", label: "Your tables" },
  ...IMPORT_STAGES,
] as const;

export type JobStepState = "waiting" | "working" | "needs_you" | "done" | "skipped" | "stopped";

export interface JobStep {
  id: string;
  label: string;
  state: JobStepState;
  /** "41 of 278" while working; a remembered count once done. */
  current: number | null;
  total: number | null;
  /** One short line: what it is on, the hold ("Notion asked us to slow down"), or why it was skipped. */
  note: string | null;
  /** The note is a hold, not progress. */
  held: boolean;
}

export interface ChoiceOption {
  /** The choice's own key from the server ("new" | "fill" | "replace" | "fill_overwrite" | "update"). */
  key: string;
  /** What the start is sent: "new", "fill:<table id>", "replace:<table id>" … */
  value: string;
}

export interface ChoiceProposal {
  notionId: string;
  notionDatabase: string;
  tableId: string;
  tableName: string | null;
  why: string | null;
  options: ChoiceOption[];
  /** Why replace is not offered, in the server's words. */
  replaceRefused: string | null;
  /** The line shown for letting Notion's values replace filled cells. */
  overwriteLine: string | null;
}

export interface ChoiceCard {
  previewToken: string;
  proposals: ChoiceProposal[];
}

/** The ONE card a finished preview (or a start that needs it) answered, with the token a start needs. */
export function readChoiceCard(output: Record<string, unknown> | null): ChoiceCard | null {
  const token = str(output?.preview_token);
  const card = obj(output?.card);
  if (!token || !card) return null;
  const proposals: ChoiceProposal[] = [];
  for (const raw of Array.isArray(card.proposals) ? card.proposals : []) {
    const p = obj(raw);
    const notionId = str(p?.notion_id);
    const tableId = str(p?.table_id);
    if (!p || !notionId || !tableId) continue;
    const options: ChoiceOption[] = [{ key: "new", value: "new" }];
    for (const [key, value] of Object.entries(obj(p.choices) ?? {})) {
      const sent = str(value);
      if (sent && key !== "new") options.push({ key, value: sent });
    }
    proposals.push({
      notionId,
      notionDatabase: str(p.notion_database) ?? "Notion database",
      tableId,
      tableName: str(p.table_name),
      why: str(p.why),
      options,
      replaceRefused: str(p.replace_refused),
      overwriteLine: str(p.overwrite_line),
    });
  }
  return proposals.length > 0 ? { previewToken: token, proposals } : null;
}

/** The safe default for every proposal: a table of its own beside theirs (nothing of theirs touched). */
export function defaultChoices(card: ChoiceCard): Record<string, string> {
  return Object.fromEntries(card.proposals.map((p) => [p.notionId, "new"]));
}

/** The import run a finished start look began (`import_start` answers the import's `run_id`). */
export function startedRunOf(output: Record<string, unknown> | null): string | null {
  if (!output || output.error) return null;
  return str(output.run_id);
}

/** Is this run part of a whole-Notion job (a preview, a start, or the import itself)? */
export function isNotionJob(view: Pick<BackgroundRunView, "kind" | "report">, input: Record<string, unknown> | null): boolean {
  if (view.kind === "import") return true;
  const action = view.kind === "look" ? lookActionOf(input) : null;
  return action === "preview" || action === "import_start";
}

/** Did the import run carry a whole-workspace plan (so a preview and the choice came before it)? */
function planOf(input: Record<string, unknown> | null): Record<string, unknown> | null {
  const raw = input?.onto;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return obj(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Optional content: a finished import that never reached it and counted none of it skipped it. */
const OPTIONAL_STAGE_WORDS: Record<string, string> = { files: "file", views: "view", comments: "comment" };

export interface JobInput {
  /** The look run (preview / start), when the job began with one. */
  look: BackgroundRunView | null;
  lookOutput: Record<string, unknown> | null;
  /** The ONE card, while it waits for an answer. */
  card: ChoiceCard | null;
  /** The answer is on its way to the server. */
  starting: boolean;
  /** Why the start was refused, in the server's words. */
  startRefused: string | null;
  /** The import's own run, once it exists. */
  run: BackgroundRunView | null;
  runInput: Record<string, unknown> | null;
  /** The furthest import stage reached (the ratchet). */
  stageIndex: number;
  /** Counts each stage last showed in this session (by stage index). */
  remembered: Readonly<Record<number, { current: number | null; total: number | null }>>;
}

function step(id: string, label: string, state: JobStepState, note: string | null = null, current: number | null = null, total: number | null = null, held = false): JobStep {
  return { id, label, state, note, current, total, held };
}

/** Every step of the job, in order, each with its live state. Pure. */
export function notionJobSteps(input: JobInput): JobStep[] {
  const { look, run, card } = input;
  const plan = planOf(input.runInput);
  const out: JobStep[] = [];

  // Preview
  if (look) {
    const state: JobStepState = look.phase === "finished" ? "done"
      : look.phase === "stopped" || look.phase === "cancelled" ? "stopped"
      : look.phase === "opening" || look.phase === "waiting" ? "waiting" : "working";
    const held = look.sample?.waiting === true;
    out.push(step("preview", "Preview", state, state === "stopped" ? look.stoppedBecause : state === "working" ? look.sample?.detail ?? null : null,
      state === "working" ? look.sample?.current ?? null : null, state === "working" ? look.sample?.total ?? null : null, held));
  } else {
    out.push(step("preview", "Preview", run ? (plan?.workspace ? "done" : "skipped") : "waiting", run && !plan?.workspace ? "One page, no preview" : null));
  }

  // The one choice
  const fills = Object.keys(obj(plan?.fill) ?? {}).length + Object.keys(obj(plan?.replace) ?? {}).length;
  if (run) {
    out.push(step("choice", "Your tables", fills > 0 ? "done" : "skipped",
      fills > 0 ? `${fills} of yours ${fills === 1 ? "is" : "are"} filled or replaced` : plan?.workspace ? "Nothing of yours is touched" : "Not needed"));
  } else if (card) {
    out.push(step("choice", "Your tables", input.starting ? "working" : "needs_you",
      input.startRefused ?? (input.starting ? "Starting the import" : `${card.proposals.length} of yours match`)));
  } else if (look?.phase === "finished") {
    out.push(step("choice", "Your tables", input.starting ? "working" : "skipped", input.starting ? "Starting the import" : input.startRefused ?? "Nothing of yours is touched"));
  } else {
    out.push(step("choice", "Your tables", look?.phase === "stopped" ? "skipped" : "waiting", look?.phase === "stopped" ? "The preview stopped" : null));
  }

  // The import's stages
  const finished = run?.phase === "finished";
  const stopped = run?.phase === "stopped" || run?.phase === "cancelled";
  const at = finished ? IMPORT_STAGES.length : input.stageIndex;
  const report = run?.report?.kind === "import" ? run.report : null;
  IMPORT_STAGES.forEach((stage, index) => {
    const seen = input.remembered[index] ?? null;
    if (!run || at < 0 || index > at) {
      // Not reached. A run that is working but has said no stage yet is on its first one.
      const first = run != null && !finished && !stopped && at < 0 && index === 0 && run.phase === "working";
      const note = first ? run.sample?.detail ?? null : null;
      out.push(step(stage.id, stage.label, first ? "working" : "waiting", note, null, null, first && run.sample?.waiting === true));
      return;
    }
    if (index < at) {
      const word = OPTIONAL_STAGE_WORDS[stage.id];
      const counted = word && report ? report.counts.some((c) => c.label.toLowerCase().includes(word) && c.count > 0) : true;
      if (finished && word && !seen && !counted) {
        out.push(step(stage.id, stage.label, "skipped", `No ${word}s to bring`));
        return;
      }
      out.push(step(stage.id, stage.label, "done", null, seen?.total ?? seen?.current ?? null, null));
      return;
    }
    // index === at: the active stage
    if (stopped) {
      out.push(step(stage.id, stage.label, "stopped", run.stoppedBecause, seen?.current ?? null, seen?.total ?? null));
      return;
    }
    const resuming = run.phase === "resuming";
    const held = resuming || run.sample?.waiting === true || run.phase === "paused" || run.phase === "sleeping";
    const live = run.sample?.stageIndex === index ? run.sample : null;
    out.push(step(stage.id, stage.label, run.phase === "needs_you" ? "needs_you" : "working",
      resuming ? RESUMING_WORDS : held ? run.sample?.detail ?? (run.phase === "paused" ? "Paused" : "Waiting") : live?.detail ?? null,
      live?.current ?? seen?.current ?? null, live?.total ?? seen?.total ?? null, held));
  });
  return out;
}

/** The finished output of a look run (its one `import` step): the preview's answer, a start's answer. */
export function lookOutputOf(run: WorkflowRunState | null): Record<string, unknown> | null {
  if (!run) return null;
  return nodeInvocation(run, "import")?.output ?? null;
}

/** The words for one choice key in the ONE question. */
export const CHOICE_WORDS: Record<string, string> = {
  new: "New table",
  fill: "Fill yours",
  replace: "Replace yours",
  fill_overwrite: "Fill, Notion wins",
  update: "Update",
};

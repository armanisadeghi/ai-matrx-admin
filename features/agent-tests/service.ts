"use client";

/**
 * Agent tests — direct Supabase reads (RLS decides who sees what).
 *
 * Reads: test cases (`agent.exemplar` kind='test_case'), runs
 * (`agent.test_run`), results (`agent.test_result`) and the judge's ledger row
 * (`platform.judge_verdict`). Work (launch, cancel, re-check) is the server's:
 * `POST /agent-tests/runs…` (CONTRACT §4), and a live run follows the server's
 * run stream. Nothing here goes through Next.
 *
 * jsonb columns are parsed defensively into the view models in `types.ts`;
 * columns the contract adds later (run counters, spent cents) are read when
 * present and shown as unknown when absent.
 */

import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";
import { isJsonObject } from "@/types/json";
import { readAllRows } from "@ai-matrx/data/db";
import {
  DEFAULT_ARCHIVE_FILTER,
  type ArchiveFilterValue,
} from "@ai-matrx/design-system";
import {
  openStream,
  type NdjsonEvent,
  type OperationDescriptor,
} from "@ai-matrx/api";
import { serverApi } from "@/lib/api/server-api";
import { followServerWork } from "@/features/ai-watch/followed-work";
import { isTestVerdict } from "./verdicts";
import { fetchTestCaseRows } from "./cases";
import type {
  CheckOutcome,
  OutcomeView,
  CheckResultView,
  JudgeVerdictView,
  OutcomeJudgeView,
  RunOptions,
  TestCaseView,
  TestResultView,
  TestRunView,
  TestVerdict,
  VerdictCounts,
} from "./types";

type ExemplarRow = Database["agent"]["Tables"]["exemplar"]["Row"];
type RunRow = Database["agent"]["Tables"]["test_run"]["Row"];
type ResultRow = Database["agent"]["Tables"]["test_result"]["Row"];

const OUTCOMES: readonly CheckOutcome[] = [
  "pass",
  "fail",
  "undecided",
  "not_applicable",
];

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() &&
    Number.isFinite(Number(value))
  )
    return Number(value);
  return null;
}

/** A value as a person reads it: text stays text, everything else is JSON. */
function shown(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** True when the server stored a hidden value as `{redacted, chars, sha256}` (CONTRACT v2 §2.8). */
function isRedacted(value: unknown): boolean {
  return isJsonObject(value) && value.redacted === true;
}

/** The ≤120-char match window a redacted value may carry, whatever key the writer used. */
function redactedWindow(value: unknown): string | null {
  if (!isJsonObject(value)) return null;
  for (const key of ["window", "match", "match_window", "excerpt"]) {
    if (typeof value[key] === "string") return value[key] as string;
  }
  return null;
}

export function parseCheckResults(raw: unknown): CheckResultView[] {
  if (!Array.isArray(raw)) return [];
  const out: CheckResultView[] = [];
  for (const entry of raw) {
    if (!isJsonObject(entry)) continue;
    const outcome = OUTCOMES.includes(entry.outcome as CheckOutcome)
      ? (entry.outcome as CheckOutcome)
      : "undecided";
    const observedRedacted = isRedacted(entry.observed);
    const expectedRedacted = isRedacted(entry.expected);
    const redactedSource = observedRedacted
      ? entry.observed
      : expectedRedacted
        ? entry.expected
        : null;
    out.push({
      id: str(entry.id),
      title: str(entry.title) || str(entry.id),
      proves: str(entry.proves),
      required: entry.required !== false,
      outcome,
      side: str(entry.side),
      observed: observedRedacted ? null : shown(entry.observed),
      expected: expectedRedacted ? null : shown(entry.expected),
      observedRedacted,
      expectedRedacted,
      redactedChars: isJsonObject(redactedSource)
        ? num(redactedSource.chars)
        : null,
      matchWindow: redactedWindow(redactedSource),
      truncated: entry.truncated === true,
      expectedSource: str(entry.expected_source),
      reason: str(entry.reason),
      canFail: typeof entry.can_fail === "boolean" ? entry.can_fail : null,
    });
  }
  return out;
}

/** `counts` = `{total, done, pass, pass_judged, fail, …}`; `{}` until the drainer's first refresh. */
function parseCounts(raw: unknown): VerdictCounts | null {
  if (!isJsonObject(raw) || Object.keys(raw).length === 0) return null;
  const byVerdict: Partial<Record<TestVerdict, number>> = {};
  for (const [key, value] of Object.entries(raw)) {
    const n = num(value);
    if (isTestVerdict(key) && n !== null) byVerdict[key] = n;
  }
  return { total: num(raw.total) ?? 0, done: num(raw.done) ?? 0, byVerdict };
}

export function toRunView(row: RunRow): TestRunView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    agentIds: row.agent_ids ?? [],
    status: row.status,
    doorPolicy: row.door_policy,
    repeats: row.repeats,
    judgePolicy: row.judge_policy,
    purpose: row.purpose,
    aiTestMode: row.ai_test_mode,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    counts: parseCounts(row.counts),
    spentCents: num(row.spent_cents),
    maxCostCents: num(row.max_cost_cents),
    archivedAt: row.archived_at,
  };
}

function errorText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") return raw;
  if (isJsonObject(raw))
    return str(raw.message) || str(raw.error) || JSON.stringify(raw);
  return JSON.stringify(raw);
}

function parseOutcome(raw: unknown): OutcomeView | null {
  if (!isJsonObject(raw)) return null;
  return {
    status: str(raw.status) || "completed",
    message: str(raw.message) || null,
    errorCode: str(raw.error_code) || null,
    httpStatus: num(raw.http_status),
    judge: parseOutcomeJudge(raw.judge),
  };
}

function parseOutcomeJudge(raw: unknown): OutcomeJudgeView | null {
  if (!isJsonObject(raw)) return null;
  return {
    verdict: str(raw.verdict) || null,
    advisory: raw.advisory === true,
    advisoryReason: str(raw.advisory_reason) || null,
    fedOk: typeof raw.fed_ok === "boolean" ? raw.fed_ok : null,
    model: str(raw.model) || null,
    missingFacts: Array.isArray(raw.missing_facts)
      ? raw.missing_facts.map((f) => String(f))
      : [],
  };
}

export function toResultView(row: ResultRow): TestResultView {
  const blocked = isJsonObject(row.blocked_by) ? row.blocked_by : null;
  return {
    id: row.id,
    testRunId: row.test_run_id,
    caseId: row.case_id,
    setupKey: row.setup_key,
    repeat: row.repeat,
    door: row.door,
    doorReason: row.door_reason,
    eligibleDoors: row.eligible_doors ?? [],
    parityGroup: row.parity_group,
    identityMode: row.identity_mode,
    originClass: row.origin_class,
    conversationId: row.conversation_id,
    agentVersionId: row.agent_version_id,
    userRequestIds: row.user_request_ids ?? [],
    status: row.status,
    verdict: isTestVerdict(row.verdict) ? row.verdict : null,
    verdictReason: row.verdict_reason,
    outcome: parseOutcome(row.outcome),
    blockedBy: blocked
      ? {
          gate: str(blocked.gate) || undefined,
          kind: str(blocked.kind) || undefined,
          approvalUrl: str(blocked.approval_url) || undefined,
        }
      : null,
    checks: parseCheckResults(row.checks),
    judgeVerdictId: row.judge_verdict_id,
    runCostCents: num(row.run_cost_cents),
    judgeCostCents: num(row.judge_cost_cents),
    durationMs: row.duration_ms,
    savedAnswer: row.saved_answer,
    error: errorText(row.error),
    createdAt: row.created_at,
  };
}

export function toCaseView(row: ExemplarRow): TestCaseView {
  const variables = isJsonObject(row.variables) ? row.variables : {};
  return {
    id: row.id,
    agentId: row.agent_id,
    label: row.label?.trim() || "Untitled case",
    userInput: row.user_input ?? "",
    variables,
    checkCount: Array.isArray(row.checks) ? row.checks.length : 0,
    factCount: Array.isArray(row.judge_facts) ? row.judge_facts.length : 0,
    door: row.door,
    updatedAt: row.updated_at,
  };
}

/** Every live test case of one agent. */
export async function fetchTestCases(agentId: string): Promise<TestCaseView[]> {
  return (await fetchTestCaseRows(agentId)).map(toCaseView);
}

/**
 * The newest results of these cases across every run (newest first, capped):
 * the Studio's per-case verdicts and its cases × versions grid read these.
 */
export async function fetchCaseResults(
  caseIds: readonly string[],
  limit = 500,
): Promise<TestResultView[]> {
  if (caseIds.length === 0) return [];
  const { data, error } = await createClient()
    .schema("agent")
    .from("test_result")
    .select("*")
    .in("case_id", [...caseIds])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toResultView);
}

/** Version numbers of an agent's saved versions, by version id. */
export async function fetchVersionNumbers(
  agentId: string,
): Promise<Map<string, number>> {
  const { data, error } = await createClient()
    .schema("agent")
    .from("definition_version")
    .select("id, version_number")
    .eq("agent_id", agentId)
    .order("version_number", { ascending: false })
    .limit(200);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.id, r.version_number]));
}

/** The most recent runs that include this agent (a battle run lists every setup agent). */
export async function fetchAgentRuns(
  agentId: string,
  options: {
    purpose?: "user" | "platform";
    limit?: number;
    archive?: ArchiveFilterValue;
  } = {},
): Promise<TestRunView[]> {
  const supabase = createClient();
  let query = supabase
    .schema("agent")
    .from("test_run")
    .select("*")
    .contains("agent_ids", [agentId])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);
  if (options.purpose) query = query.eq("purpose", options.purpose);
  const archive = options.archive ?? DEFAULT_ARCHIVE_FILTER;
  if (archive === "active") query = query.is("archived_at", null);
  else if (archive === "archived") query = query.not("archived_at", "is", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toRunView);
}

/** Platform runs across every agent (admin page). */
export async function fetchPlatformRuns(
  archive: ArchiveFilterValue = DEFAULT_ARCHIVE_FILTER,
  limit = 200,
): Promise<TestRunView[]> {
  const supabase = createClient();
  let query = supabase
    .schema("agent")
    .from("test_run")
    .select("*")
    .eq("purpose", "platform")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (archive === "active") query = query.is("archived_at", null);
  else if (archive === "archived") query = query.not("archived_at", "is", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toRunView);
}

export async function fetchRun(runId: string): Promise<TestRunView | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("agent")
    .from("test_run")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  return data ? toRunView(data) : null;
}

/** Every result of one run (a run can hold up to cases × setups × repeats rows). */
export async function fetchRunResults(
  runId: string,
): Promise<TestResultView[]> {
  const supabase = createClient();
  const rows = await readAllRows<ResultRow>(
    ({ from, to }) =>
      supabase
        .schema("agent")
        .from("test_result")
        .select("*", { count: "exact" })
        .eq("test_run_id", runId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "agent.test_result" },
  );
  return rows.map(toResultView);
}

/** Counts results by verdict — the run's progress when the run row has no counters yet. */
export function countResults(
  results: readonly TestResultView[],
  expected?: number,
): VerdictCounts {
  const byVerdict: Partial<Record<TestVerdict, number>> = {};
  let done = 0;
  for (const result of results) {
    if (result.status !== "done" || !result.verdict) continue;
    done += 1;
    byVerdict[result.verdict] = (byVerdict[result.verdict] ?? 0) + 1;
  }
  return { total: Math.max(expected ?? 0, results.length), done, byVerdict };
}

export async function fetchJudgeVerdict(
  id: string,
): Promise<JudgeVerdictView | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("platform")
    .from("judge_verdict")
    .select("id, verdict, reasoning, confidence, model")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    verdict: shown(data.verdict),
    reasoning: data.reasoning,
    confidence: data.confidence,
    model: data.model,
  };
}

// ── Work on the server (CONTRACT v2 §4) ────────────────────────────────────────
//
// Hand-declared until `@ai-matrx/api` publishes the generated operations
// (aidream `aidream/api/routers/agent_tests.py`); they ride the ONE client
// (`serverApi`), so auth, base URL, request id and the active organization are
// the package's.

const RUNS_OP: OperationDescriptor = {
  m: "POST",
  p: "/agent-tests/runs",
  d: "aidream",
  a: "user",
  o: "required",
  n: "agent_tests.launch_run",
};
const CANCEL_OP: OperationDescriptor = {
  ...RUNS_OP,
  p: "/agent-tests/runs/{run_id}/cancel",
  n: "agent_tests.cancel_run",
};
const RESUME_OP: OperationDescriptor = {
  ...RUNS_OP,
  p: "/agent-tests/runs/{run_id}/resume",
  n: "agent_tests.resume_run",
};
const RECHECK_OP: OperationDescriptor = {
  ...RUNS_OP,
  p: "/agent-tests/runs/{run_id}/recheck",
  n: "agent_tests.recheck_run",
};
const STREAM_OP: OperationDescriptor = {
  m: "GET",
  p: "/agent-tests/runs/{run_id}/stream",
  d: "aidream",
  a: "user",
  o: "required",
  s: "ndjson",
  n: "agent_tests.stream_run",
};

/** Launch, cancel, resume and re-check are live on the server. */
export const LAUNCH_AVAILABLE = true;

export interface LaunchedRun {
  runId: string;
  status: string;
  resultCount: number;
}

function readLaunched(data: unknown): LaunchedRun {
  if (!isJsonObject(data) || typeof data.run_id !== "string") {
    throw new Error("The server started the run but answered in an unexpected shape.");
  }
  // The server runs the cases and the judge detached: Watch AI and the Builder follow the run.
  followServerWork({ kind: "test_run", id: data.run_id, label: "Eval run", source: "agent tests" });
  return {
    runId: data.run_id,
    status: str(data.status) || "queued",
    resultCount: num(data.result_count) ?? 0,
  };
}

/** `POST /agent-tests/runs`: every live case of this agent (or `caseIds`). */
export async function launchRun(
  agentId: string,
  options: RunOptions,
  caseIds?: readonly string[],
): Promise<LaunchedRun> {
  const body: Record<string, unknown> = {
    agent_ids: [agentId],
    door_policy: options.doorPolicy,
    repeats: options.repeats,
    judge_policy: options.judgePolicy,
    purpose: "user",
    idempotency_key: crypto.randomUUID(),
    // A person pressed Run (recorded on the run as its initiation).
    initiation: "user",
  };
  if (caseIds && caseIds.length > 0) body.case_ids = [...caseIds];
  return readLaunched(await serverApi.call<unknown>(RUNS_OP, { body }));
}

/** One column of a battle on cases (CONTRACT §4.1 `RunSetup`). */
export interface BattleSetup {
  key: string;
  label: string;
  holder: { kind: "agent" | "agent_version"; id: string };
  patch?: { model_id?: string; messages?: unknown[] };
}

/**
 * A battle on cases: the same runner, every case × every setup, results in `agent.test_result`
 * (one per case × setup), so it shows on the test page, the case grid and Watch AI like any run.
 */
export async function launchBattle(
  agentId: string,
  setups: readonly BattleSetup[],
  options: RunOptions,
  caseIds?: readonly string[],
): Promise<LaunchedRun> {
  const body: Record<string, unknown> = {
    agent_ids: [agentId],
    setups: setups.map((s) => ({ ...s, patch: s.patch ?? {} })),
    door_policy: options.doorPolicy,
    repeats: options.repeats,
    judge_policy: options.judgePolicy,
    purpose: "user",
    idempotency_key: crypto.randomUUID(),
    initiation: "user",
  };
  if (caseIds && caseIds.length > 0) body.case_ids = [...caseIds];
  return readLaunched(await serverApi.call<unknown>(RUNS_OP, { body }));
}

export async function cancelRun(runId: string): Promise<string> {
  const data = await serverApi.call<unknown>(CANCEL_OP, { path: { run_id: runId } });
  return isJsonObject(data) ? str(data.status) : "";
}

export async function resumeRun(runId: string): Promise<string> {
  const data = await serverApi.call<unknown>(RESUME_OP, { path: { run_id: runId } });
  return isJsonObject(data) ? str(data.status) : "";
}

/** Re-check: a new run over the stored answers against the current checks (no AI call, cost 0). */
export async function recheckRun(runId: string): Promise<LaunchedRun> {
  return readLaunched(
    await serverApi.call<unknown>(RECHECK_OP, { path: { run_id: runId }, body: {} }),
  );
}

/** One event of a run's server stream (`agent_test_progress` · `agent_test_result` · `agent_test_run_status`). */
export interface RunStreamEvent {
  event: string;
  status: string | null;
  resultId: string | null;
}

/** The run's server stream: it ends when the run finishes, pauses or is cancelled. */
export async function* followRun(
  runId: string,
  signal: AbortSignal,
): AsyncGenerator<RunStreamEvent> {
  const stream = await openStream<NdjsonEvent>(
    serverApi,
    STREAM_OP,
    { path: { run_id: runId } },
    { signal, totalTimeoutMs: null },
  );
  for await (const envelope of stream) {
    const data = isJsonObject(envelope.data) ? envelope.data : {};
    yield {
      event: envelope.event,
      status: str(data.status) || null,
      resultId: str(data.result_id) || null,
    };
  }
}

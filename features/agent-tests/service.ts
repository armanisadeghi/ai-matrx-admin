"use client";

/**
 * Agent tests — direct Supabase reads (RLS decides who sees what).
 *
 * Reads: test cases (`agent.exemplar` kind='test_case'), runs
 * (`agent.test_run`), results (`agent.test_result`) and the judge's ledger row
 * (`platform.judge_verdict`). Work (launch, cancel, re-check) is the server's:
 * `POST /agent-tests/runs…` (CONTRACT §4). Nothing here goes through Next.
 *
 * jsonb columns are parsed defensively into the view models in `types.ts`;
 * columns the contract adds later (run counters, spent cents) are read when
 * present and shown as unknown when absent.
 */

import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";
import { isJsonObject } from "@/types/json";
import { readAllRows } from "@ai-matrx/data/db";
import { isTestVerdict } from "./verdicts";
import type {
  CheckOutcome,
  CheckResultView,
  JudgeVerdictView,
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

/** True when the server marked a stored value as hidden from this viewer (contract attack S5). */
function isRedacted(value: unknown): boolean {
  return isJsonObject(value) && value.redacted === true;
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
    out.push({
      id: str(entry.id),
      title: str(entry.title) || str(entry.id),
      proves: str(entry.proves),
      required: entry.required !== false,
      outcome,
      side: str(entry.side),
      observed: observedRedacted ? null : shown(entry.observed),
      expected: isRedacted(entry.expected) ? null : shown(entry.expected),
      observedRedacted,
      expectedSource: str(entry.expected_source),
      reason: str(entry.reason),
      canFail: typeof entry.can_fail === "boolean" ? entry.can_fail : null,
    });
  }
  return out;
}

function parseCounts(row: RunRow): VerdictCounts | null {
  const raw: unknown = (row as Record<string, unknown>).counts;
  if (!isJsonObject(raw)) return null;
  const byVerdict: Partial<Record<TestVerdict, number>> = {};
  const source = isJsonObject(raw.by_verdict) ? raw.by_verdict : raw;
  for (const [key, value] of Object.entries(source)) {
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
    counts: parseCounts(row),
    spentCents: num((row as Record<string, unknown>).spent_cents),
    maxCostCents: num(row.max_cost_cents),
  };
}

function errorText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") return raw;
  if (isJsonObject(raw))
    return str(raw.message) || str(raw.error) || JSON.stringify(raw);
  return JSON.stringify(raw);
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
    identityMode: row.identity_mode,
    originClass: row.origin_class,
    conversationId: row.conversation_id,
    userRequestIds: row.user_request_ids ?? [],
    status: row.status,
    verdict: isTestVerdict(row.verdict) ? row.verdict : null,
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

function toCaseView(row: ExemplarRow): TestCaseView {
  const variables = isJsonObject(row.variables) ? row.variables : {};
  return {
    id: row.id,
    agentId: row.agent_id,
    label: row.label?.trim() || "Untitled case",
    userInput: row.user_input ?? "",
    variables,
    checkCount: Array.isArray(row.checks) ? row.checks.length : 0,
    door: row.door,
    updatedAt: row.updated_at,
  };
}

/** Every live test case of one agent. */
export async function fetchTestCases(agentId: string): Promise<TestCaseView[]> {
  const supabase = createClient();
  const rows = await readAllRows<ExemplarRow>(
    ({ from, to }) =>
      supabase
        .schema("agent")
        .from("exemplar")
        .select("*", { count: "exact" })
        .eq("agent_id", agentId)
        .eq("kind", "test_case")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "agent.exemplar test cases" },
  );
  return rows.map(toCaseView);
}

/** The most recent runs that include this agent (a battle run lists every setup agent). */
export async function fetchAgentRuns(
  agentId: string,
  options: { purpose?: "user" | "platform"; limit?: number } = {},
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
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toRunView);
}

/** Platform runs across every agent (admin page). */
export async function fetchPlatformRuns(limit = 200): Promise<TestRunView[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("agent")
    .from("test_run")
    .select("*")
    .eq("purpose", "platform")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
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

/**
 * Launch is the server's (`POST /agent-tests/runs`, CONTRACT §4.1). Until that
 * route is in `@ai-matrx/api`'s generated paths the page shows the launch
 * control disabled and announces the registered promise
 * `agents.test-runs` — never a stand-in run.
 */
export const LAUNCH_AVAILABLE = false;

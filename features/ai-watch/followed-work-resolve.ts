/**
 * Reads the stored records of followed server work and turns them into what Watch AI and the
 * Builder need: the AI calls (user_request ids, conversation ids), the steps with their answers,
 * the inputs, and whether the work is over. Pure mappers on top, one reader per kind.
 */

import { createClient } from "@/utils/supabase/client";
import { getFactoryBuild } from "@/features/agents/factory/service";
import type { FactoryBuildState, FactoryStepRecord } from "@/features/agents/factory/types";
import type { FollowedWork } from "./followed-work";

export interface FollowedStep {
  id: string;
  label: string;
  status: string | null;
  mandateKey: string | null;
  userRequestId: string | null;
  conversationId: string | null;
  /** Exactly as stored. */
  record: unknown;
}

export interface Resolved {
  key: string;
  kind: FollowedWork["kind"];
  id: string;
  done: boolean;
  status: string | null;
  error: string | null;
  /** What the work was started with, as stored. */
  inputs: unknown;
  /** Whole-work facts beyond steps (current step, outcome, model, flags), as stored. */
  state: unknown;
  steps: FollowedStep[];
  userRequestIds: string[];
  conversationIds: string[];
  readAt: number;
}

const TERMINAL = new Set(["completed", "complete", "failed", "cancelled", "canceled", "errored", "succeeded", "interrupted", "passed", "done"]);

function uniq(list: Array<string | null | undefined>): string[] {
  return [...new Set(list.filter((v): v is string => typeof v === "string" && v !== ""))];
}

/** A factory build's steps, answers and call identities from its checkpoint state. */
export function resolveFactoryBuild(
  work: Pick<FollowedWork, "key" | "id">,
  state: FactoryBuildState | null,
  spineStatus: string | null,
  readAt = Date.now(),
): Resolved {
  const records: FactoryStepRecord[] = [];
  for (const h of state?.history ?? []) records.push(h);
  for (const s of Object.values(state?.steps ?? {})) {
    if (s && !records.some((r) => r.step === s.step && r.attempt === s.attempt && r.started_at === s.started_at)) records.push(s);
  }
  const steps: FollowedStep[] = records.map((r, i) => ({
    id: `${r.step}.${r.attempt ?? i + 1}`,
    label: `${r.step}${r.attempt && r.attempt > 1 ? ` (attempt ${r.attempt})` : ""}`,
    status: r.status ?? null,
    mandateKey: r.mandate_key ?? null,
    userRequestId: r.request_id ?? null,
    conversationId: r.conversation_id ?? null,
    record: r,
  }));
  const proof = state?.proof ?? [];
  for (const p of proof) {
    steps.push({
      id: `proof.${p.case_id}`,
      label: `proof run · ${p.case_id}`,
      status: p.candidate_output ? "done" : null,
      mandateKey: null,
      userRequestId: null,
      conversationId: p.candidate_conversation_id ?? null,
      record: p,
    });
  }
  const status = state?.status ?? spineStatus;
  const { steps: _s, history: _h, proof: _p, request, ...rest } = state ?? ({} as FactoryBuildState);
  void _s;
  void _h;
  void _p;
  return {
    key: work.key,
    kind: "factory_build",
    id: work.id,
    done: Boolean(state?.outcome) || (status !== null && status !== undefined && TERMINAL.has(String(status))),
    status: status ?? null,
    error: typeof state?.error === "string" ? state.error : null,
    inputs: request ?? null,
    state: { current_step: state?.current_step ?? null, ...rest },
    steps,
    userRequestIds: uniq(steps.map((s) => s.userRequestId)),
    conversationIds: uniq(steps.map((s) => s.conversationId)),
    readAt,
  };
}

interface TestResultRow {
  id: string;
  case_id: string | null;
  status: string | null;
  verdict: string | null;
  verdict_reason: string | null;
  conversation_id: string | null;
  user_request_ids: string[] | null;
  /** `outcome.judge` carries the fact judge's own call ids (server `agent_tests` judge step). */
  outcome?: {
    judge?: { conversation_id?: string | null; request_id?: string | null; verdict?: string | null; model?: string | null } | null;
    /** A battle's pairwise verdict row (door `pairwise`): the comparative judge's own call. */
    pairwise?: { conversation_id?: string | null; request_id?: string | null; winner?: string | null; model?: string | null } | null;
  } | null;
}

/** An eval run: one step per case result (its answer run) with the judge's verdict beside it. */
export function resolveTestRun(
  work: Pick<FollowedWork, "key" | "id">,
  run: Record<string, unknown> | null,
  results: TestResultRow[],
  readAt = Date.now(),
): Resolved {
  const status = typeof run?.status === "string" ? run.status : null;
  const steps: FollowedStep[] = [];
  for (const r of results) {
    const pair = r.outcome?.pairwise;
    if (pair) {
      // Not an answer: the battle's blind pairwise judge comparing two answers to this case.
      steps.push({
        id: `pairwise.${r.id}`,
        label: `pairwise judge · case ${r.case_id ?? r.id.slice(0, 8)}`,
        status: pair.winner ?? r.status,
        mandateKey: "evaluators.comparative_judge",
        userRequestId: pair.request_id ?? null,
        conversationId: pair.conversation_id ?? null,
        record: pair,
      });
      continue;
    }
    steps.push({
      id: `result.${r.id}`,
      label: `case ${r.case_id ?? r.id.slice(0, 8)}`,
      status: r.verdict ?? r.status,
      mandateKey: null,
      userRequestId: r.user_request_ids?.[0] ?? null,
      conversationId: r.conversation_id,
      record: r,
    });
    const judge = r.outcome?.judge;
    if (judge && (judge.conversation_id || judge.request_id)) {
      steps.push({
        id: `judge.${r.id}`,
        label: `fact judge · case ${r.case_id ?? r.id.slice(0, 8)}`,
        status: judge.verdict ?? null,
        mandateKey: "agent_tests.fact_judge",
        userRequestId: judge.request_id ?? null,
        conversationId: judge.conversation_id ?? null,
        record: judge,
      });
    }
  }
  return {
    key: work.key,
    kind: "test_run",
    id: work.id,
    done: status !== null && TERMINAL.has(status),
    status,
    error: null,
    inputs: run,
    state: { result_count: results.length },
    steps,
    userRequestIds: uniq(steps.map((st) => st.userRequestId).concat(results.flatMap((r) => r.user_request_ids ?? []))),
    conversationIds: uniq(steps.map((st) => st.conversationId)),
    readAt,
  };
}

/** One row call of a watched AI column run, as `chat.user_request` stores it. */
export interface AiColumnCallRow {
  id: string;
  conversation_id: string | null;
  status: string | null;
  error: string | null;
  total_cost: number | string | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * An AI column run's row calls (server stamps `metadata.ai_column_run_id`, aidream records_enrichment). One step per
 * row, newest last; the run is over once at least one call exists and every call is terminal, or once the tab says
 * the request ended (`FollowedWork.ended`): a failed request closes the run as failed with its reason.
 */
export function resolveAiColumnRun(work: FollowedWork, rows: readonly AiColumnCallRow[]): Resolved {
  const sorted = [...rows].sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));
  const steps: FollowedStep[] = sorted.map((r) => {
    const md = r.metadata ?? {};
    const recordId = typeof md.record_id === "string" ? md.record_id : null;
    return {
      id: r.id,
      label: `Row ${recordId ? recordId.slice(0, 8) : r.id.slice(0, 8)}`,
      status: r.status,
      mandateKey: typeof md.mandate_key === "string" ? md.mandate_key : null,
      userRequestId: r.id,
      conversationId: r.conversation_id,
      record: r,
    };
  });
  const allTerminal = sorted.length > 0 && sorted.every((r) => TERMINAL.has(String(r.status ?? "").toLowerCase()));
  // The request that started the run came back: a failed one ends the run with its reason, a successful one with no
  // call (nothing was due) ends it too. Calls still pending after a success keep it running until they land.
  const failed = work.ended?.ok === false;
  const done = allTerminal || failed || (work.ended?.ok === true && sorted.length === 0);
  const first = sorted[0]?.metadata ?? null;
  return {
    key: work.key,
    kind: work.kind,
    id: work.id,
    done,
    status: failed ? "failed" : done ? "completed" : sorted.length ? "running" : null,
    error: (failed ? work.ended?.reason : null) ?? sorted.find((r) => r.error)?.error ?? null,
    inputs: first ? { table_id: first.table_id ?? null, field_key: first.field_key ?? null } : null,
    state: { rows: sorted.length },
    steps,
    userRequestIds: uniq(sorted.map((r) => r.id)),
    conversationIds: uniq(sorted.map((r) => r.conversation_id)),
    readAt: Date.now(),
  };
}

/** Read one followed item from the database. Kinds that carry their own ids need no read. */
export async function readFollowed(work: FollowedWork): Promise<Resolved> {
  if (work.kind === "factory_build") {
    const build = await getFactoryBuild(work.id);
    return resolveFactoryBuild(work, build?.state ?? null, build?.spineStatus ?? null);
  }
  if (work.kind === "test_run") {
    const supabase = createClient();
    const [run, results] = await Promise.all([
      supabase.schema("agent").from("test_run").select("*").eq("id", work.id).maybeSingle(),
      supabase
        .schema("agent")
        .from("test_result")
        .select("id, case_id, status, verdict, verdict_reason, conversation_id, user_request_ids, outcome")
        .eq("test_run_id", work.id)
        .limit(500),
    ]);
    if (run.error) throw new Error(run.error.message);
    if (results.error) throw new Error(results.error.message);
    return resolveTestRun(work, (run.data as Record<string, unknown> | null) ?? null, (results.data ?? []) as unknown as TestResultRow[]);
  }
  if (work.kind === "ai_column_run") {
    const supabase = createClient();
    const rows = await supabase
      .schema("chat")
      .from("user_request")
      .select("id, conversation_id, status, error, total_cost, created_at, metadata")
      .eq("metadata->>ai_column_run_id", work.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (rows.error) throw new Error(rows.error.message);
    return resolveAiColumnRun(work, (rows.data ?? []) as unknown as AiColumnCallRow[]);
  }
  return {
    key: work.key,
    kind: work.kind,
    id: work.id,
    done: true,
    status: null,
    error: null,
    inputs: null,
    state: null,
    steps: [],
    userRequestIds: work.kind === "user_request" ? [work.id] : [],
    conversationIds: work.kind === "conversation" ? [work.id] : [],
    readAt: Date.now(),
  };
}

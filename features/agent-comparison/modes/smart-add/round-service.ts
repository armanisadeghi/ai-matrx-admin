/**
 * Smart Add truth bench, "Real round" tab — I/O. The round runs through the system-workflow lane
 * (the same start Smart Add uses); its events, holder conversations and Jev's decision answers are
 * read straight from Supabase under row security; Jev runs on the server's matrix runner; a truth
 * mark on Jev's answer goes through the decision review door so it feeds calibration.
 */

import { createClient } from "@/utils/supabase/client";
import { requireAuthenticatedSupabaseSession } from "@/utils/supabase/webDb";
import { readAllRows } from "@ai-matrx/data/db";
import type { AppDispatch } from "@/lib/redux/store";
import { startSystemRun } from "@/features/education/kits/systemRuns";
import { labelConversations } from "@/features/agents/decision-review/service";
import { createComparisonSet, mergeComparisonSetMetadata } from "../../service/comparisonSetsService";
import { runMatrixCells } from "../matrix/service";
import { setupToMetadata } from "../matrix/model";
import { BENCH_KEY } from "./model";
import {
  JEV_TAGS,
  JUDGMENTS,
  JUDGMENT_LABEL,
  RELATION_QUESTION,
  ROUND_STEPS,
  ROUND_WORKFLOW_KEY,
  buildItems,
  buildRoundSetup,
  jevLabel,
  questionOptions,
  readRoundBench,
  readSteps,
  roundCellsToRun,
  unreadableSteps,
  roundInputs,
  type DecisionAnswers,
  type Judgment,
  type RoundBench,
  type RoundEvent,
  type RoundItem,
  type RoundTruth,
} from "./round-model";

/** The workflow run statuses after which nothing more happens. */
export const TERMINAL_RUN = new Set(["completed", "failed", "errored", "cancelled", "interrupted"]);

/**
 * Each Jev decision agent, found by its tags through the canonical scoped agent list (every agent
 * this person can see), and the relation keys its identity question offers (a by-id read).
 */
export async function resolveRoundJudges(): Promise<{ agents: Record<Judgment, string | null>; relationOptions: string[] }> {
  const client = createClient();
  await requireAuthenticatedSupabaseSession(client);
  const agents: Record<Judgment, string | null> = { identity: null, entity: null, we_think: null };
  for (const judgment of JUDGMENTS) {
    const tags = JEV_TAGS[judgment];
    const { data, error } = await client.rpc("agx_list_scoped", {
      // The Jev judges are platform (system) agents — "all" is every lane the person owns or shares.
      p_scope: "system",
      p_filters: { tags: { values: [tags[tags.length - 1]] } },
      p_sort: "updated",
      p_dir: "desc",
      p_favorites_first: false,
      p_archived: "active",
      p_limit: 25,
      p_offset: 0,
    });
    if (error) throw new Error(`Could not find the Jev agent for "${JUDGMENT_LABEL[judgment]}": ${error.message}`);
    const hit = (data ?? []).find((a) => tags.every((t) => (a.tags ?? []).includes(t)));
    agents[judgment] = hit?.id ?? null;
  }
  let relationOptions: string[] = [];
  if (agents.identity) {
    const { data, error } = await client.schema("agent").from("definition").select("messages").eq("id", agents.identity).maybeSingle();
    if (error) throw new Error(`Could not read the Jev identity questions: ${error.message}`);
    relationOptions = questionOptions(data?.messages, RELATION_QUESTION);
  }
  return { agents, relationOptions };
}

/**
 * Start a real round and file the bench: the battle row exists from the first second, so the
 * page can be closed and reopened while the round runs on the server.
 */
export async function startRoundBench(
  dispatch: AppDispatch,
  bench: RoundBench,
  userId: string,
  organizationId: string,
): Promise<string> {
  const { runId } = await startSystemRun(
    dispatch,
    ROUND_WORKFLOW_KEY,
    {
      subject: `smart_add:${crypto.randomUUID()}`,
      organizationId,
      sourceFeature: "marketing",
      inputs: roundInputs(bench.brand),
    },
    "The Smart Add round could not start.",
  );
  const frozen: RoundBench = { ...bench, runId, ranAt: new Date().toISOString() };
  const set = await createComparisonSet({
    name: `Smart Add round · ${bench.brand.name || bench.brand.website}`,
    userId,
    organizationId,
    metadata: { ...setupToMetadata(buildRoundSetup(frozen)), [BENCH_KEY]: frozen as unknown as Record<string, unknown> },
  });
  return set.id;
}

export async function loadRunStatus(runId: string): Promise<string | null> {
  const { data, error } = await createClient().schema("workflow").from("run").select("status").eq("id", runId).maybeSingle();
  if (error) throw new Error(`Could not read the round: ${error.message}`);
  return data?.status ?? null;
}

/**
 * Only the JSON paths the bench reads, never the whole payload. Widened to `string` and pinned
 * with `.returns<>()`: PostgREST's JSON-path select inference exceeds TS's depth (TS2589).
 */
const EVENT_SELECT: string =
  "node_id, event_type, duration_ms, error_message, seq, conversation_id:payload->>conversation_id, failed_conversation_id:payload->error->details->>conversation_id, cost_usd:payload->cost_usd, content:payload->output->content";

interface EventRow {
  node_id: string | null;
  event_type: string;
  duration_ms: number | null;
  error_message: string | null;
  seq: number;
  conversation_id: string | null;
  failed_conversation_id: string | null;
  cost_usd: unknown;
  content: unknown;
}

/** The round's judgment-step events (status, time, cost, conversation, output). */
export async function loadRoundEvents(runId: string): Promise<RoundEvent[]> {
  const rows = await readAllRows(
    ({ from, to }) =>
      createClient()
        .schema("workflow")
        .from("node_events")
        .select(EVENT_SELECT, { count: "exact" })
        .eq("run_id", runId)
        .in("node_id", ROUND_STEPS)
        .in("event_type", ["node_started", "node_completed", "node_failed", "node_cost"])
        .order("seq", { ascending: true })
        .range(from, to)
        .returns<EventRow[]>(),
    { label: "workflow.node_events (Smart Add round judgment steps)" },
  );
  return rows.map((r) => ({
    node_id: r.node_id,
    event_type: r.event_type,
    duration_ms: r.duration_ms,
    error_message: r.error_message,
    conversation_id: typeof r.conversation_id === "string" ? r.conversation_id : null,
    failed_conversation_id: typeof r.failed_conversation_id === "string" ? r.failed_conversation_id : null,
    cost_usd: typeof r.cost_usd === "number" ? r.cost_usd : r.cost_usd != null ? Number(r.cost_usd) : null,
    content: r.content,
  }));
}

/** The variables each holder conversation was given. */
export async function loadConversationVariables(ids: string[]): Promise<Map<string, Record<string, unknown>>> {
  const out = new Map<string, Record<string, unknown>>();
  if (!ids.length) return out;
  const { data, error } = await createClient().schema("chat").from("conversation").select("id, variables").in("id", ids);
  if (error) throw new Error(`Could not read what today's AI was given: ${error.message}`);
  for (const row of data ?? []) {
    const v = row.variables;
    if (v && typeof v === "object" && !Array.isArray(v)) out.set(row.id, v as Record<string, unknown>);
  }
  return out;
}

/**
 * Capture the finished round onto the bench (steps, items, holder answers), then start Jev on
 * every item. Resolves once the cells are queued; `finished` settles when the server's stream ends.
 */
export async function captureAndRunJev(
  dispatch: AppDispatch,
  setId: string,
  bench: RoundBench,
  runStatus: string,
  organizationId: string,
): Promise<{ bench: RoundBench; finished: Promise<string | null> }> {
  const steps = readSteps(await loadRoundEvents(bench.runId as string));
  const vars = await loadConversationVariables(
    steps.map((s) => s.call.conversationId).filter((c): c is string => Boolean(c)),
  );
  const items: RoundItem[] = buildItems(steps, vars, bench.brand);
  const next: RoundBench = {
    ...bench,
    captured: true,
    runStatus,
    holderCalls: steps.map((s) => s.call),
    unreadable: unreadableSteps(steps, vars),
    items,
  };
  const setup = buildRoundSetup(next);
  // The capture is claimed in the guarded write: a second page (or a remount) that gets here
  // second finds it captured and starts nothing, so Jev never runs twice.
  const claim: { by: RoundBench | null } = { by: null };
  await mergeComparisonSetMetadata(setId, (current) => {
    const already = readRoundBench(current);
    if (already?.captured) {
      claim.by = already;
      return current;
    }
    return { ...current, ...setupToMetadata(setup), [BENCH_KEY]: next as unknown as Record<string, unknown> };
  });
  if (claim.by) return { bench: claim.by, finished: Promise.resolve(null) };
  return { bench: next, finished: runJevCells(dispatch, setId, organizationId, roundCellsToRun(setup)) };
}

/** Run Jev on the given cells; settles with the run's error, or null. Never rejects. */
export function runJevCells(
  dispatch: AppDispatch,
  setId: string,
  organizationId: string,
  cells: { row_id: string; column_id: string; repeat: number }[],
): Promise<string | null> {
  if (!cells.length) return Promise.resolve(null);
  return runMatrixCells(dispatch, setId, organizationId, { cells, scope: "all" })
    .then((o) => o.error ?? (o.streamErrors.join(" · ") || null))
    .catch((err: unknown) => (err instanceof Error ? err.message : String(err)));
}

/**
 * Jev's decision answers from the answer store (one `platform.judge_verdict` row per question per
 * run), by run conversation — for cells whose own answer text is empty (before server 53b9785ceb).
 */
export async function loadDecisionAnswers(conversationIds: string[]): Promise<Map<string, DecisionAnswers>> {
  const out = new Map<string, DecisionAnswers>();
  for (let i = 0; i < conversationIds.length; i += 80) {
    const chunk = conversationIds.slice(i, i + 80);
    const data = await readAllRows(
      ({ from, to }) =>
        createClient()
          .schema("platform")
          .from("judge_verdict")
          .select("id, question, verdict, metadata", { count: "exact" })
          .eq("subject_kind", "decision_answer")
          .in("metadata->>conversation_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      { label: "platform.judge_verdict (Jev answers by run)" },
    );
    for (const row of data) {
      const md = (row.metadata ?? {}) as Record<string, unknown>;
      const conv = String(md.conversation_id ?? "");
      if (!conv) continue;
      const p = Number(md.probability);
      const pa = Number(md.p_answer);
      const answers = out.get(conv) ?? {};
      answers[row.question] = {
        answer: String(row.verdict ?? ""),
        probability: md.probability != null && Number.isFinite(p) ? p : null,
        pAnswer: md.p_answer != null && Number.isFinite(pa) ? pa : null,
      };
      out.set(conv, answers);
    }
  }
  return out;
}

/** Save one truth mark (null clears it) on the bench. */
export async function saveRoundTruth(setId: string, itemId: string, truth: RoundTruth | null): Promise<void> {
  await mergeComparisonSetMetadata(setId, (current) => {
    const bench = (current[BENCH_KEY] ?? {}) as Record<string, unknown>;
    const marks = { ...((bench.truth ?? {}) as Record<string, RoundTruth>) };
    if (truth) marks[itemId] = truth;
    else delete marks[itemId];
    return { ...current, [BENCH_KEY]: { ...bench, truth: marks } };
  });
}

/**
 * Label Jev's answer with the person's truth through the decision review door, so it feeds the
 * agent's calibration. Returns a sentence when any label did not land, else null. Never rejects.
 */
export async function labelJevAnswer(item: RoundItem, truth: RoundTruth, jevConversationId: string): Promise<string | null> {
  const problems: string[] = [];
  for (const { question, answer } of jevLabel(item.judgment, truth)) {
    try {
      const out = await labelConversations([jevConversationId], question, answer);
      const skipped = out.skipped[jevConversationId];
      if (skipped) problems.push(skipped);
    } catch (err) {
      problems.push(err instanceof Error ? err.message : String(err));
    }
  }
  return problems.length ? `Jev's answer was not labeled: ${problems.join(" · ")}` : null;
}

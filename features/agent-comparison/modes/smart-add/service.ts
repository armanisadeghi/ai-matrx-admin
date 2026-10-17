/**
 * Smart Add truth bench — I/O. Search goes to the server's search door (`/search-kinds/search`);
 * the battle row, its cells and the relation vocabulary are read and written straight in Supabase;
 * cells run on the server's matrix runner; a truth mark on Jev's answer goes through the decision
 * review door so it feeds calibration platform-wide.
 */

import { createClient } from "@/utils/supabase/client";
import { requireAuthenticatedSupabaseSession } from "@/utils/supabase/webDb";
import { readAllRows } from "@ai-matrx/data/db";
import type { AppDispatch } from "@/lib/redux/store";
import { runKindSearch, type RunSearchArgs } from "@/features/search/service";
import { labelConversations } from "@/features/agents/decision-review/service";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { resolveMandateDefaultAgentId } from "@/features/mandates/admin/service";
import { mandateDefinitions } from "@/lib/supabase/mandateStorage";
import { createComparisonSet, mergeComparisonSetMetadata } from "../../service/comparisonSetsService";
import { MATRIX_RUN_PATH } from "../matrix/service";
import type { MatrixCellResult } from "../matrix/types";
import { callApi, type ApiCallConfig } from "@/lib/api/call-api";
import { consumeStream } from "@/lib/api/stream-parser";
import { setupToMetadata } from "../matrix/model";
import {
  BENCH_KEY,
  buildSetup,
  cellsToRun,
  mergeResults,
  type BenchResult,
  type BenchState,
  type Engine,
  type RelationKind,
  type SystemAnswer,
  type Truth,
} from "./model";

/** Results per engine call: Brave answers up to 20 per page, Google 10. */
export const PAGE_SIZE: Record<Engine, number> = { brave: 20, google: 10 };

export interface NetProgress {
  done: number;
  total: number;
  failures: string[];
}

/** Every query × engine × page, merged into unique results. */
export async function castNet(
  post: RunSearchArgs["post"],
  queries: string[],
  pages: number,
  onProgress: (p: NetProgress) => void,
  signal?: AbortSignal,
  onResults?: (results: BenchResult[]) => void,
) {
  const jobs = queries.flatMap((query) =>
    (["google", "brave"] as Engine[]).flatMap((engine) =>
      Array.from({ length: pages }, (_, i) => ({ query, engine, page: i + 1 })),
    ),
  );
  // Stable order: by query, engine, page — the order a person reads the plan in.
  const order = (c: { query: string; engine: Engine; page: number }) =>
    `${queries.indexOf(c.query).toString().padStart(3, "0")}:${c.engine}:${c.page.toString().padStart(2, "0")}`;
  const calls: { engine: Engine; query: string; page: number; pageSize: number; result: unknown }[] = [];
  const failures: string[] = [];
  let done = 0;
  onProgress({ done, total: jobs.length, failures });
  await Promise.all(
    jobs.map(async (job) => {
      try {
        await runKindSearch({
          post,
          query: job.query,
          provider: job.engine,
          count: PAGE_SIZE[job.engine],
          options: { vertical: "web", page: job.page },
          signal,
          onOutcome: (o) => {
            calls.push({ ...job, pageSize: PAGE_SIZE[job.engine], result: o.result });
            // Stream: every engine page that lands shows at once, merged and in plan order.
            onResults?.(mergeResults([...calls].sort((a, b) => order(a).localeCompare(order(b)))));
          },
        });
      } catch (err) {
        failures.push(`${job.engine} "${job.query}" page ${job.page}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        done += 1;
        onProgress({ done, total: jobs.length, failures: [...failures] });
      }
    }),
  );
  calls.sort((a, b) => order(a).localeCompare(order(b)));
  return { results: mergeResults(calls), failures };
}

/**
 * Who judges, read from data at the moment of the run: today's holder is the agent that holds the
 * mandate `brand_intake.web_result_classifier` now; Jev is the agent the person picked in the
 * canonical agent picker, pre-filled from their own most recent bench (never an id in code, never
 * a raw agent list query).
 */
export async function resolveJudges(userId: string | null): Promise<{ holder: string | null; jev: string | null }> {
  const client = createClient();
  // Prove the browser client carries the person's JWT first: a read sent before the session
  // hydrates leaves as `anon` and comes back "permission denied" (seen 2026-10-16).
  await requireAuthenticatedSupabaseSession(client);
  const { data: mandate, error } = await mandateDefinitions(client)
    .select("*")
    .eq("mandate_key", MANDATE_KEYS.brand_intake__web_result_classifier)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not read who holds the web-result job: ${error.message}`);
  const holder = mandate ? await resolveMandateDefaultAgentId(mandate) : null;
  if (!userId) return { holder, jev: null };
  const { data: last, error: lastError } = await client
    .schema("agent")
    .from("cmp_comparison_sets")
    .select("metadata")
    .eq("created_by", userId)
    .is("deleted_at", null)
    .not(`metadata->${BENCH_KEY}`, "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw new Error(`Could not read your last bench: ${lastError.message}`);
  const lastBench = (last?.metadata as Record<string, unknown> | null)?.[BENCH_KEY] as { agents?: { jev?: unknown } } | undefined;
  const jev = typeof lastBench?.agents?.jev === "string" ? lastBench.agents.jev : null;
  return { holder, jev };
}

/** The shared relation vocabulary (what today's holder answers in), as production reads it. */
export async function loadRelationKinds(): Promise<RelationKind[]> {
  const data = await readAllRows(
    ({ from, to }) =>
      createClient()
        .schema("web")
        .from("brand_relation_kind")
        .select("key, label, stance, has_sentiment, description, sort, is_known, status", { count: "exact" })
        .is("deleted_at", null)
        .eq("status", "active")
        .eq("is_known", true)
        .order("sort", { ascending: true })
        .order("key", { ascending: true })
        .range(from, to),
    { label: "web.brand_relation_kind (shared vocabulary)" },
  );
  return data.map((k) => ({
    key: k.key,
    label: k.label,
    stance: k.stance,
    has_sentiment: k.has_sentiment,
    description: k.description,
  }));
}

/**
 * File the battle (a matrix set carrying the bench) and return the cells its run will make. The page
 * shows every cell as Waiting at once, then {@link streamRun} moves each one live.
 */
export async function prepareRun(
  bench: BenchState,
  userId: string,
  organizationId: string,
): Promise<{ setId: string; bench: BenchState; cells: CellRef[] }> {
  const kinds = await loadRelationKinds();
  const stances = Object.fromEntries(kinds.map((k) => [k.key, k.stance ?? ""]));
  const frozen: BenchState = { ...bench, stances, ranAt: new Date().toISOString() };
  const setup = buildSetup(frozen, kinds);
  const set = await createComparisonSet({
    name: `Smart Add bench · ${bench.brand.name || bench.brand.website}`,
    userId,
    organizationId,
    metadata: { ...setupToMetadata(setup), [BENCH_KEY]: frozen as unknown as Record<string, unknown> },
  });
  return { setId: set.id, bench: frozen, cells: cellsToRun(setup, bench.systems) };
}

export type CellRef = { row_id: string; column_id: string; repeat: number };

/** One live event from the battle runner (`matrx_connect` MatrixBattle*Event). */
export type RunEvent =
  | { type: "matrix_battle_cell_started"; entry_id: string; row_id: string; column_id: string; conversation_id: string }
  | {
      type: "matrix_battle_cell_finished";
      entry_id: string;
      row_id: string;
      column_id: string;
      status: string;
      error?: string | null;
      conversation_id?: string | null;
      result?: MatrixCellResult | null;
    }
  | { type: "matrix_battle_finished"; counts: Record<string, number> };

/**
 * Run the cells and hand every event to the page AS IT ARRIVES (the server streams one per cell
 * start and finish). Resolves with the run's error, if any, once the stream ends; the cells keep
 * running on the server if the page goes away, and a reopened bench reads them from the rows.
 */
export async function streamRun(
  dispatch: AppDispatch,
  setId: string,
  organizationId: string,
  cells: CellRef[],
  onEvent: (e: RunEvent) => void,
): Promise<string | null> {
  const errors: string[] = [];
  const config: ApiCallConfig<typeof MATRIX_RUN_PATH, "POST"> = {
    path: MATRIX_RUN_PATH,
    method: "POST",
    pathParams: { set_id: setId } as never,
    body: { cells, scope: "all" } as never,
    stream: true,
    scopeOverrides: { organization_id: organizationId },
    consumeStream: async (response: Response) => {
      await consumeStream(response, {
        onData: (data) => {
          const d = data as { type?: unknown };
          if (typeof d.type === "string" && d.type.startsWith("matrix_battle_")) onEvent(data as unknown as RunEvent);
        },
        onError: (e) => {
          errors.push(e.user_message || e.message || "The run reported an error.");
        },
      });
    },
  };
  const result = await dispatch(callApi(config));
  if (result.error) return result.error.message || "The run could not start.";
  return errors.length ? errors.join(" · ") : null;
}

/**
 * Jev's answers, read from the decision answer store (one `platform.judge_verdict` row per
 * question per run) by run conversation — the same rows a truth mark labels. A matrix cell's own
 * `answer` was empty for decision agents until the server fix of 2026-10-16, so the store is
 * the reader that works for every cell, old and new.
 */
export async function loadJevAnswers(conversationIds: string[]): Promise<Map<string, SystemAnswer>> {
  const out = new Map<string, SystemAnswer>();
  const kinds = new Map<string, string>();
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
      if (row.question === "kind") kinds.set(conv, String(row.verdict ?? ""));
      if (row.question !== "stance") continue;
      const v = String(row.verdict ?? "");
      const p = Number(md.p_answer);
      out.set(conv, {
        stance: v === "ours" || v === "about_us" || v === "not_us" ? v : "cant_tell",
        label: null,
        probability: Number.isFinite(p) ? p : null,
      });
    }
  }
  for (const [conv, a] of out) a.label = kinds.get(conv) ?? null;
  return out;
}

/** Save one truth mark (null clears it) and, when Jev answered that result, label its answer. */
export async function saveTruth(
  setId: string,
  key: string,
  truth: Truth | null,
  jevConversationId: string | null,
): Promise<{ labelError: string | null }> {
  await mergeComparisonSetMetadata(setId, (current) => {
    const bench = (current[BENCH_KEY] ?? {}) as Record<string, unknown>;
    const marks = { ...((bench.truth ?? {}) as Record<string, Truth>) };
    if (truth) marks[key] = truth;
    else delete marks[key];
    return { ...current, [BENCH_KEY]: { ...bench, truth: marks } };
  });
  if (!truth || !jevConversationId) return { labelError: null };
  try {
    const out = await labelConversations([jevConversationId], "stance", truth);
    const skipped = out.skipped[jevConversationId];
    return { labelError: skipped ? `Jev's answer was not labelled: ${skipped}` : null };
  } catch (err) {
    return { labelError: `Jev's answer was not labelled: ${err instanceof Error ? err.message : String(err)}` };
  }
}

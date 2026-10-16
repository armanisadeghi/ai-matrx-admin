/**
 * Smart Add truth bench — I/O. Search goes to the server's search door (`/search-kinds/search`);
 * the battle row, its cells and the relation vocabulary are read and written straight in Supabase;
 * cells run on the server's matrix runner; a truth mark on Jev's answer goes through the decision
 * review door so it feeds calibration platform-wide.
 */

import { createClient } from "@/utils/supabase/client";
import type { AppDispatch } from "@/lib/redux/store";
import { runKindSearch, type RunSearchArgs } from "@/features/search/service";
import { labelConversations } from "@/features/agents/decision-review/service";
import { createComparisonSet, mergeComparisonSetMetadata } from "../../service/comparisonSetsService";
import { runMatrixCells } from "../matrix/service";
import { setupToMetadata } from "../matrix/model";
import {
  BENCH_KEY,
  buildSetup,
  cellsToRun,
  mergeResults,
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
) {
  const jobs = queries.flatMap((query) =>
    (["google", "brave"] as Engine[]).flatMap((engine) =>
      Array.from({ length: pages }, (_, i) => ({ query, engine, page: i + 1 })),
    ),
  );
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
          onOutcome: (o) => calls.push({ ...job, pageSize: PAGE_SIZE[job.engine], result: o.result }),
        });
      } catch (err) {
        failures.push(`${job.engine} "${job.query}" page ${job.page}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        done += 1;
        onProgress({ done, total: jobs.length, failures: [...failures] });
      }
    }),
  );
  // Stable order: by query, engine, page — the order a person reads the plan in.
  const order = (c: { query: string; engine: Engine; page: number }) =>
    `${queries.indexOf(c.query).toString().padStart(3, "0")}:${c.engine}:${c.page.toString().padStart(2, "0")}`;
  calls.sort((a, b) => order(a).localeCompare(order(b)));
  return { results: mergeResults(calls), failures };
}

/** The shared relation vocabulary (what today's holder answers in), as production reads it. */
export async function loadRelationKinds(): Promise<RelationKind[]> {
  const { data, error } = await createClient()
    .schema("web")
    .from("brand_relation_kind")
    .select("key, label, stance, has_sentiment, description, sort, is_known, status")
    .is("deleted_at", null)
    .eq("status", "active")
    .eq("is_known", true)
    .order("sort", { ascending: true });
  if (error) throw new Error(`Could not read the relation kinds: ${error.message}`);
  return (data ?? []).map((k) => ({
    key: k.key,
    label: k.label,
    stance: k.stance,
    has_sentiment: k.has_sentiment,
    description: k.description,
  }));
}

/**
 * Create the battle (a matrix set carrying the bench) and start every needed cell on the server.
 * Resolves as soon as the battle exists; `finished` settles when the server's run stream ends —
 * the cells keep running on the server even if the page goes away, and the page reads them by poll.
 */
export async function createAndRun(
  dispatch: AppDispatch,
  bench: BenchState,
  userId: string,
  organizationId: string,
): Promise<{ setId: string; finished: Promise<string | null> }> {
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
  const finished = runMatrixCells(dispatch, set.id, organizationId, {
    cells: cellsToRun(setup, bench.systems),
    scope: "all",
  }).then((outcome) => outcome.error ?? (outcome.streamErrors.join(" · ") || null));
  return { setId: set.id, finished };
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
    const { data, error } = await createClient()
      .schema("platform")
      .from("judge_verdict")
      .select("question, verdict, metadata")
      .eq("subject_kind", "decision_answer")
      .in("metadata->>conversation_id", chunk);
    if (error) throw new Error(`Could not read Jev's answers: ${error.message}`);
    for (const row of data ?? []) {
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

/**
 * Judge verdicts — the TRUE answer per question, recorded during a battle.
 *
 * WHERE THEY LIVE, and why there is no new table: `FEATURE.md` for this
 * feature already ruled the Phase 2 judge model onto
 * `agent.cmp_comparison_sets.metadata` with "no schema change to the entry
 * rows". A verdict belongs to the SET (one truth per question for the whole
 * comparison), not to a column, so the set's metadata is exactly the right
 * shape — and a migration for one jsonb key would be a new table nobody
 * asked for.
 *
 * A verdict is also what makes calibration possible later: FEATURE.md's
 * `verbalized_calibrated` method is "a per-agent-version correction learned
 * from ground-truth verdicts", and these rows are those verdicts.
 *
 * Unsaved battles have no set id. That is stated on screen rather than
 * pretending a verdict was kept — a judgement that silently evaporates is
 * worse than no verdict column at all.
 */

import { createClient } from "@/utils/supabase/client";
import type { JsonObject } from "@ai-matrx/data/db";
import { mergeComparisonSetMetadata } from "../service/comparisonSetsService";

export const DECISION_VERDICTS_KEY = "decision_verdicts" as const;

export interface DecisionVerdict {
  /** The true answer, as the judge writes it. Free text by design: a score
   *  judged "about a 3" and a choice judged "frontend" are both answers. */
  answer: string;
  /** ISO timestamp of the last edit. */
  notedAt: string;
}

export type DecisionVerdicts = Record<string, DecisionVerdict>;

function asVerdicts(value: unknown): DecisionVerdicts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: DecisionVerdicts = {};
  for (const [name, entry] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.answer !== "string") continue;
    out[name] = {
      answer: record.answer,
      notedAt:
        typeof record.notedAt === "string"
          ? record.notedAt
          : new Date(0).toISOString(),
    };
  }
  return out;
}

/** Read the verdicts a comparison set already carries. */
export async function loadDecisionVerdicts(
  setId: string,
): Promise<DecisionVerdicts> {
  const { data, error } = await createClient()
    .schema("agent")
    .from("cmp_comparison_sets")
    .select("metadata")
    .eq("id", setId)
    .single();
  if (error) throw error;
  const metadata = (data as { metadata?: unknown } | null)?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return asVerdicts((metadata as Record<string, unknown>)[DECISION_VERDICTS_KEY]);
}

/**
 * Write one question's verdict through the guarded metadata merge,
 * so a verdict written here never discards a key another surface put on the
 * same metadata blob.
 */
export async function saveDecisionVerdict(
  setId: string,
  questionName: string,
  answer: string,
): Promise<DecisionVerdicts> {
  const trimmed = answer.trim();
  const metadata = await mergeComparisonSetMetadata(setId, (current) => {
    const verdicts = asVerdicts(current[DECISION_VERDICTS_KEY]);
    if (trimmed === "") delete verdicts[questionName];
    else verdicts[questionName] = { answer: trimmed, notedAt: new Date().toISOString() };
    return { ...current, [DECISION_VERDICTS_KEY]: verdicts } as JsonObject;
  });
  return asVerdicts(metadata[DECISION_VERDICTS_KEY]);
}

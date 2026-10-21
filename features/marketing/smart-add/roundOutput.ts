/**
 * A FINISHED identify run, read from its stored output (`GET /runs/{id}` → `output[step]`): the same findings the
 * live round reader (SmartAddRound.tsx) reports from the same steps' final outputs — every step's evidence, the
 * web step's own-site first data, the facts agent's findings as rows, and the "we think" suggestions. Pure.
 *
 * Used where nobody watches the run live (the background found search decides from it whether to tell the person).
 */

import { evidenceFromPayload, type EvidenceItem } from "./evidence";
import { brandNameFromPayload, factEvidence, webFirstData } from "./firstData";
import { ANCHOR_STEPS, FACT_STEPS, IDENTIFY_STEPS, WE_THINK_STEPS } from "./roundSteps";
import { factsFromPayload, type BrandFact } from "./validate/queue";
import { suggestionsFromPayload, type WeThinkSuggestion } from "./weThink";

/** Every step `finishedRound` reads. */
export const FINISHED_ROUND_STEPS: readonly string[] = [
  ...new Set(["web", "facts", ...IDENTIFY_STEPS, ...ANCHOR_STEPS, ...FACT_STEPS, ...WE_THINK_STEPS]),
];
/** The keys inside each step it reads: the findings, the facts / suggestions kinds, the web step's own-site rows. */
export const FINISHED_ROUND_KEYS: readonly string[] = [
  "evidence",
  "brand_evidence",
  "own_site_results",
  "domain",
  "__kind",
  "content",
  "structured_output",
  "brand_basics",
  "facts",
  "suggestions",
];

/**
 * The slim slice of a finished run: `GET /runs/{id}?steps=…&keys=…` (aidream workflow.py project_run_output) returns
 * only what `finishedRound` reads (the load law: the client gets only what it renders). Live 2026-10-21: a name-only
 * round is 1.19 MB stored; the reader needed its findings alone.
 */
export function finishedRoundPath(runId: string): string {
  const q = new URLSearchParams({ steps: FINISHED_ROUND_STEPS.join(","), keys: FINISHED_ROUND_KEYS.join(",") });
  return `/runs/${encodeURIComponent(runId)}?${q.toString()}`;
}

export interface FinishedRound {
  evidence: EvidenceItem[];
  facts: BrandFact[];
  suggestions: Record<string, WeThinkSuggestion>;
}

export function finishedRound(output: Record<string, unknown> | null | undefined): FinishedRound {
  const out = output ?? {};
  const facts = [...IDENTIFY_STEPS, ...FACT_STEPS].flatMap((s) => factsFromPayload(out[s]));
  const evidence = [
    ...webFirstData(out.web ?? null),
    ...[...IDENTIFY_STEPS, ...ANCHOR_STEPS].flatMap((s) => evidenceFromPayload(out[s])),
    ...factEvidence(facts, brandNameFromPayload(out.facts ?? null)),
  ];
  const suggestions = Object.assign({}, ...WE_THINK_STEPS.map((s) => suggestionsFromPayload(out[s]))) as Record<string, WeThinkSuggestion>;
  return { evidence, facts, suggestions };
}

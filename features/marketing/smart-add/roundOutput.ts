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

// features/education/study/learning-gain/gainOffer.ts
//
// Which learning-gain offer (if any) a deck shows — pure, no I/O, so the rule
// is testable and the card only renders it.
//
//   - BASELINE: the deck has never been studied, has no baseline taking, and
//     the person has not answered the offer for it. Offered right after a deck
//     or kit is made; a skip is remembered on the server and never asked again.
//   - POST: a completed baseline for this deck has no post yet, deck mastery
//     reached the threshold knob, and the person has not answered the offer.
//
// Both offers reuse the assessment engine's own baseline/post machinery
// (`education.assessment_result` phase + gain_group_id) — no second engine.

import type { AssessmentResultRow } from "@/features/education/assessment/data/types";

/** Knob `education.learning_gain.post_test_mastery` — the seeded default. */
export const DEFAULT_POST_TEST_MASTERY = 0.8;
/** Knob `education.learning_gain.baseline_questions` — the seeded default. */
export const DEFAULT_BASELINE_QUESTIONS = 5;

export const POST_TEST_MASTERY_KNOB = {
  feature: "education.learning_gain",
  key: "post_test_mastery",
} as const;
export const BASELINE_QUESTIONS_KNOB = {
  feature: "education.learning_gain",
  key: "baseline_questions",
} as const;

export const baselineOfferKey = (deckId: string) => `baseline:${deckId}`;
export const postOfferKey = (deckId: string) => `post:${deckId}`;

export type GainOffer =
  | { kind: "baseline" }
  | { kind: "post"; assessmentId: string; gainGroupId: string }
  | null;

export interface GainOfferInput {
  deckId: string;
  /** This person's baseline/post rows (any subject; filtered here). */
  results: readonly AssessmentResultRow[];
  /** Offers already answered (`userPreferences.flashcard.learningGainOffers`). */
  answered: Readonly<Record<string, string>>;
  /** Cards studied at least once; null = not known yet (offer nothing). */
  studied: number | null;
  /** Share of the deck mastered 0..1; null = not known yet. */
  masteredPct: number | null;
  threshold: number;
}

export function decideGainOffer(input: GainOfferInput): GainOffer {
  const mine = input.results.filter(
    (r) => r.source_kind === "deck" && r.source_id === input.deckId,
  );
  const baselines = mine.filter((r) => r.phase === "baseline");

  const completed = baselines
    .filter((r) => r.status === "completed" && r.score_value != null && r.gain_group_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const open = completed.find(
    (b) => !mine.some((r) => r.phase === "post" && r.gain_group_id === b.gain_group_id),
  );
  if (
    open?.gain_group_id &&
    !input.answered[postOfferKey(input.deckId)] &&
    input.masteredPct != null &&
    input.masteredPct >= input.threshold
  ) {
    return { kind: "post", assessmentId: open.assessment_id, gainGroupId: open.gain_group_id };
  }

  if (
    baselines.length === 0 &&
    !input.answered[baselineOfferKey(input.deckId)] &&
    input.studied === 0
  ) {
    return { kind: "baseline" };
  }
  return null;
}

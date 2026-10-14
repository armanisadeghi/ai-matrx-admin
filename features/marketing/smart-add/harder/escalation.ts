/**
 * Smart Add · person paths: automatic escalation (2026-10-14; the server twin is aidream
 * services/brand_intake/paths.py `escalate_on_answers`, same rule, same tests).
 *
 * Every candidate of a round marked Not me / Namesake, or nothing to mark, steps one rung down the ladder
 * (easy → harder → hard → close to impossible) without the person asking. Any "me", or a candidate not answered yet,
 * holds the rung. The bottom rung never escalates.
 */

export const PERSON_LADDER = ["person_easy", "person_harder", "person_hard", "person_near_impossible"] as const;

export function nextPersonRung(path: string): string | null {
  const i = PERSON_LADDER.indexOf(path as (typeof PERSON_LADDER)[number]);
  return i >= 0 && i + 1 < PERSON_LADDER.length ? PERSON_LADDER[i + 1] : null;
}

export type CandidateAnswer = "me" | "not_me" | "namesake" | "skip" | "maybe" | null;

export interface Escalation {
  from: string;
  to: string;
  reason: string;
}

export function autoEscalation(path: string, answers: CandidateAnswer[], candidates: number): Escalation | null {
  const to = nextPersonRung(path);
  if (!to) return null;
  if (candidates === 0) return { from: path, to, reason: "nothing matched this round" };
  if (answers.length >= candidates && answers.every((a) => a === "not_me" || a === "namesake")) {
    return { from: path, to, reason: "every candidate was marked Not me" };
  }
  return null;
}

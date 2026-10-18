/**
 * Pure helpers behind the Cases / Battle / Debrief tab bodies: which declared inputs a case sets
 * (they show as variable pills), what a finished battle says in one plain line, and whether Keep
 * is the primary action (only when the candidate won).
 */

import { pairwiseLine, scoreTally, type PairwiseVerdict, type SetupScore } from "@/features/agent-tests/battle";

export interface CaseInputDeclaration {
  name: string;
  label?: string | null;
  helpText?: string | null;
}

/** The agent's declared inputs that this case actually sets (empty values do not count). */
export function caseInputs<T extends CaseInputDeclaration>(variables: unknown, declarations: readonly T[]): T[] {
  if (!variables || typeof variables !== "object" || Array.isArray(variables)) return [];
  const set = variables as Record<string, unknown>;
  return declarations.filter((d) => {
    const v = set[d.name];
    return v !== undefined && v !== null && v !== "";
  });
}

export interface BattleVerdict {
  /** The plain result line: who won, or tie, or still running. */
  line: string;
  tone: "success" | "neutral" | "warning";
  /** True only when the candidate won: Keep is then the tab's primary action. */
  keepIsPrimary: boolean;
}

/** What a battle says in one line. Pure: the same score always reads the same. */
export function battleVerdict(
  score: { scores: SetupScore[]; winner: string | null; settled: boolean },
  labelOf: (key: string) => string,
): BattleVerdict {
  if (!score.settled) return { line: "Running", tone: "neutral", keepIsPrimary: false };
  const tally = scoreTally(score.scores, labelOf);
  if (!score.winner) return { line: `Tie · ${tally}`, tone: "neutral", keepIsPrimary: false };
  const won = score.winner === "candidate";
  return {
    line: `${labelOf(score.winner)} wins · ${tally}`,
    tone: won ? "success" : "warning",
    keepIsPrimary: won,
  };
}

/**
 * What a battle with pairwise verdicts says: who gave the better answers, how sure. Keep is primary
 * only on a CLEAR candidate win (sign test p ≤ 1/8: 3–0, 4–0, 5–1 …); a lean or a tie never is.
 */
export function pairwiseBattleVerdict(v: PairwiseVerdict, labelOf: (key: string) => string): BattleVerdict {
  const line = pairwiseLine(v, labelOf);
  if (!v.settled || v.confidence !== "clear") return { line, tone: "neutral", keepIsPrimary: false };
  const won = v.wins > v.losses && v.challenger === "candidate";
  return { line, tone: v.wins > v.losses ? "success" : "warning", keepIsPrimary: won };
}

/** The Keep button's words: it says plainly when the candidate did not win. */
export function keepLabel(state: { kept: boolean; keeping: boolean; won: boolean }): string {
  if (state.kept) return "Kept";
  if (state.keeping) return "Keeping…";
  return state.won ? "Keep candidate" : "Keep anyway";
}

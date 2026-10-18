/**
 * Battle on cases — ONE implementation for every battle surface (Agent Studio's Battle tab and the
 * Agent Battle page's "Run on server"): a battle is a test run with `setups` through the one eval
 * runner (`POST /agent-tests/runs`, CONTRACT §4.1); results land in `agent.test_result`, one per
 * case × setup. This module names what each column runs and scores the results; nothing else
 * scores a battle.
 */

import { VERDICT_META } from "./verdicts";
import type { TestResultView } from "./types";
import type { BattleSetup } from "./service";

export type RunSetupBody = BattleSetup;

export const LIVE_KEY = "live";

export function liveSetup(agentId: string): RunSetupBody {
  return { key: LIVE_KEY, label: "Live", holder: { kind: "agent", id: agentId } };
}

export function modelSetup(agentId: string, modelId: string, label: string): RunSetupBody {
  return { key: "model", label, holder: { kind: "agent", id: agentId }, patch: { model_id: modelId } };
}

export function versionSetup(versionId: string, versionNumber: number): RunSetupBody {
  return { key: `v${versionNumber}`, label: `Version ${versionNumber}`, holder: { kind: "agent_version", id: versionId } };
}

/**
 * About what the battle will cost, in cents: the measured average per result of this agent's
 * past results (run + judge), × cases × setups. Null when nothing has been measured yet.
 */
export function estimateBattleCents(history: readonly TestResultView[], cases: number, setups: number): number | null {
  const measured = history
    .map((r) => (r.runCostCents ?? 0) + (r.judgeCostCents ?? 0))
    .filter((c) => c > 0);
  if (measured.length === 0 || cases === 0 || setups === 0) return null;
  const avg = measured.reduce((a, b) => a + b, 0) / measured.length;
  return avg * cases * setups;
}

export interface SetupScore {
  key: string;
  pass: number;
  fail: number;
  other: number;
  pending: number;
}

/** Pass / fail per setup, and the winner: the setup with the most passes when every result is in. */
export function battleScore(
  results: readonly TestResultView[],
  setupKeys: readonly string[],
): { scores: SetupScore[]; winner: string | null; settled: boolean } {
  const scores = setupKeys.map<SetupScore>((key) => ({ key, pass: 0, fail: 0, other: 0, pending: 0 }));
  for (const r of results) {
    if (r.door === "parity") continue;
    const s = scores.find((x) => x.key === r.setupKey);
    if (!s) continue;
    if (!r.verdict) s.pending += 1;
    else if (VERDICT_META[r.verdict].counted === "pass") s.pass += 1;
    else if (VERDICT_META[r.verdict].counted === "fail") s.fail += 1;
    else s.other += 1;
  }
  const settled = scores.every((s) => s.pending === 0) && results.length > 0;
  const best = Math.max(...scores.map((s) => s.pass));
  const leaders = scores.filter((s) => s.pass === best);
  return { scores, winner: settled && best > 0 && leaders.length === 1 ? leaders[0].key : null, settled };
}

/** Each setup's tally as one line: "Live 2/3 · Other model 3/3". */
export function scoreTally(scores: readonly SetupScore[], labelOf: (key: string) => string): string {
  return scores.map((s) => `${labelOf(s.key)} ${s.pass}/${s.pass + s.fail + s.other + s.pending}`).join(" · ");
}

/** The battle's outcome in one line: running, a tie, or who won. */
export function scoreLine(
  score: { scores: SetupScore[]; winner: string | null; settled: boolean },
  labelOf: (key: string) => string,
): string {
  if (!score.settled) return "Running";
  const tally = scoreTally(score.scores, labelOf);
  return score.winner ? `${labelOf(score.winner)} wins · ${tally}` : `Tie · ${tally}`;
}

export interface SetupJudgeScore {
  key: string;
  /** Results the judge decided (a ledger row exists). */
  judged: number;
  /** The judge held the facts: `pass_judged`. */
  holds: number;
  /** The judge said only the format is wrong: `fail_format`. */
  format: number;
  /** Judged, but the verdict went another way (violated, unanswerable, advisory). */
  other: number;
}

/** What the cheap judge decided, per setup (PLAN §3). Results the checks settled are not counted. */
export function judgeScore(results: readonly TestResultView[], setupKeys: readonly string[]): SetupJudgeScore[] {
  return setupKeys.map((key) => {
    const mine = results.filter((r) => r.setupKey === key && r.door !== "parity" && r.judgeVerdictId);
    const holds = mine.filter((r) => r.verdict === "pass_judged").length;
    const format = mine.filter((r) => r.verdict === "fail_format").length;
    return { key, judged: mine.length, holds, format, other: mine.length - holds - format };
  });
}

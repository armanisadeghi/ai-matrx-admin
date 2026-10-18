/**
 * A battle's verdict says which version gave the better answers, and how sure (2026-10-18).
 * Before: the winner was the setup with more absolute passes, so a strict case tied every battle
 * and one lucky pass read as "Candidate wins". Now: pairwise rows per case × run, the person's
 * votes outrank the judge, and "wins" needs a sign-test-clear lead.
 */
import {
  answerRows,
  battleScore,
  pairwiseLine,
  pairwiseVerdict,
  signTestP,
} from "../battle";
import { pairwiseBattleVerdict } from "@/features/agents/studio/tab-logic";
import { resolveTestRun } from "@/features/ai-watch/followed-work-resolve";
import type { TestResultView } from "../types";

const labelOf = (k: string) => (k === "candidate" ? "Candidate" : "Live");
let n = 0;
const answer = (caseId: string, setupKey: string, verdict = "fail"): TestResultView =>
  ({ id: `a${n++}`, caseId, setupKey, door: "manual", status: "done", verdict, pairwise: null }) as unknown as TestResultView;
const pair = (caseId: string, winner: string | null, repeat = 1, status = "done"): TestResultView =>
  ({
    id: `p${n++}`, caseId, setupKey: "candidate", repeat, door: "pairwise", status, verdict: null,
    pairwise: { baseline: "live", challenger: "candidate", winner, reason: `${winner} because`, model: "m", conversationId: "c", requestId: null },
  }) as unknown as TestResultView;

describe("pairwiseVerdict", () => {
  it("is null for a run without pairwise rows (the old pass/fail score still applies)", () => {
    expect(pairwiseVerdict([answer("c1", "live")])).toBeNull();
  });

  it("calls 3–0 a clear candidate win and makes Keep primary", () => {
    const rows = ["c1", "c2", "c3"].flatMap((c) => [answer(c, "live"), answer(c, "candidate"), pair(c, "candidate")]);
    const v = pairwiseVerdict(rows)!;
    expect(v).toMatchObject({ settled: true, wins: 3, losses: 0, ties: 0, confidence: "clear" });
    expect(pairwiseBattleVerdict(v, labelOf)).toEqual({ line: "Candidate wins 3–0", tone: "success", keepIsPrimary: true });
  });

  it("never calls one case a win: 1–0 is a lean with too few cases", () => {
    const v = pairwiseVerdict([answer("c1", "live"), answer("c1", "candidate"), pair("c1", "candidate")])!;
    expect(v.confidence).toBe("leans");
    expect(pairwiseBattleVerdict(v, labelOf)).toEqual({
      line: "Leans Candidate 1–0 · too few cases to call", tone: "neutral", keepIsPrimary: false,
    });
  });

  it("decides a case by the majority of its runs, and a split is even", () => {
    const v = pairwiseVerdict([pair("c1", "candidate", 1), pair("c1", "candidate", 2), pair("c2", "candidate", 1), pair("c2", "live", 2)])!;
    expect(v.cases.map((c) => c.winner)).toEqual(["candidate", "tie"]);
  });

  it("waits while any pairwise row is still being judged", () => {
    const v = pairwiseVerdict([pair("c1", "candidate"), pair("c2", null, 1, "pending")])!;
    expect(v.settled).toBe(false);
    expect(pairwiseLine(v, labelOf)).toBe("Judging");
  });

  it("lets the person's votes outrank the judge on that case", () => {
    const live = answer("c1", "live");
    const cand = answer("c1", "candidate");
    const v = pairwiseVerdict([live, cand, pair("c1", "live")], { [cand.id]: "up", [live.id]: "down" })!;
    expect(v.cases[0]).toMatchObject({ winner: "candidate", byVote: true });
  });

  it("names a clear live win as a warning, never a Keep", () => {
    const rows = ["c1", "c2", "c3", "c4"].map((c) => pair(c, "live"));
    expect(pairwiseBattleVerdict(pairwiseVerdict(rows)!, labelOf)).toEqual({ line: "Live wins 4–0", tone: "warning", keepIsPrimary: false });
  });

  it("reads an even split as too close to call", () => {
    const v = pairwiseVerdict([pair("c1", "candidate"), pair("c2", "live"), pair("c3", "tie")])!;
    expect(pairwiseLine(v, labelOf)).toBe("Too close to call · 1–1 · 1 tie");
  });
});

describe("pairwise rows are not answers", () => {
  it("the pass/fail score and the run table skip them", () => {
    const rows = [answer("c1", "live", "pass"), answer("c1", "candidate", "pass"), pair("c1", "candidate", 1, "pending")];
    expect(battleScore(rows, ["live", "candidate"]).settled).toBe(true);
    expect(answerRows(rows)).toHaveLength(2);
  });

  it("Watch AI lists the pairwise judge's own call, not a phantom answer", () => {
    const r = resolveTestRun({ key: "test_run:t1", id: "t1" }, { status: "running" }, [
      { id: "p1", case_id: "c1", status: "done", verdict: null, verdict_reason: null, conversation_id: null, user_request_ids: null,
        outcome: { pairwise: { conversation_id: "judge-conv", request_id: null, winner: "candidate", model: "gemini-3.8-flash" } } },
    ]);
    expect(r.steps.map((s) => s.id)).toEqual(["pairwise.p1"]);
    expect(r.conversationIds).toContain("judge-conv");
  });
});

describe("signTestP", () => {
  it("is 1/8 for 3–0 and 1/2 for 1–0", () => {
    expect(signTestP(3, 3)).toBeCloseTo(0.125);
    expect(signTestP(1, 1)).toBeCloseTo(0.5);
    expect(signTestP(5, 6)).toBeCloseTo(7 / 64);
  });
});

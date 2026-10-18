/**
 * The Cases / Battle / Debrief tab logic: which inputs a case sets (they show as pills), what a
 * finished battle says in one plain line, and when Keep is the primary action.
 */
import { battleScore } from "../battle";
import { battleVerdict, caseInputs, keepLabel } from "../tab-logic";
import type { TestResultView } from "@/features/agent-tests/types";

const result = (over: Partial<TestResultView>): TestResultView =>
  ({ id: "r", caseId: "c1", setupKey: "live", door: "agent_call", verdict: "pass", ...over }) as TestResultView;

const labelOf = (k: string) => (k === "candidate" ? "Candidate" : "Live");

describe("caseInputs", () => {
  const declared = [{ name: "customer" }, { name: "tone" }, { name: "order" }];
  it("keeps only the declared inputs the case sets", () => {
    expect(caseInputs({ customer: "Ana", tone: "", order: null, stray: "x" }, declared).map((d) => d.name)).toEqual(["customer"]);
  });
  it("reads a case with no variables as no inputs", () => {
    expect(caseInputs(null, declared)).toEqual([]);
    expect(caseInputs([], declared)).toEqual([]);
    expect(caseInputs({}, declared)).toEqual([]);
  });
});

describe("battleVerdict", () => {
  it("says Running until every result has a verdict", () => {
    const score = battleScore([result({ verdict: null as never })], ["live", "candidate"]);
    expect(battleVerdict(score, labelOf)).toMatchObject({ line: "Running", keepIsPrimary: false });
  });
  it("makes Keep primary only when the candidate wins", () => {
    const won = battleScore(
      [result({ setupKey: "live", verdict: "fail" }), result({ id: "r2", setupKey: "candidate", verdict: "pass" })],
      ["live", "candidate"],
    );
    expect(battleVerdict(won, labelOf)).toEqual({ line: "Candidate wins · Live 0/1 · Candidate 1/1", tone: "success", keepIsPrimary: true });
    const lost = battleScore(
      [result({ setupKey: "live", verdict: "pass" }), result({ id: "r2", setupKey: "candidate", verdict: "fail" })],
      ["live", "candidate"],
    );
    expect(battleVerdict(lost, labelOf)).toMatchObject({ line: "Live wins · Live 1/1 · Candidate 0/1", tone: "warning", keepIsPrimary: false });
  });
  it("reads an equal score as a tie, never a winner", () => {
    const tie = battleScore(
      [result({ setupKey: "live", verdict: "fail" }), result({ id: "r2", setupKey: "candidate", verdict: "error" })],
      ["live", "candidate"],
    );
    expect(battleVerdict(tie, labelOf)).toMatchObject({ tone: "neutral", keepIsPrimary: false });
    expect(battleVerdict(tie, labelOf).line.startsWith("Tie")).toBe(true);
  });
});

describe("keepLabel", () => {
  it("says plainly when the candidate did not win", () => {
    expect(keepLabel({ kept: false, keeping: false, won: true })).toBe("Keep candidate");
    expect(keepLabel({ kept: false, keeping: false, won: false })).toBe("Keep anyway");
    expect(keepLabel({ kept: false, keeping: true, won: false })).toBe("Keeping…");
    expect(keepLabel({ kept: true, keeping: false, won: false })).toBe("Kept");
  });
});

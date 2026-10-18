import { toResultView } from "../service";
import { judgeMeta } from "../verdicts";

// The server stores the judge's decision on the result outcome (`_with_judge`): advisory when its
// agreement with people is below the bar, fed_ok=false when its request lacked an expected fact.
// The page must read both, or an advisory verdict looks like a binding one.
const row = (outcome: unknown) =>
  toResultView({ id: "r1", test_run_id: "t1", case_id: "c1", outcome, checks: [] } as never);

describe("the judge's advisory state reaches the result view", () => {
  it("reads advisory, its reason, fed_ok and missing facts off the outcome", () => {
    const view = row({
      status: "completed",
      judge: { verdict: "holds", advisory: true, advisory_reason: "kappa 0.41 < 0.6 over 52 labels",
               fed_ok: false, model: "claude-haiku-5-5", missing_facts: ["Benedita"] },
    });
    expect(view.outcome?.judge).toEqual({
      verdict: "holds", advisory: true, advisoryReason: "kappa 0.41 < 0.6 over 52 labels",
      fedOk: false, model: "claude-haiku-5-5", missingFacts: ["Benedita"],
    });
  });

  it("no judge on the outcome is null, not a blank judge", () => {
    expect(row({ status: "completed" }).outcome?.judge).toBeNull();
  });

  it("the judge row says Advisory beside the model", () => {
    expect(judgeMeta("claude-haiku-5-5", { model: null, advisory: true })).toBe("claude-haiku-5-5 · Advisory");
    expect(judgeMeta(null, { model: "gemini-3.8-flash", advisory: false })).toBe("gemini-3.8-flash");
    expect(judgeMeta(null, null)).toBeUndefined();
  });
});

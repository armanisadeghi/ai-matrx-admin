import { roundFailed } from "../roundFailure";

const step = (over: Record<string, unknown> = {}) => ({ step: "probe", phase: "settled", progress: null, notes: [], costUsd: 0, skipped: false, ...over });

describe("roundFailed", () => {
  it("a clean run that found nothing is not a failure", () => {
    expect(roundFailed({ status: "completed", steps: [step(), step({ step: "page" })] })).toBe(false);
  });
  it("a completed run whose lookup step errored did not finish", () => {
    expect(roundFailed({ status: "completed", steps: [step({ errored: true }), step({ step: "page" })] })).toBe(true);
    expect(roundFailed({ status: "completed", steps: [step({ phase: "failed" })] })).toBe(true);
  });
  it("a failed run did not finish; no view yet is not a failure", () => {
    expect(roundFailed({ status: "failed", steps: [] })).toBe(true);
    expect(roundFailed(undefined)).toBe(false);
  });
});

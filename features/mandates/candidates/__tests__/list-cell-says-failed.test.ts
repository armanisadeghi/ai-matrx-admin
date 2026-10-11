/**
 * A Candidates cell whose pairs FAILED reads as failed — never "3 of 3 in"
 * (verifier, 2026-10-10: all three pairs failed and the cell still read like
 * a finished, healthy collection).
 */
jest.mock("@/utils/supabase/client", () => ({ supabase: { rpc: jest.fn() } }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "user-1" }));

import { candidateCellText } from "../components/CandidateListCell";

const base = {
  id: "8eceef14-62ea-43e3-84fa-b45f7253197e",
  status: "ready",
  runs_wanted: 3,
  runs_in: 3,
  runs_failed: 0,
  runs_stopped: 0,
  runs_regressed: 0,
  stalled: false,
  open_count: 1,
  recommendation: null,
} as const;

describe("candidateCellText", () => {
  it("healthy collection: n of m in", () => {
    expect(candidateCellText({ ...base, runs_in: 2 })).toBe("2 of 3 in");
  });
  it("every pair in failed: says failed, never 'in'", () => {
    expect(candidateCellText({ ...base, runs_failed: 3 })).toBe("3 of 3 failed");
  });
  it("some failed: the failure rides beside the count", () => {
    expect(candidateCellText({ ...base, runs_in: 2, runs_failed: 1 })).toBe("2 of 3 in · 1 failed");
  });
  it("worse than live is named too", () => {
    expect(candidateCellText({ ...base, runs_regressed: 2 })).toBe("3 of 3 in · 2 worse");
  });
});

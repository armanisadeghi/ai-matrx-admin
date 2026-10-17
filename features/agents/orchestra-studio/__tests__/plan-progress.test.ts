import { membersFromPlan, planProgress, statusLabel, statusOf } from "../plan-progress";
import type { SystemPlanStep } from "../types";

const step = (n: number, agent: string | null, extra: Partial<SystemPlanStep> = {}): SystemPlanStep => ({
  n,
  title: `Step ${n}`,
  markdown: "",
  summary: `Does thing ${n}.`,
  job: `Job ${n}`,
  doer: "agent",
  modelClass: null,
  usesAgentId: agent,
  usesAgentName: agent ? `Agent ${agent}` : null,
  ...extra,
});

describe("plan progress", () => {
  it("counts the steps that have an agent", () => {
    expect(planProgress({ steps: [step(1, "a"), step(2, null), step(3, "c")] })).toEqual({ built: 2, total: 3 });
    expect(planProgress({ steps: [] })).toEqual({ built: 0, total: 0 });
  });
});

describe("Orchestra members from a plan", () => {
  it("takes one member per distinct agent in step order, the step as its role", () => {
    const m = membersFromPlan({ steps: [step(1, "a"), step(2, null), step(3, "b"), step(4, "a")] });
    expect(m.map((x) => x.agentId)).toEqual(["a", "b"]);
    expect(m[0]).toEqual({ agentId: "a", roleTitle: "Step 1", gap: "Does thing 1." });
  });
  it("is empty when no step has an agent", () => {
    expect(membersFromPlan({ steps: [step(1, null)] })).toEqual([]);
  });
});

describe("step agent status", () => {
  it("reads active, inactive, archived and missing agents", () => {
    const row = { is_active: true, is_archived: false, deleted_at: null };
    expect(statusOf(row)).toBe("ready");
    expect(statusOf({ ...row, is_active: false })).toBe("inactive");
    expect(statusOf({ ...row, is_archived: true })).toBe("archived");
    expect(statusOf({ ...row, deleted_at: "2026-01-01" })).toBe("missing");
    expect(statusOf(undefined)).toBe("missing");
    expect(statusLabel("ready")).toBe("Ready");
  });
});

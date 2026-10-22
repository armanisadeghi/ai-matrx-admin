import { yourPlanCard } from "../yourPlan";

const base = {
  isAuthenticated: true,
  tier: "premium" as const,
  freePlanKey: "free",
  paidPlanKey: "personal-entry",
};

describe("yourPlanCard", () => {
  it("a Pro person is not marked on the Entry card", () => {
    expect(yourPlanCard({ ...base, planKey: "personal-pro" })).toBe("above");
  });
  it("Entry marks the paid card, free marks the free card", () => {
    expect(yourPlanCard({ ...base, planKey: "personal-entry" })).toBe("paid");
    expect(yourPlanCard({ ...base, tier: "free", planKey: "free" })).toBe("free");
  });
  it("signed out marks nothing; no usage answer falls back to the tier", () => {
    expect(yourPlanCard({ ...base, isAuthenticated: false, planKey: null })).toBe("none");
    expect(yourPlanCard({ ...base, planKey: null })).toBe("above");
    expect(yourPlanCard({ ...base, tier: "free", planKey: null })).toBe("free");
  });
});

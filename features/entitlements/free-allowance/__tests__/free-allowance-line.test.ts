import { describe, expect, it } from "@jest/globals";
import { freeAllowanceLine, parseFreeAllowance } from "../FreeAllowanceNote";

const base = { feature: "comparison.run", resets_at: "2026-10-19T00:00:00+00:00", enforced: false };

describe("free allowance line", () => {
  it("says nothing for paid people or unknown state, never zero", () => {
    expect(freeAllowanceLine(parseFreeAllowance({ ...base, tier: "paid", limit: null, used: null, remaining: null }))).toBeNull();
    expect(freeAllowanceLine(parseFreeAllowance({ ...base, tier: "guest", limit: null, used: 0, remaining: null }))).toBeNull();
    expect(freeAllowanceLine(null)).toBeNull();
  });
  it("counts down honestly", () => {
    expect(freeAllowanceLine(parseFreeAllowance({ ...base, tier: "guest", limit: 3, used: 0, remaining: 3 }))?.text).toBe("3 free today");
    expect(freeAllowanceLine(parseFreeAllowance({ ...base, tier: "guest", limit: 3, used: 2, remaining: 1 }))?.text).toBe("1 left today");
  });
  it("opens a door when used up", () => {
    expect(freeAllowanceLine(parseFreeAllowance({ ...base, tier: "guest", limit: 3, used: 3, remaining: 0 })))
      .toEqual({ text: "Sign up free for more", href: "/sign-up" });
    expect(freeAllowanceLine(parseFreeAllowance({ ...base, tier: "free", limit: 10, used: 10, remaining: 0 }))?.href).toBe("/pricing");
  });
});

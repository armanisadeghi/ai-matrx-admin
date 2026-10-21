// 2026-10-21: 142 kept offerings carry metadata.contamination_review (minted by a past defect); the screen showed
// them as ordinary confirmed rows. They surface as "Needs a look" with a one-line reason.
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import { buildOfferingItems, reviewOf } from "../data";

const row = (id: string, metadata: unknown) => ({ id, name: `Item ${id}`, kind: "service", price_note: null, metadata });

describe("flagged offerings need a look", () => {
  it("reads the flag into one plain line", () => {
    expect(reviewOf({ contamination_review: { reason: "not_offered_ruling" } })?.reason).toMatch(/does not offer/);
    expect(reviewOf({ contamination_review: { reason: "x", why: "because" } })?.reason).toBe("because");
    expect(reviewOf({})).toBeNull();
  });
  it("only flagged kept rows carry a review", () => {
    const items = buildOfferingItems([], [row("a", { contamination_review: { reason: "foreign_tier_placement_only" } }), row("b", {})]);
    expect(items.find((i) => i.offeringId === "a")?.review).not.toBeNull();
    expect(items.find((i) => i.offeringId === "b")?.review).toBeNull();
  });
});

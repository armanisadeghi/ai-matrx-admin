import { mergeBrandProfile, parseBrandProfile } from "@/features/marketing/types";

describe("Brand Foundations profile keys", () => {
  it("parses competitor objects and legacy strings without dropping name/domain", () => {
    expect(
      parseBrandProfile({
        competitors: [
          "ERI",
          { name: "Sims", domain: "sims.com", handles: ["@sims", ""] },
          { key: "zapier" },
          "eri",
          { domain: "nameless.com" },
        ],
      }).competitors,
    ).toEqual([{ name: "ERI" }, { name: "Sims", domain: "sims.com", handles: ["@sims"] }, { name: "zapier" }]);
  });

  it("round-trips competitor domains through an editor save (the old parser dropped them)", () => {
    const stored = { competitors: [{ name: "Sims", domain: "sims.com" }], brand_aliases: ["Acme Inc"] };
    const saved = mergeBrandProfile(stored, { ...parseBrandProfile(stored), audience: "Buyers" });
    expect(saved).toEqual({ competitors: [{ name: "Sims", domain: "sims.com" }], brand_aliases: ["Acme Inc"], audience: "Buyers" });
  });

  it("keeps the six Foundations keys and drops retired profile.offerings on save", () => {
    const stored = {
      offerings: ["Old list"],
      usp: "Same-day",
      brand_promise: "On time",
      personality: ["warm"],
      imagery_style: "bright",
      iconography: "line",
      vocabulary: { use: ["comfort"], avoid: ["cheap"] },
    };
    const parsed = parseBrandProfile(stored);
    expect(parsed).toEqual({
      usp: "Same-day",
      brand_promise: "On time",
      personality: ["warm"],
      imagery_style: "bright",
      iconography: "line",
      vocabulary: { use: ["comfort"], avoid: ["cheap"] },
    });
    const saved = mergeBrandProfile(stored, parsed) as Record<string, unknown>;
    expect(saved.offerings).toBeUndefined();
    expect(saved.vocabulary).toEqual({ use: ["comfort"], avoid: ["cheap"] });
  });
});

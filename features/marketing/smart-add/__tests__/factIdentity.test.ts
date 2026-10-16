import { factIdentity, foundByForSource, normalizePhone } from "../factIdentity";
import { mergeConfirmedIntoPlan, planKeptFacts } from "../keptFacts";
import { toFactRules } from "../factRules";
import type { BrandFact } from "../validate/queue";
import rulesSample from "./fixtures/fact_rules.json";

// A sample of the server's GET /brand-intake/promote/rules (the only copy of the filing rules is the server's).
const rules = toFactRules(rulesSample);

const fact = (field: string, value: string, key: string): BrandFact =>
  ({ key, field, field_label: field, value, certainty: "likely", reason: "", evidence_urls: [], run_id: "r1" }) as unknown as BrandFact;

describe("one fact, however it is formatted (MKT-172)", () => {
  it("phones compare as E.164", () => {
    expect(normalizePhone("(415) 604-2165")).toBe("+14156042165");
    expect(normalizePhone("+1-415-604-2165")).toBe("+14156042165");
    expect(factIdentity("email", " Hi@Ex.com ")).toBe(factIdentity("email", "hi@ex.com"));
  });

  it("an account saved with and without a trailing slash is one fact, on every platform (MKT-185)", () => {
    for (const [a, b] of [
      ["https://www.facebook.com/snowpeak/", "https://www.facebook.com/snowpeak"],
      ["https://instagram.com/Snow.Peak/", "http://www.instagram.com/snow.peak?hl=en"],
      ["https://x.com/snowpeak/", "https://x.com/snowpeak"],
      ["https://www.tiktok.com/@snowpeak/", "https://tiktok.com/@snowpeak"],
    ]) {
      expect(factIdentity("social_profile", a)).toBe(factIdentity("social_profile", b));
    }
    const plan = planKeptFacts(
      [fact("social_facebook", "https://www.facebook.com/snowpeak/", "k1"), fact("social_facebook", "https://www.facebook.com/snowpeak", "k2")],
      () => undefined,
      rules,
    );
    expect(plan.rows).toHaveLength(1);
  });

  it("a confirmed phone the facts agent also found is ONE row, confirmed, with the mandate key", () => {
    const plan = planKeptFacts([fact("phone", "(415) 604-2165", "phone:4156042165")], () => undefined, rules);
    const { plan: merged, remaining } = mergeConfirmedIntoPlan(plan, [
      { kind: "phone", value: "+1-415-604-2165", foundBy: "brand_intake.early_facts", typed: false },
    ]);
    expect(remaining).toHaveLength(0);
    expect(merged.rows).toHaveLength(1);
    expect(merged.rows[0].decision).toBe("confirmed");
    expect(merged.rows[0].metadata.found_by).toBe("brand_intake.early_facts");
  });

  it("the facts agent's same phone under two field names is one row", () => {
    const plan = planKeptFacts([fact("phone", "(415) 604-2165", "a"), fact("toll_free_phone", "415-604-2165", "b")], () => undefined, rules);
    expect(plan.rows).toHaveLength(1);
  });

  it("a confirmed fact nobody planned is returned once, and the node name never becomes found_by", () => {
    const plan = planKeptFacts([], () => undefined, rules);
    const c = { kind: "phone", value: "(212) 555-0100", foundBy: foundByForSource("facts", "web_search"), typed: false };
    const { remaining } = mergeConfirmedIntoPlan(plan, [c, { ...c, value: "212-555-0100" }]);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].foundBy).toBe("brand_intake.early_facts");
    expect(foundByForSource("probe", "website")).not.toBe("probe");
  });
});

describe("a finding keeps the mandate of the agent that produced it (MKT-180)", () => {
  it("a what's-new fact is never credited to the facts agent", () => {
    expect(foundByForSource("facts", "web_search", "brand_intake.whats_new")).toBe("brand_intake.whats_new");
    expect(foundByForSource("facts", "web_search")).toBe("brand_intake.early_facts");
    expect(foundByForSource("facts", "typed", "brand_intake.whats_new")).toBe("typed_by_person");
  });
});

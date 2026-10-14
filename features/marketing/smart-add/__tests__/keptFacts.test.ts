import round from "./fixtures/ritual_facts_round.json";
import { factsFromPayload } from "../validate/queue";
import { factSlotKey } from "../firstData";
import { planKeptFacts } from "../keptFacts";
import type { Decision } from "../evidence";

// A stored round (ritualcoffee.com) → what Create writes. Before this, Create wrote none of these facts
// (brand 5176c85e: 0 business facts, 0 offerings, profile {}).
const facts = factsFromPayload(round.output).map((f) => ({ ...f, run_id: round.run_id }));

function plan(decisions: Record<string, Decision> = {}, already = {}) {
  return planKeptFacts(facts, (f) => {
    const k = factSlotKey(f);
    return k ? decisions[k] : undefined;
  }, { brandName: "Ritual Coffee Roasters", ...already });
}

describe("Create keeps every fact the person did not say No to", () => {
  it("parses the stored round", () => {
    expect(facts).toHaveLength(18);
  });

  it("keeps every fact, each with its provenance", () => {
    const p = plan();
    expect(p.rows).toHaveLength(18);
    for (const r of p.rows) {
      expect(r.decision).toBe("kept");
      expect(r.metadata).toMatchObject({
        found_by: "brand_intake.early_facts",
        agent_kind: "brand_basics",
        run_id: round.run_id,
        step: "facts",
        field: r.fact.field,
        certainty: r.fact.certainty,
        decision: "kept",
        evidence_key: r.fact.key,
      });
    }
    const kinds = Object.fromEntries(p.rows.map((r) => [r.fact.value, r.kind]));
    expect(kinds["(415) 641-1011"]).toBe("phone");
    expect(kinds["info@ritualroasters.com"]).toBe("email");
    expect(kinds["1026 Valencia St"]).toBe("address");
    expect(kinds["Mon - Sun: 4:00 am - 10:00 pm"]).toBe("hours");
    expect(kinds["Ritual Coffee Roasters"]).toBe("legal_name");
    expect(kinds["We're out to forever change the way people know coffee."]).toBe("tagline");
    expect(kinds["2005"]).toBe("other");
    // A profile-home fact has no business_fact row (its home is web.brand.profile).
    expect(kinds["Sightglass Coffee"]).toBeNull();
  });

  it("fills the basics: what you do, industry, audience, offerings, tagline", () => {
    const p = plan();
    expect(p.description).toMatch(/^SF Coffee Roastery/);
    expect(p.industry).toBe("Coffee shop");
    expect(p.tagline).toBe("We're out to forever change the way people know coffee.");
    expect(p.profile.audience).toBe("Specialty coffee drinkers");
    expect(p.profile.expertise_areas).toEqual(["Specialty coffee roasting"]);
    // A merely possible competitor is kept as a finding, never written as a profile truth.
    expect(p.profile.competitors).toBeUndefined();
    expect(p.offerings.map((o) => o.name)).toEqual(["Coffee", "Coffee Subscriptions", "Merchandise"]);
    expect(Object.keys(p.basicsSources).sort()).toEqual(["audience", "industry", "offerings", "tagline", "what_you_do"]);
  });

  it("a No drops the fact; a Yes confirms it", () => {
    const no = plan({ "phone:4158650989": "no" });
    expect(no.rows.map((r) => r.fact.value)).not.toContain("(415) 865-0989");
    const yes = plan({ "phone:4156411011": "yes" });
    expect(yes.rows.find((r) => r.fact.value === "(415) 641-1011")?.decision).toBe("confirmed");
  });

  it("never overrides what the person confirmed", () => {
    const p = plan({}, { description: "Ours", industry: "Cafe", tagline: "Mine" });
    expect(p.description).toBeNull();
    expect(p.industry).toBeNull();
    expect(p.tagline).toBeNull();
    expect(p.rows.some((r) => r.kind === "tagline")).toBe(false);
  });
});

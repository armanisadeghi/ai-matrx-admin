import type { BrandRelationKind } from "@/features/marketing/data/service";
import { buildQueue, coreSettled, decisionFor, factGroup, factsFromPayload, LATER_FACT_GROUP, optionsFor, VALIDATION_THRESHOLD } from "../validate/queue";
import { fixtureEvidence, fixtureFacts, FIXTURE_BRAND_BASICS } from "../validate/fixtures";

const kind = (key: string, stance: BrandRelationKind["stance"]): BrandRelationKind => ({
  id: key,
  key,
  label: key,
  routesTo: key === "not_us" ? "exclusion" : key === "ours" ? "brand_property" : null,
  isKnown: true,
  stance,
  description: null,
  hasSentiment: false,
  match: { hosts: [], paths: [] },
});
const kinds = [kind("ours", "ours"), kind("review_site", "about_us"), kind("mention", "about_us"), kind("not_us", "not_us"), kind("competitor", "competitor")];
const ctx = { ourHosts: ["fullspecstaff.com"], ourAccounts: [], name: "Full Spectrum Search Group" };

function queue(extra: Partial<Parameters<typeof buildQueue>[0]> = {}) {
  return buildQueue({
    items: fixtureEvidence(),
    facts: fixtureFacts(),
    decisions: {},
    webChoices: {},
    answered: new Set(),
    later: [],
    kinds,
    ctx,
    ...extra,
  });
}

describe("validation queue", () => {
  it("orders socials and websites first, then names, then facts, then web results", () => {
    const q = queue();
    // A fact outside the four groups is the later pile (after the web results).
    const kindsInOrder = q.map((f) => (f.fact && factGroup(f.fact.field) === LATER_FACT_GROUP ? "later" : f.kind));
    const firstIndex = (k: string) => kindsInOrder.indexOf(k as never);
    const lastIndex = (k: string) => kindsInOrder.lastIndexOf(k as never);
    expect(kindsInOrder.length).toBeGreaterThan(20);
    expect(lastIndex("account")).toBeLessThan(firstIndex("name"));
    expect(lastIndex("website")).toBeLessThan(firstIndex("name"));
    expect(lastIndex("name")).toBeLessThan(firstIndex("fact"));
    expect(lastIndex("fact")).toBeLessThan(firstIndex("web"));
    if (firstIndex("later") >= 0) expect(lastIndex("web")).toBeLessThan(firstIndex("later"));
  });

  it("collapses an account looked up under two addresses into one card", () => {
    const keys = queue().map((f) => f.key);
    expect(keys.filter((k) => k.startsWith("social:linkedin:")).length).toBe(1);
  });

  it("sends Ask me later to the back and drops answered findings", () => {
    const first = queue()[0];
    const later = queue({ later: [first.key] });
    expect(later[later.length - 1].key).toBe(first.key);
    expect(queue({ answered: new Set([first.key]) }).some((f) => f.key === first.key)).toBe(false);
  });

  it("carries the we-think suggestion without answering it", () => {
    const q = queue();
    const ig = q.find((f) => f.key === "social:instagram:fullspecstaff");
    expect(ig?.suggestion?.choice).toBe("ours");
    // A suggestion never becomes an answer: the item is still open.
    expect(q.some((f) => f.key === "social:instagram:fullspecstaff")).toBe(true);
    // Web results get the rule suggestion (our own host → Ours).
    expect(q.filter((f) => f.kind === "web").some((f) => f.suggestion)).toBe(true);
  });

  it("reads the facts agent's brand_basics wherever it sits", () => {
    expect(factsFromPayload({ output: { result: FIXTURE_BRAND_BASICS } }).map((f) => f.field)).toEqual(["industry", "phone", "headquarters"]);
    expect(factsFromPayload({ nothing: true })).toEqual([]);
    expect(optionsFor("fact")).toEqual(["correct", "wrong", "later", "ignore"]);
    expect(optionsFor("name")).toContain("alias");
    expect(optionsFor("account")).not.toContain("alias");
  });

  it("reads Arman's agent output (facts list, boolean known_field) from a mandate step's structured output", () => {
    const step = {
      result: {
        structured_output: {
          __kind: "brand_basics",
          brand_name: "Viva España",
          notes: ["STATUS: OK — fine."],
          facts: [
            { __kind: "brand_basics_fact", field: "founder", field_label: "Founder", value: "Melissa", certainty: "confirmed", reason: "Bio says so.", evidence_urls: [], known_field: true },
            { __kind: "brand_basics_fact", field: "parking_info", field_label: "Parking", value: "Street", certainty: "likely", reason: "Page.", evidence_urls: [], known_field: false },
            { __kind: "brand_basics_fact", field: "phone", field_label: "Phone", value: "+34 654144623", certainty: "confirmed", reason: "Bio.", evidence_urls: [], known_field: true },
          ],
        },
      },
    };
    const facts = factsFromPayload(step);
    expect(facts.map((f) => f.field)).toEqual(["founder", "parking_info", "phone"]);
    expect(facts[0].known_field).toBe("true");
    // Identity/contact, then type/services, then people, then listings/metrics; the rest is the later pile.
    expect([factGroup("phone"), factGroup("specialty"), factGroup("ceo"), factGroup("yelp_page")]).toEqual([0, 1, 2, 3]);
    expect(factGroup("parking_info")).toBe(LATER_FACT_GROUP);
    const q = buildQueue({
      items: [], facts, decisions: {}, webChoices: {}, answered: new Set(), later: [], kinds: [],
      ctx: { domain: null, accountUrls: [] } as never,
    });
    expect(q.map((f) => f.fact?.field)).toEqual(["phone", "founder", "parking_info"]);
  });

  it("shifts only once name, website and an account are settled", () => {
    expect(VALIDATION_THRESHOLD.minAccounts).toBe(1);
    expect(coreSettled({ name: "X", websiteUrl: "https://x.com", accounts: [] })).toBe(false);
    expect(coreSettled({ name: null, websiteUrl: "https://x.com", accounts: [{}] })).toBe(false);
    expect(coreSettled({ name: "X", websiteUrl: "https://x.com", accounts: [{}] })).toBe(true);
    expect(decisionFor("ours")).toBe("yes");
    expect(decisionFor("later")).toBeNull();
  });
});

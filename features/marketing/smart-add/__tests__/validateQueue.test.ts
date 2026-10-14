import type { BrandRelationKind } from "@/features/marketing/data/service";
import { buildQueue, coreSettled, decisionFor, factsFromPayload, optionsFor, VALIDATION_THRESHOLD } from "../validate/queue";
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
    const kindsInOrder = queue().map((f) => f.kind);
    const firstIndex = (k: string) => kindsInOrder.indexOf(k as never);
    const lastIndex = (k: string) => kindsInOrder.lastIndexOf(k as never);
    expect(kindsInOrder.length).toBeGreaterThan(20);
    expect(lastIndex("account")).toBeLessThan(firstIndex("name"));
    expect(lastIndex("website")).toBeLessThan(firstIndex("name"));
    expect(lastIndex("name")).toBeLessThan(firstIndex("fact"));
    expect(lastIndex("fact")).toBeLessThan(firstIndex("web"));
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

  it("shifts only once name, website and an account are settled", () => {
    expect(VALIDATION_THRESHOLD.minAccounts).toBe(1);
    expect(coreSettled({ name: "X", websiteUrl: "https://x.com", accounts: [] })).toBe(false);
    expect(coreSettled({ name: null, websiteUrl: "https://x.com", accounts: [{}] })).toBe(false);
    expect(coreSettled({ name: "X", websiteUrl: "https://x.com", accounts: [{}] })).toBe(true);
    expect(decisionFor("ours")).toBe("yes");
    expect(decisionFor("later")).toBeNull();
  });
});

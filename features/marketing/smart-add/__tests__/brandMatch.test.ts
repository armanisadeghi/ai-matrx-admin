// Duplicate-brand detection (Arman, 2026-10-14: adding a brand he already has "just creates the duplicate").
// Fails if a brand with the same site, the same account, or the same name in the same place stops matching,
// or if a common word / a shared host starts matching everything.
import {
  describeCandidate,
  domainLabel,
  isGenericName,
  matchBrands,
  normalizeName,
  probeFromDraft,
  probeIsEmpty,
  probeKey,
  type BrandCandidate,
  type BrandProbe,
} from "../brandMatch";
import { SEEDED_RULES as RULES } from "./fixtures/brandMatchRules";
import { gateCreate } from "../createGate";
import { autoWork, confirmedBasics } from "../evidence";
import { parseMatchRules, shortDate } from "../brandMatch";
import { carriedAnswers, withCarried } from "../enrich/carry";
import { smartAddEnrichHref, parseSmartAddUrl } from "../smartAddUrl";

const brand = (over: Partial<BrandCandidate> & { name: string }): BrandCandidate => ({
  id: over.name,
  slug: null,
  organizationId: "org-1",
  organizationName: "Harbor Dental Group",
  createdAt: "2026-10-12T15:00:00Z",
  domains: [],
  accounts: [],
  places: [],
  ...over,
});
const probe = (over: Partial<BrandProbe>): BrandProbe => ({ domains: [], accounts: [], name: null, place: null, ...over });

const ritual = brand({
  name: "Ritual Coffee Roasters",
  domains: ["https://www.ritualcoffee.com/", "ritualcoffee.com"],
  accounts: [{ platform: "instagram", handle: "@ritualcoffee" }],
  places: ["1026 Valencia St, San Francisco, CA 94110"],
});
const pool = [
  ritual,
  brand({ name: "Coffee House Co", domains: ["coffeehouse.com"] }),
  brand({ name: "The Studio", domains: ["thestudio.com"] }),
  brand({ name: "Linktree Fans", domains: ["linktr.ee"], accounts: [{ platform: "instagram", handle: "someoneelse" }] }),
];
const names = (p: BrandProbe) => matchBrands(p, pool, RULES).map((m) => m.brand.name);

describe("matchBrands", () => {
  it("matches the same site, ignoring www, scheme, path and case", () => {
    for (const d of ["ritualcoffee.com", "www.RitualCoffee.com", "https://ritualcoffee.com/menu"]) {
      expect(names(probeFromDraft({ website: d }))).toEqual(["Ritual Coffee Roasters"]);
    }
  });

  it("matches the same account on the same platform, whatever the @ or case", () => {
    expect(names(probe({ accounts: [{ platform: "instagram", handle: "RitualCoffee" }] }))).toEqual(["Ritual Coffee Roasters"]);
    expect(names(probeFromDraft({ social: "https://www.instagram.com/ritualcoffee/" }))).toEqual(["Ritual Coffee Roasters"]);
    expect(names(probeFromDraft({ social: "@ritualcoffee", platform: "instagram" }))).toEqual(["Ritual Coffee Roasters"]);
  });

  it("does not match the same handle on a different platform", () => {
    expect(names(probe({ accounts: [{ platform: "tiktok", handle: "ritualcoffee" }] }))).toEqual([]);
  });

  it("matches the same name only with a shared city", () => {
    const m = matchBrands(probe({ name: "Ritual Coffee Roasters Inc.", place: "San Francisco" }), pool, RULES);
    expect(m.map((x) => x.brand.name)).toEqual(["Ritual Coffee Roasters"]);
    expect(m[0].reasons[0]).toMatchObject({ kind: "name", shared: "city" });
    expect(names(probe({ name: "Ritual Coffee Roasters", place: "Portland, OR" }))).toEqual([]);
    expect(names(probe({ name: "Ritual Coffee Roasters" }))).toEqual([]);
  });

  it("matches the same name with the same domain name on another ending", () => {
    const m = matchBrands(probe({ name: "Ritual Coffee Roasters", domains: ["ritualcoffee.co"] }), pool, RULES);
    expect(m[0].reasons).toEqual([{ kind: "name", shared: "domain", value: "ritualcoffee.com" }]);
  });

  it("never matches on a common word", () => {
    expect(names(probe({ name: "Coffee", place: "San Francisco" }))).toEqual([]);
    expect(names(probe({ name: "The Studio", place: "San Francisco" }))).toEqual([]);
    expect(names(probe({ name: "Coffee House", domains: ["coffeehouse.net"] }))).toEqual([]);
    expect(names(probeFromDraft({ website: "coffee.com", name: "Coffee" }))).toEqual([]);
  });

  it("never matches on a host many brands share", () => {
    expect(names(probeFromDraft({ website: "linktr.ee" }))).toEqual([]);
    expect(names(probeFromDraft({ website: "https://instagram.com/ritualcoffee" }))).toEqual([]);
  });

  it("does not match a different site that merely contains the name", () => {
    expect(names(probeFromDraft({ website: "notritualcoffee.com" }))).toEqual([]);
    expect(names(probeFromDraft({ website: "ritualcoffee.com.au" }))).toEqual([]);
  });

  it("ranks a brand with several reasons first", () => {
    const other = brand({ name: "Ritual Roasters", domains: ["ritualcoffee.com"] });
    const out = matchBrands(probe({ domains: ["ritualcoffee.com"], accounts: [{ platform: "instagram", handle: "ritualcoffee" }] }), [other, ritual], RULES);
    expect(out.map((m) => m.brand.name)).toEqual(["Ritual Coffee Roasters", "Ritual Roasters"]);
  });
});

describe("helpers", () => {
  it("normalizes names and spots generic ones", () => {
    expect(normalizeName("The Ritual Coffee Co.")).toBe("ritual coffee");
    expect(isGenericName("Coffee", RULES)).toBe(true);
    expect(isGenericName("Coffee Shop LLC", RULES)).toBe(true);
    expect(isGenericName("Ritual Coffee", RULES)).toBe(false);
  });
  it("reads the name part of a domain", () => {
    expect(domainLabel("ritualcoffee.co.uk")).toBe("ritualcoffee");
    expect(domainLabel("ritualcoffee.com")).toBe("ritualcoffee");
  });
  it("an entry with nothing usable asks nothing", () => {
    expect(probeIsEmpty(probeFromDraft({ website: "not a site", name: "ab" }))).toBe(true);
    expect(probeIsEmpty(probeFromDraft({ website: "ritualcoffee.com" }))).toBe(false);
  });
  it("equal questions share a key", () => {
    expect(probeKey(probeFromDraft({ website: "https://www.ritualcoffee.com/x" }))).toBe(probeKey(probeFromDraft({ website: "ritualcoffee.com" })));
  });
  it("describes a brand by organization, site, accounts and creation date", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    expect(describeCandidate(ritual, RULES, now)).toBe("Harbor Dental Group · ritualcoffee.com · 1 account · Oct 12");
    const three = brand({ ...ritual, accounts: [1, 2, 3].map((n) => ({ platform: "instagram", handle: `r${n}` })) });
    expect(describeCandidate(three, RULES, now)).toBe("Harbor Dental Group · ritualcoffee.com · 3 accounts · Oct 12");
    expect(shortDate("2025-03-02T15:00:00Z", now)).toBe("Mar 2, 2025");
    expect(describeCandidate(brand({ name: "X", organizationName: null, createdAt: null }), RULES, now)).toBe("");
  });
  it("two same-name brands in different organizations read differently", () => {
    const a = brand({ id: "a", name: "Ritual Coffee Roasters", organizationName: "Harbor Dental Group", domains: ["ritualcoffee.com"], createdAt: "2026-10-12T15:00:00Z" });
    const b = brand({ id: "b", name: "Ritual Coffee Roasters", organizationName: "Second Org", domains: ["ritualcoffee.com"], createdAt: "2026-09-03T15:00:00Z" });
    const out = matchBrands(probe({ domains: ["ritualcoffee.com"] }), [a, b], RULES);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((m) => m.detail)).size).toBe(2);
    expect(out.map((m) => m.detail).join("|")).toContain("Second Org · ritualcoffee.com");
  });
});

describe("add what's new carries the session into enrich", () => {
  it("rides the address and comes back as confirmed answers", () => {
    const href = smartAddEnrichHref("b1", { website: "ritualcoffee.com", social: "@ritualcoffee", platform: "instagram" });
    const [path, query] = href.split("?");
    const a = parseSmartAddUrl(path, query);
    expect(a.enrichBrandId).toBe("b1");
    expect(a.prefill).toMatchObject({ website: "ritualcoffee.com", social: "@ritualcoffee", platform: "instagram" });
    const { items, decisions } = carriedAnswers(a.prefill);
    expect(items.map((i) => i.key)).toEqual(["website:ritualcoffee.com", "social:instagram:ritualcoffee"]);
    expect(Object.values(decisions)).toEqual(["yes", "yes"]);
  });
  it("keeps the brand's own row for a fact it already has", () => {
    const { items, decisions } = carriedAnswers({ website: "ritualcoffee.com" });
    const seed = { items, decisions, known: { people: [], offerings: [], facts: [] }, excludeKeys: [], exclusions: [] };
    expect(withCarried(seed, { website: "https://www.ritualcoffee.com/" }).items).toHaveLength(1);
    expect(smartAddEnrichHref("b1")).toBe("/marketing/brands/smart-add/enrich/b1");
  });
});

describe("the match settings", () => {
  it("a changed word list changes what counts as generic, and a missing one raises", () => {
    const strict = parseMatchRules({ genericWords: ["ritual"], sharedHosts: [], nameMinLength: 3 });
    expect(isGenericName("Ritual", strict)).toBe(true);
    expect(isGenericName("Coffee", strict)).toBe(false);
    expect(matchBrands(probe({ name: "Ritual", place: "San Francisco" }), [brand({ name: "Ritual", places: ["San Francisco"] })], strict)).toEqual([]);
    expect(() => parseMatchRules({ genericWords: undefined, sharedHosts: [], nameMinLength: 3 })).toThrow(/brand_match.generic_words/);
    expect(() => parseMatchRules({ genericWords: [], sharedHosts: [], nameMinLength: "x" })).toThrow(/name_min_length/);
  });
  it("a longer shortest-name setting stops short names matching", () => {
    const long = parseMatchRules({ genericWords: [], sharedHosts: [], nameMinLength: 8 });
    const b = brand({ name: "Ritual", domains: ["ritual.co"] });
    expect(matchBrands(probe({ name: "Ritual", domains: ["ritual.com"] }), [b], RULES)).toHaveLength(1);
    expect(matchBrands(probe({ name: "Ritual", domains: ["ritual.com"] }), [b], long)).toEqual([]);
  });
});

describe("add what's new: the carried answers reach the enrich run's inputs", () => {
  // The run's inputs are built in SmartAddBrand.startRound from exactly these two reads of the seed: autoWork
  // (`website`, `socials`) and confirmedBasics (`confirmed.domain`).
  it("the typed website and account become the first round's seeds and a confirmed domain", () => {
    const known = { people: [], offerings: [], facts: [] };
    const base = { items: [], decisions: {}, known, excludeKeys: [], exclusions: [] };
    const seed = withCarried(base, { website: "https://www.ritualcoffee.com/", social: "@ritualcoffee", platform: "instagram" });
    const items = new Map(seed.items.map((i) => [i.key, i]));
    const work = autoWork(items, seed.decisions, {}, new Set(), new Set());
    expect(work.seeds.website).toBe("https://www.ritualcoffee.com/");
    expect(work.seeds.socials).toEqual([expect.objectContaining({ platform: "instagram", handle_or_url: expect.stringContaining("ritualcoffee") })]);
    expect(confirmedBasics(items, seed.decisions).websiteUrl).toBe("https://www.ritualcoffee.com/");
    // The control: without the carry, nothing is sent.
    expect(autoWork(new Map(), {}, {}, new Set(), new Set()).seeds).toEqual({ website: "", socials: [] });
  });
});

describe("the step at Create", () => {
  const strong = matchBrands(probe({ domains: ["ritualcoffee.com"] }), pool, RULES);
  const find = async () => strong;
  it("asks once for an unanswered strong match, then remembers the answer", async () => {
    const asked: string[] = [];
    const ask = async (q: { description: string }) => (asked.push(q.description), true);
    const first = await gateCreate({ probe: probe({ domains: ["ritualcoffee.com"] }), find, ask, answered: new Set() });
    expect(first.proceed).toBe(true);
    expect(asked).toEqual(["You already have Ritual Coffee Roasters. This makes a separate one."]);
    const again = await gateCreate({ probe: probe({ domains: ["ritualcoffee.com"] }), find, ask, answered: first.answered });
    expect(again.proceed).toBe(true);
    expect(asked).toHaveLength(1);
  });
  it("Not yet stops the Create and remembers nothing", async () => {
    const r = await gateCreate({ probe: probe({ domains: ["ritualcoffee.com"] }), find, ask: async () => false, answered: new Set() });
    expect(r.proceed).toBe(false);
    expect(r.answered.size).toBe(0);
  });
  it("asks nothing with no match, no probe, or a failed check", async () => {
    const ask = async (): Promise<boolean> => {
      throw new Error("must not ask");
    };
    expect((await gateCreate({ probe: probe({}), find: async () => [], ask, answered: new Set() })).proceed).toBe(true);
    expect((await gateCreate({ probe: null, find, ask, answered: new Set() })).proceed).toBe(true);
    expect((await gateCreate({ probe: probe({ name: "x" }), find: async () => Promise.reject(new Error("down")), ask, answered: new Set() })).proceed).toBe(true);
  });
});

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
import { carriedAnswers, withCarried } from "../enrich/carry";
import { smartAddEnrichHref, parseSmartAddUrl } from "../smartAddUrl";

const brand = (over: Partial<BrandCandidate> & { name: string }): BrandCandidate => ({
  id: over.name,
  slug: null,
  organizationId: "org-1",
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
const names = (p: BrandProbe) => matchBrands(p, pool).map((m) => m.brand.name);

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
    const m = matchBrands(probe({ name: "Ritual Coffee Roasters Inc.", place: "San Francisco" }), pool);
    expect(m.map((x) => x.brand.name)).toEqual(["Ritual Coffee Roasters"]);
    expect(m[0].reasons[0]).toMatchObject({ kind: "name", shared: "city" });
    expect(names(probe({ name: "Ritual Coffee Roasters", place: "Portland, OR" }))).toEqual([]);
    expect(names(probe({ name: "Ritual Coffee Roasters" }))).toEqual([]);
  });

  it("matches the same name with the same domain name on another ending", () => {
    const m = matchBrands(probe({ name: "Ritual Coffee Roasters", domains: ["ritualcoffee.co"] }), pool);
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
    const out = matchBrands(probe({ domains: ["ritualcoffee.com"], accounts: [{ platform: "instagram", handle: "ritualcoffee" }] }), [other, ritual]);
    expect(out.map((m) => m.brand.name)).toEqual(["Ritual Coffee Roasters", "Ritual Roasters"]);
  });
});

describe("helpers", () => {
  it("normalizes names and spots generic ones", () => {
    expect(normalizeName("The Ritual Coffee Co.")).toBe("ritual coffee");
    expect(isGenericName("Coffee")).toBe(true);
    expect(isGenericName("Coffee Shop LLC")).toBe(true);
    expect(isGenericName("Ritual Coffee")).toBe(false);
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
  it("describes a brand by its site and accounts", () => {
    expect(describeCandidate(ritual)).toBe("ritualcoffee.com · 1 account");
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

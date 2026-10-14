import { computeEnrichDiff, diffCounts } from "../enrich/diff";
import { enrichSeed, knownFacts, type BrandSnapshot } from "../enrich/known";
import type { Decision, EvidenceItem } from "../evidence";
import type { BrandAsset, BrandProperty, MarketingBrand, MarketingSite } from "@/features/marketing/types";

// A brand as the enrich start window reads it: name, logo, primary site, an Instagram account, a phone.
function snapshot(): BrandSnapshot {
  const brand = {
    id: "b1",
    organization_id: "org-brand",
    name: "Ritual Coffee",
    kind: "company",
    logo_url: "https://cdn.example/logo.png",
    description: null,
    industry: "Coffee shop",
    website_url: "https://ritualcoffee.com",
    profile: {},
  } as unknown as MarketingBrand;
  const sites = [{ id: "s1", root_url: "https://ritualcoffee.com/", domain: "ritualcoffee.com" }] as unknown as MarketingSite[];
  const properties = [
    { id: "p1", kind: "instagram", url: "https://www.instagram.com/ritualcoffee/", handle: "ritualcoffee", display_name: "Ritual" },
  ] as unknown as BrandProperty[];
  return {
    brand,
    sites,
    properties,
    assets: [] as BrandAsset[],
    facts: [{ id: "f1", kind: "phone", label: null, value: { text: "(415) 555-0100" } }] as unknown as BrandSnapshot["facts"],
    people: [{ id: "r1", label: "Eileen Hassi", url: null, relationKey: "founder" }],
    offerings: [],
    exclusions: [{ id: "x1", matchKind: "account", matchValue: "account:tiktok:fakeritual", url: null, label: null, source: null }],
    textKeys: {},
  };
}

function found(key: string, field: EvidenceItem["field"], value: string, extra: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    key, field, value, label: null, image_url: null, url: null, platform: null, handle: null, followers: null,
    verified: null, profile_id: null, source: { node: "probe", kind: "website", url: null, where: "home page" }, confidence: 0.9, ...extra,
  };
}

describe("enrich: what we already know", () => {
  it("lists every current fact with the evidence key the run uses, and seeds only the checked ones", () => {
    const known = knownFacts(snapshot());
    const ids = known.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining([
      "name:ritual coffee", "logo:https://cdn.example/logo.png", "category:coffee shop", "website:ritualcoffee.com",
      "social:instagram:ritualcoffee", "phone:4155550100", "people:r1",
    ]));
    const all = enrichSeed(known, new Set(ids), snapshot().exclusions);
    expect(all.decisions["website:ritualcoffee.com"]).toBe("preferred");
    expect(all.decisions["social:instagram:ritualcoffee"]).toBe("yes");
    expect(all.known.people).toEqual(["Eileen Hassi"]);
    // The NO LIST rides exclude_keys in the run's own key form.
    expect(all.excludeKeys).toContain("social:tiktok:fakeritual");

    const some = enrichSeed(known, new Set(ids.filter((id) => !id.startsWith("social:") && id !== "people:r1")), []);
    expect(some.items.map((i) => i.key)).not.toContain("social:instagram:ritualcoffee");
    expect(some.decisions["social:instagram:ritualcoffee"]).toBeUndefined();
    expect(some.known.people).toEqual([]);
  });
});

describe("enrich: changes to your brand", () => {
  it("finds additions, replacements and conflicts; conflicts default to Keep it; known items are never duplicated", () => {
    const known = knownFacts(snapshot());
    const seed = enrichSeed(known, new Set(known.map((f) => f.id)), []);
    const items = new Map(seed.items.map((i) => [i.key, i]));
    const decisions: Record<string, Decision> = { ...seed.decisions };
    // The run re-finds the Instagram account (already known), finds a new Facebook page and a new logo.
    items.set("social:instagram:ritualcoffee", found("social:instagram:ritualcoffee", "social", "https://instagram.com/ritualcoffee", { confidence: 0.5 }));
    items.set("social:facebook:ritualcoffee", found("social:facebook:ritualcoffee", "social", "https://facebook.com/ritualcoffee", { platform: "facebook", handle: "ritualcoffee" }));
    items.set("logo:https://ritualcoffee.com/new.png", found("logo:https://ritualcoffee.com/new.png", "logo", "https://ritualcoffee.com/new.png"));
    decisions["social:facebook:ritualcoffee"] = "yes";
    // The person says NO to the Instagram account on the brand, and picks the new logo.
    decisions["social:instagram:ritualcoffee"] = "no";
    decisions["logo:https://cdn.example/logo.png"] = "yes";
    decisions["logo:https://ritualcoffee.com/new.png"] = "preferred";

    const diff = computeEnrichDiff({ known, items, decisions });
    const by = (id: string) => diff.find((c) => c.id === id);
    expect(by("conflict:social:instagram:ritualcoffee")?.defaultChoice).toBe("keep");
    expect(by("add:social:facebook:ritualcoffee")?.kind).toBe("add");
    const logo = by("replace:logo");
    expect(logo?.current?.value).toBe("https://cdn.example/logo.png");
    expect(logo?.next?.value).toBe("https://ritualcoffee.com/new.png");
    // The known website and name are unchanged, not re-added.
    expect(diff.filter((c) => c.kind === "add" && c.next?.key === "website:ritualcoffee.com")).toHaveLength(0);
    expect(diffCounts(diff).unchanged).toBeGreaterThan(3);
  });

  it("a NO to the current logo is a conflict, and a new preferred logo is then an addition (never a silent swap)", () => {
    const known = knownFacts(snapshot());
    const seed = enrichSeed(known, new Set(known.map((f) => f.id)), []);
    const items = new Map(seed.items.map((i) => [i.key, i]));
    const decisions: Record<string, Decision> = { ...seed.decisions, "logo:https://cdn.example/logo.png": "no" };
    items.set("logo:https://x/new.png", found("logo:https://x/new.png", "logo", "https://x/new.png"));
    decisions["logo:https://x/new.png"] = "preferred";
    const diff = computeEnrichDiff({ known, items, decisions });
    expect(diff.find((c) => c.id === "conflict:logo:https://cdn.example/logo.png")?.kind).toBe("conflict");
    expect(diff.find((c) => c.id === "add:logo:https://x/new.png")?.slot).toBe("logo");
    expect(diff.some((c) => c.kind === "replace")).toBe(false);
  });

  it("un-keeping the known logo during the run (logos have no Not us) is a NO: a conflict, default Keep it", () => {
    const known = knownFacts(snapshot());
    const checked = new Set(known.map((f) => f.id));
    const seed = enrichSeed(known, checked, []);
    const items = new Map(seed.items.map((i) => [i.key, i]));
    const { ["logo:https://cdn.example/logo.png"]: _dropped, ...decisions } = seed.decisions;
    const diff = computeEnrichDiff({ known, items, decisions, seeded: checked });
    expect(diff.find((c) => c.id === "conflict:logo:https://cdn.example/logo.png")?.defaultChoice).toBe("keep");
    // Without the seeded set (a fact never sent) the same absence is not a NO.
    expect(computeEnrichDiff({ known, items, decisions }).some((c) => c.kind === "conflict")).toBe(false);
  });

  it("an unchecked fact the run never touched stays unchanged (nothing negative is recorded)", () => {
    const known = knownFacts(snapshot());
    const diff = computeEnrichDiff({ known, items: new Map(), decisions: {} });
    expect(diff.every((c) => c.kind === "unchanged")).toBe(true);
  });
});

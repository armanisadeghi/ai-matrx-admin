import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeEvidence, parseEvidenceItem, type EvidenceItem } from "../evidence";
import { addWitnesses, foundAnswers, foundCards, foundCoreReady, witnessOf } from "../found/foundCards";
import type { BrandFact } from "../validate/queue";
import { parseSmartAddDoor, parseSmartAddPath, smartAddFoundHref } from "../smartAddUrl";

// The stored fullspecstaff.com round (2026-10-14): the site, Facebook, LinkedIn, Instagram and YouTube profiles,
// a Linktree and the web tier, every raw item as it streamed (the same key arrives from several sources).
const raw = (JSON.parse(readFileSync(join(__dirname, "fixtures/fullspecstaff_round.json"), "utf8")) as unknown[])
  .map(parseEvidenceItem)
  .filter((i): i is EvidenceItem => i !== null);
const items = [...mergeEvidence(new Map(), raw).values()];
const witnesses = addWitnesses(new Map(), raw);
const TYPED = "website:fullspecstaff.com";

const fact = (field: string, value: string, certainty: string, urls: string[] = []): BrandFact => ({
  key: `fact:${field}:${value.toLowerCase()}`,
  field,
  field_label: field,
  value,
  certainty,
  reason: "",
  evidence_urls: urls,
  known_field: null,
});
const cardsWith = (facts: BrandFact[], decisions = {}) => foundCards({ items, witnesses, facts, decisions, typedWebsiteKey: TYPED });

describe("found-first door: only what two independent hosts agree on gets a card", () => {
  const cards = cardsWith([]);

  it("the name the site and Facebook both give is certain; the page title is one host", () => {
    expect(cards.name?.value).toBe("Full Spectrum Search Group");
    expect(witnesses.get("name:full spectrum search group")).toEqual(new Set(["facebook.com", "fullspecstaff.com"]));
    expect(witnesses.get("name:healthcare executive search for senior care")).toEqual(new Set(["fullspecstaff.com"]));
  });

  it("the typed website is the person's own word; accounts linked from the site AND looked up are certain", () => {
    expect(cards.website?.key).toBe(TYPED);
    expect(cards.accounts.map((a) => a.platform).sort()).toEqual(["facebook", "instagram", "linkedin"]);
    // YouTube was only looked up (one host): no card.
    expect(cards.accounts.some((a) => a.platform === "youtube")).toBe(false);
    expect(foundCoreReady(cards)).toBe(true);
  });

  it("a web result on a host already witnessed is the same witness (facebook.com once, however it arrived)", () => {
    expect(witnesses.get("social:facebook:fullspecstaff")).toEqual(new Set(["facebook.com", "fullspecstaff.com"]));
    const site = raw.find((i) => i.key === "name:healthcare executive search for senior care")!;
    const sameHostWeb: EvidenceItem = { ...site, source: { ...site.source, kind: "web_search", node: "web" }, certainty: "certain", url: "https://www.fullspecstaff.com/about" };
    expect(addWitnesses(new Map(witnesses), [sameHostWeb]).get(site.key)).toEqual(new Set(["fullspecstaff.com"]));
  });

  it("the facts agent is never a witness of its own; a fact adds only the hosts it cites (no double count)", () => {
    const factRow = { ...raw[0], key: "category:executive search", field: "category" as const, value: "Executive search", source: { node: "facts", kind: "web_search" as const, url: null, where: "research" }, certainty: "certain" as const };
    expect(witnessOf(factRow)).toBeNull();
    // Confirmed, but citing only the brand's own site: one host.
    expect(cardsWith([fact("industry", "Executive search", "confirmed", ["https://fullspecstaff.com/about"])]).category).toBeNull();
    // Confirmed, citing two hosts: two.
    expect(cardsWith([fact("industry", "Executive search", "confirmed", ["https://fullspecstaff.com/", "https://www.bbb.org/x"])]).category?.text).toBe(
      "Executive search",
    );
    // A likely fact citing the site agrees with Facebook's own category: two hosts.
    expect(cardsWith([fact("business_category", "Recruiter", "likely", ["https://fullspecstaff.com/"])]).category?.text).toBe("Recruiter");
    // A possible fact adds nothing.
    expect(cardsWith([fact("business_category", "Recruiter", "possible", ["https://fullspecstaff.com/"])]).category).toBeNull();
  });

  it("two hosts that disagree (Recruiter vs Staffing and Recruiting) make no category card", () => {
    expect(cards.category).toBeNull();
  });

  // nlpkak.com, run 25b8f98d (2026-10-16): the facts agent "confirmed" business_type = the site's og:site_name, citing
  // only nlpkak.com. It was counted twice (confirmed = 2) and showed as "What you do".
  it("a page title posing as a category never makes a card, even cited from two hosts", () => {
    const title = "Healthcare Executive Search for Senior Care";
    expect(cardsWith([fact("business_type", title, "confirmed", ["https://fullspecstaff.com/"])]).category).toBeNull();
    expect(cardsWith([fact("business_type", title, "confirmed", ["https://fullspecstaff.com/", "https://www.bbb.org/x"])]).category).toBeNull();
  });

  it("a city cited from two hosts is Based in, with its state; one host is not", () => {
    const two = cardsWith([fact("city", "Laguna Hills", "confirmed", ["https://fullspecstaff.com/", "https://www.yelp.com/biz/x"]), fact("state", "CA", "likely")]);
    expect(two.location?.text).toBe("Laguna Hills, CA");
    expect(cardsWith([fact("city", "Laguna Hills", "confirmed", ["https://fullspecstaff.com/"])]).location).toBeNull();
  });

  it("a web result the fixed rules only call possible is no witness", () => {
    const web = raw.find((i) => i.source.kind === "web_search" && i.certainty === "possible")!;
    expect(witnessOf(web)).toBeNull();
    expect(witnessOf({ ...web, certainty: "certain" })).toBe(new URL(web.url!).hostname.replace(/^www\./, ""));
  });

  it("Not us takes a card away", () => {
    const fb = cards.accounts.find((a) => a.platform === "facebook")!.item.key;
    expect(cardsWith([], { [fb]: "no" }).accounts.some((a) => a.platform === "facebook")).toBe(false);
  });

  it("Looks right answers every card shown: rows through their slot, facts behind a card under their own key", () => {
    const facts = [
      fact("city", "Laguna Hills", "confirmed", ["https://fullspecstaff.com/", "https://www.yelp.com/biz/x"]),
      fact("state", "CA", "likely"),
      fact("website_built_by", "WMS", "confirmed", ["https://fullspecstaff.com/", "https://wms.example/clients"]),
      fact("competitor", "Hunt Scanlon", "confirmed", ["https://huntscanlon.com/a", "https://www.bbb.org/x"]),
    ];
    const shown = cardsWith(facts);
    const answers = foundAnswers(shown, { [TYPED]: "preferred" });
    expect(answers).toContainEqual({ key: "name:full spectrum search group", decision: "preferred" });
    expect(answers.filter((a) => a.key.startsWith("social:")).every((a) => a.decision === "yes")).toBe(true);
    expect(answers.some((a) => a.key === TYPED)).toBe(false);
    expect(answers.some((a) => a.key.startsWith("social:youtube"))).toBe(false);
    // Based in with no address row, the tools card and the competitor card each record their facts.
    for (const f of facts) expect(answers).toContainEqual({ key: f.key, decision: "yes" });
  });
});

describe("found-first door address", () => {
  it("/found is the company session through the found door; every other path is the standard door", () => {
    expect(parseSmartAddPath("/marketing/brands/smart-add/found")).toEqual({ mode: "company", enrichBrandId: null });
    expect(parseSmartAddDoor("/marketing/brands/smart-add/found")).toBe("found");
    expect(parseSmartAddDoor("/marketing/brands/smart-add/company")).toBeNull();
    expect(smartAddFoundHref({ website: "fullspecstaff.com" })).toBe("/marketing/brands/smart-add/found?website=fullspecstaff.com");
  });
});

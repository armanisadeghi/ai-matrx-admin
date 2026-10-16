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

const fact = (field: string, value: string, certainty: string): BrandFact => ({
  key: `fact:${field}:${value}`,
  field,
  field_label: field,
  value,
  certainty,
  reason: "",
  evidence_urls: [],
  known_field: null,
});

describe("found-first door: only what two sources agree on gets a card", () => {
  const cards = foundCards({ items, witnesses, facts: [], decisions: {}, typedWebsiteKey: TYPED });

  it("the name the site, Facebook and LinkedIn all give is certain; the page title is not", () => {
    expect(cards.name?.value).toBe("Full Spectrum Search Group");
    expect(witnesses.get("name:full spectrum search group")?.size).toBeGreaterThanOrEqual(2);
    expect(witnesses.get("name:healthcare executive search for senior care")?.size).toBe(1);
  });

  it("the typed website is the person's own word; the accounts linked from the site AND looked up are certain", () => {
    expect(cards.website?.key).toBe(TYPED);
    expect(cards.accounts.map((a) => a.platform).sort()).toEqual(["facebook", "instagram", "linkedin"]);
    // YouTube was only looked up (one source): no card.
    expect(cards.accounts.some((a) => a.platform === "youtube")).toBe(false);
    expect(foundCoreReady(cards)).toBe(true);
  });

  it("two sources that disagree (Recruiter vs Staffing and Recruiting) make no category card", () => {
    expect(cards.category).toBeNull();
  });

  it("the facts agent's confirmed word counts as two, its likely word as one", () => {
    const confirmed = foundCards({ items, witnesses, facts: [fact("industry", "Executive search", "confirmed")], decisions: {}, typedWebsiteKey: TYPED });
    expect(confirmed.category?.text).toBe("Executive search");
    const likely = foundCards({ items, witnesses, facts: [fact("industry", "Executive search", "likely")], decisions: {}, typedWebsiteKey: TYPED });
    expect(likely.category).toBeNull();
    // A likely category that agrees with one profile's own category is two witnesses.
    const agreeing = foundCards({ items, witnesses, facts: [fact("business_category", "Recruiter", "likely")], decisions: {}, typedWebsiteKey: TYPED });
    expect(agreeing.category?.text).toBe("Recruiter");
  });

  it("a city the facts agent confirmed is Based in, with its state", () => {
    const placed = foundCards({
      items,
      witnesses,
      facts: [fact("city", "Laguna Hills", "confirmed"), fact("state", "CA", "likely")],
      decisions: {},
      typedWebsiteKey: TYPED,
    });
    expect(placed.location?.text).toBe("Laguna Hills, CA");
    expect(foundCards({ items, witnesses, facts: [fact("city", "Laguna Hills", "possible")], decisions: {}, typedWebsiteKey: TYPED }).location).toBeNull();
  });

  it("a web result the fixed rules only call possible is no witness", () => {
    const web = raw.find((i) => i.source.kind === "web_search" && i.certainty === "possible")!;
    expect(witnessOf(web)).toBeNull();
    expect(witnessOf({ ...web, certainty: "certain" })).toBe("web");
  });

  it("Not us takes a card away", () => {
    const fb = cards.accounts.find((a) => a.platform === "facebook")!.item.key;
    const after = foundCards({ items, witnesses, facts: [], decisions: { [fb]: "no" }, typedWebsiteKey: TYPED });
    expect(after.accounts.some((a) => a.platform === "facebook")).toBe(false);
  });

  it("Looks right gives the full review's answers for exactly what is shown, leaving answered keys alone", () => {
    const answers = foundAnswers(cards, { [TYPED]: "preferred" });
    expect(answers).toContainEqual({ key: "name:full spectrum search group", decision: "preferred" });
    expect(answers.filter((a) => a.key.startsWith("social:")).every((a) => a.decision === "yes")).toBe(true);
    expect(answers.some((a) => a.key === TYPED)).toBe(false);
    expect(answers.some((a) => a.key.startsWith("social:youtube"))).toBe(false);
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

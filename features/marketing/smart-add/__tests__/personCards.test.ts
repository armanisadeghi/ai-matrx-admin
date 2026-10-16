import { readFileSync } from "node:fs";
import { join } from "node:path";
import { customItem, mergeEvidence, parseEvidenceItem, type Decision, type EvidenceItem } from "../evidence";
import { addWitnesses } from "../found/foundCards";
import { personAnswers, personCards, personCoreReady } from "../found/personCards";
import type { BrandFact } from "../validate/queue";

const raw = (JSON.parse(readFileSync(join(__dirname, "fixtures/fullspecstaff_round.json"), "utf8")) as unknown[])
  .map(parseEvidenceItem)
  .filter((i): i is EvidenceItem => i !== null);
const NAME = customItem("name", "Jane Q Example");
const items = [...mergeEvidence(new Map(), [NAME, ...raw]).values()];
const witnesses = addWitnesses(new Map(), [NAME, ...raw]);
const TYPED = "website:fullspecstaff.com";
const fact = (field: string, value: string, urls: string[]): BrandFact => ({
  key: `fact:${field}:${value.toLowerCase()}`,
  field,
  field_label: field,
  value,
  certainty: "confirmed",
  reason: "",
  evidence_urls: urls,
  known_field: null,
});
const decided: Record<string, Decision> = { [NAME.key]: "preferred", [TYPED]: "preferred" };
const facts = [
  fact("industry", "Executive search", ["https://fullspecstaff.com", "https://facebook.com/x"]),
  fact("competitor", "Rival Search Co", ["https://a.com", "https://b.com"]),
  fact("technology_used", "WordPress", ["https://fullspecstaff.com", "https://builtwith.com/x"]),
];

describe("found-first door, person variant", () => {
  const cards = personCards({ items, witnesses, facts, decisions: decided, typedWebsiteKey: TYPED, name: "Jane Q Example", avatarUrl: "https://example.com/me.png" });

  it("welcomes the person by first name with their login picture", () => {
    expect(cards.firstName).toBe("Jane");
    expect(cards.name?.key).toBe(NAME.key);
    expect(cards.photo).toEqual({ url: "https://example.com/me.png", profileId: null });
  });

  it("shows the site, the certain accounts and the tools; never a category or a competitor", () => {
    expect(cards.website?.key).toBe(TYPED);
    expect(cards.accounts.length).toBeGreaterThan(0);
    expect(cards.tools?.text).toBe("WordPress");
    expect(Object.keys(cards)).not.toContain("category");
    expect(Object.keys(cards)).not.toContain("competitor");
    expect(personCoreReady(cards)).toBe(true);
  });

  it("Looks right answers every card shown and nothing else", () => {
    const answers = personAnswers(cards, {});
    const keys = answers.map((a) => a.key);
    expect(keys).toContain(NAME.key);
    expect(keys).toContain(TYPED);
    for (const a of cards.accounts) expect(keys).toContain(a.item.key);
    expect(keys).toContain("fact:technology_used:wordpress");
    if (cards.bio?.item) expect(keys).toContain(cards.bio.item.key);
    expect(keys).not.toContain("fact:industry:executive search");
    expect(keys).not.toContain("fact:competitor:rival search co");
    // Already answered keys are left alone.
    expect(personAnswers(cards, decided).map((a) => a.key)).not.toContain(NAME.key);
  });

  it("with no site, the bio is a certain account's own words", () => {
    const account: EvidenceItem = {
      ...customItem("social", "https://www.linkedin.com/in/janeqexample", { platform: "linkedin", handle: "janeqexample", url: "https://www.linkedin.com/in/janeqexample" }),
      anchor: { kind: "account", display_name: "Jane Q Example", bio_line: "Pediatric nurse and author of two picture books", location: null, followers: null, score: 4, reasons: [], person_profile: true, private: false } as unknown as EvidenceItem["anchor"],
    };
    const list = [NAME, account];
    const c = personCards({ items: list, witnesses: addWitnesses(new Map(), list), facts: [], decisions: { [NAME.key]: "preferred", [account.key]: "yes" }, typedWebsiteKey: null, name: "Jane Q Example" });
    expect(c.website).toBeNull();
    expect(c.accounts.map((a) => a.item.key)).toEqual([account.key]);
    expect(c.bio?.text).toBe("Pediatric nurse and author of two picture books");
    expect(personCoreReady(c)).toBe(true);
  });

  it("an unconfirmed single-host account is not shown", () => {
    const account = { ...customItem("social", "https://www.instagram.com/someone", { platform: "instagram", handle: "someone" }), source: { node: "x", kind: "social_profile", url: "https://www.instagram.com/someone", where: "" } } as EvidenceItem;
    const list = [NAME, account];
    const c = personCards({ items: list, witnesses: addWitnesses(new Map(), list), facts: [], decisions: { [NAME.key]: "preferred" }, typedWebsiteKey: null, name: "Jane Q Example" });
    expect(c.accounts).toEqual([]);
    expect(personCoreReady(c)).toBe(false);
  });
});

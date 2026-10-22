/**
 * Sign-up welcome final review (2026-10-21), on the real runs: picking a card confirms what it showed (D3), a
 * narrowing waits on the people (D5), handles past the fit floor break instead of clipping (D7).
 */

import { MIKE_LITTLE, THOMAS_FRANK, THOMAS_FRANK_PHOTO_GROUPS } from "../fixtures/anchorFixtures";
import { MAX_PEOPLE, peopleGroups } from "../peopleGroups";
import { pickedCardFacts, welcomeVerdict } from "../welcomeVerdict";
import { narrowWaiting } from "../welcomeSession";
import { customItem, type Decision, type EvidenceItem } from "../../evidence";
import { addWitnesses } from "../../found/foundCards";
import { fitBreaks } from "../../found/FitText";

const thomas = () => peopleGroups(THOMAS_FRANK.items, "Thomas Frank", MAX_PEOPLE, THOMAS_FRANK_PHOTO_GROUPS).people.find((p) =>
  p.accounts.some((a) => a.key === "social:linkedin:tomfrankly"),
)!;

/** What the grounded round's socials step emits for the YouTube profile's link (brand_identify.py "profile link"). */
const youtubeLink = (): EvidenceItem => {
  const yt = THOMAS_FRANK.items.find((i) => i.key === "social:youtube:thomasfrank")!;
  return {
    ...yt,
    key: "website:thomasjfrank.com",
    field: "website",
    value: "https://thomasjfrank.com/templates",
    url: "https://thomasjfrank.com/templates",
    label: "thomasjfrank.com",
    platform: null,
    handle: null,
    anchor: null,
    image_url: null,
    profile_id: null,
    same_as: [],
    source: { kind: "social_profile", node: "socials", url: yt.url, where: "profile link" },
  };
};

function verdict(items: EvidenceItem[], decisions: Record<string, Decision>) {
  return welcomeVerdict({
    items,
    witnesses: addWitnesses(new Map(), items),
    facts: [],
    decisions,
    seed: null,
    name: "Thomas Frank",
    photoGroups: THOMAS_FRANK_PHOTO_GROUPS,
  });
}

describe("D3 a pick confirms what the card showed", () => {
  it("Thomas Frank: the card's place and company are his answers; nothing it did not show", () => {
    const card = thomas();
    const decisions: Record<string, Decision> = Object.fromEntries(card.accounts.map((a) => [a.key, "yes" as Decision]));
    expect(pickedCardFacts(THOMAS_FRANK.items, decisions, "Thomas Frank")).toEqual({ place: "Des Moines, Iowa", company: "Flylighter" });
    // Before the pick: nothing confirmed.
    expect(pickedCardFacts(THOMAS_FRANK.items, {}, "Thomas Frank")).toEqual({ place: null, company: null });
  });

  it("Mike Little: the place is his; a bio sentence is never a company", () => {
    const card = peopleGroups(MIKE_LITTLE.items, "Mike Little").people.find((p) => p.accounts.some((a) => a.key === "social:linkedin:mglittle"))!;
    const decisions = Object.fromEntries(card.accounts.map((a) => [a.key, "yes" as Decision]));
    expect(pickedCardFacts(MIKE_LITTLE.items, decisions, "Mike Little")).toEqual({ place: "Atlanta, Georgia", company: null });
  });

  it("Thomas Frank: the site his picked YouTube profile links to is his site, and the found view shows all three as certain", () => {
    const card = thomas();
    const place = customItem("address", card.place!);
    const site = youtubeLink();
    const items = [...THOMAS_FRANK.items, place, site];
    const picked: Record<string, Decision> = { ...Object.fromEntries(card.accounts.map((a) => [a.key, "yes" as Decision])), [place.key]: "yes" };

    // The profile's site is to be confirmed (answered yes, which probes it) ...
    const before = verdict(items, picked);
    expect(before.sitesToConfirm.map((i) => i.key)).toEqual(["website:thomasjfrank.com"]);
    // ... a stranger's profile link never is.
    expect(verdict(items, {}).sitesToConfirm).toEqual([]);

    const after = verdict(items, { ...picked, [site.key]: "yes" });
    expect(after.sitesToConfirm).toEqual([]);
    expect(after.cards.website?.key).toBe("website:thomasjfrank.com");
    expect(after.cards.location?.text).toBe("Des Moines, Iowa");
    expect(after.cards.work).toBe("Flylighter");
    expect(after.picked).toBe(true);
  });
});

describe("D3 the picked card survives richer reads of its accounts", () => {
  it("a later row of the same account (no Experience line) keeps the recorded company as theirs", () => {
    const card = thomas();
    const decisions: Record<string, Decision> = Object.fromEntries(card.accounts.map((a) => [a.key, "yes" as Decision]));
    // The grounded round's LinkedIn row replaces the snippet the card read its company from.
    const items = THOMAS_FRANK.items.map((i) => (i.key === "social:linkedin:tomfrankly" ? { ...i, snippet: "Thomas Frank - LinkedIn" } : i));
    expect(pickedCardFacts(items, decisions, "Thomas Frank").company).toBeNull();
    const v = welcomeVerdict({
      items,
      witnesses: addWitnesses(new Map(), items),
      facts: [],
      decisions,
      seed: null,
      name: "Thomas Frank",
      pickedCard: { place: card.place, company: card.company },
    });
    expect(v.pickedFacts).toEqual({ place: "Des Moines, Iowa", company: "Flylighter" });
    expect(v.cards.work).toBe("Flylighter");
    // Never before a pick.
    expect(welcomeVerdict({ items, witnesses: new Map(), facts: [], decisions: {}, seed: null, name: "Thomas Frank", pickedCard: { place: "X", company: "Y" } }).pickedFacts).toEqual({ place: null, company: null });
  });
});

describe("D5 None of these waits on the new round", () => {
  it("waits while the replaced run is current or the new one runs; stops once it settled, a pick, or a failure", () => {
    const base = { from: "run-1" as string | null | undefined, current: "run-1" as string | null, anchorDone: true, anchored: false, failed: false };
    expect(narrowWaiting({ ...base, from: undefined })).toBe(false);
    expect(narrowWaiting(base)).toBe(true);
    expect(narrowWaiting({ ...base, current: "run-2", anchorDone: false })).toBe(true);
    expect(narrowWaiting({ ...base, current: "run-2", anchorDone: true })).toBe(false);
    expect(narrowWaiting({ ...base, anchored: true })).toBe(false);
    expect(narrowWaiting({ ...base, failed: true })).toBe(false);
  });
});

describe("D7 a handle past the fit floor breaks, never clips", () => {
  it("breaks a LinkedIn handle at its dashes and a domain at its dots", () => {
    expect(fitBreaks("@justin-martinez-54b1a37")).toEqual(["@justin-", "martinez-", "54b1a37"]);
    expect(fitBreaks("thomasjfrank.com")).toEqual(["thomasjfrank.", "com"]);
  });
});

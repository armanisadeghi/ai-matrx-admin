/**
 * The "found first" door (smart-add VISION Part 23): which findings are sure enough to show as a card, and which
 * answers the one "Looks right" gives. Pure (no React, no I/O); the session's own state goes in, nothing is decided here.
 *
 * "Certain" = confirmed across sources. Every finding is backed by WITNESSES, the independent places that said it:
 *   - the brand's own website (every page and tag of it is ONE witness: `site`)
 *   - each looked-up profile (`profile:<url>`; Facebook and LinkedIn saying the same name are two)
 *   - a link-in-bio page (`bio:<url>`)
 *   - the web tier, only when its fixed rules call the result `certain` (`web`)
 *   - the facts agent: a fact it marks `confirmed` counts as two (it states it checked more than one source),
 *     `likely` counts as one, `possible` as none
 * A card needs two. What the person typed is their own word and is certain at once. A logo is the brand's own
 * declared picture (its site's structured-data logo, or the main certain account's photo), never a guess.
 */

import type { BrandFact } from "../validate/queue";
import { websiteHost, type Decision, type EvidenceItem } from "../evidence";

/** Witnesses per evidence key (see the file comment): built up from every raw item a round streams. */
export type Witnesses = ReadonlyMap<string, ReadonlySet<string>>;

/** Two witnesses make a finding certain. */
export const CERTAIN_AT = 2;

/** One raw evidence item → the witness it is (null when it is no witness: a guess or the typed address echoed). */
export function witnessOf(item: EvidenceItem): string | null {
  if (item.source.kind === "typed") return "typed";
  if (item.source.where === "the address itself") return null;
  if (item.source.node === "facts") return "facts";
  if (item.source.kind === "website") return "site";
  if (item.source.kind === "social_profile") return `profile:${(item.source.url ?? item.source.where ?? "").toLowerCase()}`;
  if (item.source.kind === "link_in_bio") return `bio:${(item.source.url ?? "").toLowerCase()}`;
  if (item.source.kind === "web_search") return item.certainty === "certain" ? "web" : null;
  return null;
}

/** Add a batch of raw items to the tally. Returns the same map when nothing new was witnessed. */
export function addWitnesses(current: Map<string, Set<string>>, incoming: readonly EvidenceItem[]): Map<string, Set<string>> {
  let next: Map<string, Set<string>> | null = null;
  for (const item of incoming) {
    const w = witnessOf(item);
    if (!w) continue;
    const have = (next ?? current).get(item.key);
    if (have?.has(w)) continue;
    next ??= new Map(current);
    next.set(item.key, new Set([...(have ?? []), w]));
  }
  return next ?? current;
}

const FACT_WEIGHT: Record<string, number> = { confirmed: 2, likely: 1 };
const factWeight = (f: BrandFact) => FACT_WEIGHT[f.certainty] ?? 0;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function score(item: EvidenceItem, witnesses: Witnesses, extra = 0): number {
  const w = witnesses.get(item.key);
  if (w?.has("typed") || item.source.kind === "typed") return CERTAIN_AT;
  return (w?.size ?? 0) + extra;
}

/** The facts agent's word for a value: its weight when one of its facts in `fields` says the same thing. */
function factSupport(facts: readonly BrandFact[], fields: readonly string[], value: string): number {
  const v = norm(value);
  if (!v) return 0;
  return Math.max(0, ...facts.filter((f) => fields.includes(f.field) && norm(f.value) === v).map(factWeight));
}

const NAME_FIELDS = ["official_name", "brand_legal_name", "legal_entity_name", "dba_name"];
const CITY_FIELDS = ["headquarters_location", "city"];
const CATEGORY_FIELDS = ["industry", "business_category", "business_type", "category", "specialty"];
const TOOL_FIELDS = ["technology_used", "website_built_by"];

export interface FoundAccount {
  item: EvidenceItem;
  platform: string;
  handle: string | null;
  followers: number | null;
}

/** What the grid shows. Every part is absent until it is certain. */
export interface FoundCards {
  name: EvidenceItem | null;
  /** The brand's own words about itself (its site, or two sources agreeing). Shown under the name. */
  description: EvidenceItem | null;
  /** The brand's own declared picture: an evidence item (logo or the main account) or null (the initial shows). */
  logo: { url: string; item: EvidenceItem } | null;
  website: EvidenceItem | null;
  /** "Based in": the place text, and the evidence item to confirm when it came from one. */
  location: { text: string; item: EvidenceItem | null } | null;
  /** The main certain accounts, largest audience first (at most four). */
  accounts: FoundAccount[];
  category: { text: string; item: EvidenceItem | null } | null;
  tools: string[];
  competitor: string | null;
}

export interface FoundInput {
  items: readonly EvidenceItem[];
  witnesses: Witnesses;
  facts: readonly BrandFact[];
  decisions: Record<string, Decision>;
  /** `website:<host>` of the website the person typed (their own word). */
  typedWebsiteKey: string | null;
}

const isOurs = (d: Decision | undefined) => d === "preferred" || d === "yes" || d === "alias";

function best(items: EvidenceItem[], s: (i: EvidenceItem) => number): EvidenceItem | null {
  return (
    items
      .map((i) => ({ i, s: s(i) }))
      .filter((x) => x.s >= CERTAIN_AT)
      .sort((a, b) => b.s - a.s || b.i.confidence - a.i.confidence)[0]?.i ?? null
  );
}

export function foundCards({ items, witnesses, facts, decisions, typedWebsiteKey }: FoundInput): FoundCards {
  // A finding the person said Not us to never shows; one they confirmed always does.
  const open = items.filter((i) => decisions[i.key] !== "no");
  const s = (i: EvidenceItem, extra = 0) => (isOurs(decisions[i.key]) ? CERTAIN_AT : score(i, witnesses, extra));
  const of = (field: EvidenceItem["field"]) => open.filter((i) => i.field === field);

  const name = best(of("name"), (i) => s(i, factSupport(facts, NAME_FIELDS, i.value)));
  const description = name
    ? (best(of("description"), (i) => (i.source.kind === "website" && i.source.where !== "the address itself" ? CERTAIN_AT : s(i))) ?? null)
    : null;

  const website =
    of("website").find((i) => i.key === typedWebsiteKey) ?? best(of("website"), (i) => s(i, factSupport(facts, ["website"], i.value)));

  const accounts: FoundAccount[] = of("social")
    .filter((i) => s(i) >= CERTAIN_AT && i.platform)
    .sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1) || b.confidence - a.confidence)
    // One per platform: the largest.
    .filter((i, idx, all) => all.findIndex((x) => x.platform === i.platform) === idx)
    .slice(0, 4)
    .map((i) => ({ item: i, platform: i.platform as string, handle: i.handle, followers: i.followers }));

  const declaredLogo = of("logo")
    .filter((i) => s(i) >= CERTAIN_AT || (i.source.kind === "website" && i.confidence >= 0.95))
    .sort((a, b) => b.confidence - a.confidence)[0];
  const logo = declaredLogo
    ? { url: declaredLogo.image_url ?? declaredLogo.value, item: declaredLogo }
    : accounts[0]?.item.image_url
      ? { url: accounts[0].item.image_url, item: accounts[0].item }
      : null;

  return {
    name,
    description,
    logo,
    website,
    location: findLocation(of("address"), facts, s),
    accounts,
    category: findCategory(of("category"), facts, s),
    tools: [...new Set(facts.filter((f) => TOOL_FIELDS.includes(f.field) && factWeight(f) >= CERTAIN_AT).map((f) => f.value))].slice(0, 3),
    competitor: facts.find((f) => f.field === "competitor" && factWeight(f) >= CERTAIN_AT)?.value ?? null,
  };
}

/** "Based in": a city the facts agent gave (with its state when it gave one), or an address two sources agree on. */
function findLocation(
  addresses: EvidenceItem[],
  facts: readonly BrandFact[],
  s: (i: EvidenceItem, extra?: number) => number,
): FoundCards["location"] {
  const inAddress = (text: string) => addresses.some((a) => norm(a.value).includes(norm(text)));
  for (const f of facts.filter((x) => CITY_FIELDS.includes(x.field))) {
    if (factWeight(f) + (inAddress(f.value) ? 1 : 0) < CERTAIN_AT) continue;
    const state = f.field === "city" ? facts.find((x) => x.field === "state" && factWeight(x) >= 1)?.value : null;
    const text = state && !norm(f.value).includes(norm(state)) ? `${f.value}, ${state}` : f.value;
    return { text, item: addresses.find((a) => norm(a.value).includes(norm(f.value))) ?? null };
  }
  const item = best(addresses, (i) => s(i, factSupport(facts, ["street_address", "headquarters_location"], i.value)));
  return item ? { text: item.value, item } : null;
}

/** What the business is: a category two sources agree on, or the facts agent's confirmed one. */
function findCategory(
  categories: EvidenceItem[],
  facts: readonly BrandFact[],
  s: (i: EvidenceItem, extra?: number) => number,
): FoundCards["category"] {
  const item = best(categories, (i) => s(i, factSupport(facts, CATEGORY_FIELDS, i.value)));
  if (item) return { text: item.value, item };
  const fact = facts.find((f) => CATEGORY_FIELDS.includes(f.field) && factWeight(f) >= CERTAIN_AT);
  return fact ? { text: fact.value, item: null } : null;
}

/** The core that moves the run forward: a certain name and a certain website (the brand's own site). */
export function foundCoreReady(cards: FoundCards): boolean {
  return Boolean(cards.name && cards.website);
}

/**
 * "Looks right": every evidence item behind a shown card, with the answer the full review would take from a
 * person who confirmed it there (the slot's one value = preferred; accounts = ours). Already answered keys are left.
 */
export function foundAnswers(cards: FoundCards, decisions: Record<string, Decision>): { key: string; decision: Decision }[] {
  const out: { key: string; decision: Decision }[] = [];
  const add = (item: EvidenceItem | null | undefined, decision: Decision) => {
    if (item && !decisions[item.key] && !out.some((o) => o.key === item.key)) out.push({ key: item.key, decision });
  };
  add(cards.name, "preferred");
  add(cards.description, "preferred");
  add(cards.website, "preferred");
  if (cards.logo?.item.field === "logo") add(cards.logo.item, "preferred");
  add(cards.location?.item, "preferred");
  add(cards.category?.item, "preferred");
  for (const a of cards.accounts) add(a.item, "yes");
  return out;
}

/** The host a website card shows (no scheme, no www, no trailing slash). */
export function shownHost(item: EvidenceItem): string {
  return websiteHost(item.url ?? item.value);
}

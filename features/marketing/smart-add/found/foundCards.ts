/**
 * The "found first" door (smart-add VISION Part 23): which findings are sure enough to show as a card, and which
 * answers the one "Looks right" gives. Pure (no React, no I/O); the session's own state goes in, nothing is decided here.
 *
 * "Certain" = two independent HOSTS agree. A witness is the host a finding was read from, counted once however it
 * arrived: the brand's own site (every page, the web tier's copy of it, the facts agent citing it) is ONE witness;
 * facebook.com is one; a link-in-bio service is one. The web tier only witnesses a result its fixed rules call
 * `certain`. The facts agent never witnesses by itself: its fact adds the hosts it cites (when it is at least `likely`),
 * so a fact citing only the brand's own site adds nothing the site read did not already say.
 * What the person typed or confirmed is certain at once; Not us removes a card.
 * A website the person typed or confirmed is VOUCHED for (coordinator ruling, 2026-10-16): what that site says about
 * itself — its name, logo, description, address — is certain from that one host (any page of it, or a fact citing it).
 * A website we found ourselves vouches for nothing: its statements still need a second host. Accounts, category, tools
 * and a competitor always need two hosts.
 * A category that repeats a name the site gives itself (its title, og:site_name) is a title, never a category.
 * A logo is a certain logo row, else the lead certain account's photo.
 */

import type { BrandFact } from "../validate/queue";
import { websiteHost, type Decision, type EvidenceItem } from "../evidence";

/** Witness hosts per evidence key (see the file comment), built up from every raw item a round streams. */
export type Witnesses = ReadonlyMap<string, ReadonlySet<string>>;

/** Two independent hosts make a finding certain. */
export const CERTAIN_AT = 2;

/** Stands for the brand's own site when an item carries no page address; resolved to the site's host. */
const OWN_SITE = "own-site";
const TYPED = "typed";

function hostOf(url: string | null | undefined): string | null {
  return url ? websiteHost(url) || null : null;
}

/** One raw evidence item → the host it witnesses from (null: no witness — a guess, the facts agent, the typed address echoed). */
export function witnessOf(item: EvidenceItem): string | null {
  if (item.source.kind === "typed") return TYPED;
  if (item.source.where === "the address itself") return null;
  // The facts agent's rows count through the hosts its facts cite (factHosts), once.
  if (item.source.node === "facts") return null;
  if (item.source.kind === "web_search") return item.certainty === "certain" ? hostOf(item.url ?? item.value) : null;
  if (item.source.kind === "website") return hostOf(item.source.url) ?? OWN_SITE;
  return hostOf(item.source.url);
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

const SURE = new Set(["confirmed", "likely"]);
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** A business name without its legal suffix: "Eudora Brewing Co." and "Eudora Brewing Company, LLC" are one name. */
export const nameKey = (s: string) =>
  norm(s)
    .replace(/^the /, "")
    .replace(/( (co|company|inc|incorporated|llc|ltd|limited|corp|corporation|pllc|lp))+$/, "");

const NAME_FIELDS = ["official_name", "brand_legal_name", "legal_entity_name", "dba_name"];
const CITY_FIELDS = ["headquarters_location", "city"];
const CATEGORY_FIELDS = ["industry", "business_category", "business_type", "category", "specialty"];
const TOOL_FIELDS = ["technology_used", "website_built_by"];
const ADDRESS_FIELDS = ["street_address", "headquarters_location"];

export interface FoundAccount {
  item: EvidenceItem;
  platform: string;
  handle: string | null;
  followers: number | null;
}

/** A card's text and everything behind it that "Looks right" answers: its evidence item and/or facts. */
export interface FoundFact {
  text: string;
  item: EvidenceItem | null;
  facts: BrandFact[];
}

/** What the grid shows. Every part is absent until it is certain. */
export interface FoundCards {
  name: EvidenceItem | null;
  /** The brand's own words about itself (its site, or two hosts agreeing). Shown under the name. */
  description: EvidenceItem | null;
  logo: { url: string; item: EvidenceItem } | null;
  website: EvidenceItem | null;
  location: FoundFact | null;
  /** The main certain accounts, largest audience first (at most four). */
  accounts: FoundAccount[];
  category: FoundFact | null;
  tools: FoundFact | null;
  competitor: FoundFact | null;
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

export function foundCards({ items, witnesses, facts, decisions, typedWebsiteKey }: FoundInput): FoundCards {
  const typedHost = typedWebsiteKey?.startsWith("website:") ? typedWebsiteKey.slice(8) : null;
  const siteHost = (i: EvidenceItem) => websiteHost(i.url ?? i.value);
  // The sites the person vouched for: the one they typed, and every website they confirmed as theirs.
  const vouched = new Set([
    ...(typedHost ? [typedHost] : []),
    ...items.filter((i) => i.field === "website" && isOurs(decisions[i.key])).map(siteHost),
  ]);
  const ownHost = typedHost ?? [...vouched][0] ?? items.find((i) => i.field === "website" && decisions[i.key] !== "no")?.value ?? null;
  const resolve = (h: string) => (h === OWN_SITE ? (ownHost ? websiteHost(ownHost) : OWN_SITE) : h);
  const sure = facts.filter((f) => SURE.has(f.certainty) && decisions[f.key] !== "no");
  /** The hosts the facts agent cites for this value in these fields (each host once; no citation = no witness). */
  const factHosts = (fields: readonly string[], value: string, key: (s: string) => string = norm): { hosts: string[]; facts: BrandFact[] } => {
    const v = key(value);
    const hit = v ? sure.filter((f) => fields.includes(f.field) && key(f.value) === v) : [];
    return { hosts: hit.flatMap((f) => f.evidence_urls.map(hostOf).filter((h): h is string => Boolean(h))), facts: hit };
  };
  const hostsOf = (i: EvidenceItem) => [...(witnesses.get(i.key) ?? [])].map(resolve);
  /** Certain: the person's own word, two hosts, or (for what a site says about itself) a host they vouched for. */
  const certain = (hosts: Iterable<string>, decision?: Decision, selfStatement = false) => {
    const set = new Set(hosts);
    return isOurs(decision) || set.has(TYPED) || set.size >= CERTAIN_AT || (selfStatement && [...set].some((h) => vouched.has(h)));
  };

  const open = items.filter((i) => decisions[i.key] !== "no");
  const of = (field: EvidenceItem["field"]) => open.filter((i) => i.field === field);
  const pick = (candidates: EvidenceItem[], fields: readonly string[] = [], selfStatement = false) =>
    candidates
      .map((i) => ({ i, hosts: new Set([...hostsOf(i), ...factHosts(fields, i.value).hosts]) }))
      .filter((x) => certain(x.hosts, decisions[x.i.key], selfStatement))
      .sort((a, b) => b.hosts.size - a.hosts.size || b.i.confidence - a.i.confidence)[0]?.i ?? null;

  // A name is one name however it is spelled with its legal suffix: every spelling's hosts count for it.
  const names = of("name");
  const name =
    names
      .map((i) => {
        const k = nameKey(i.value);
        const hosts = new Set([...names.filter((n) => nameKey(n.value) === k).flatMap(hostsOf), ...factHosts(NAME_FIELDS, i.value, nameKey).hosts]);
        return { i, hosts };
      })
      .filter((x) => certain(x.hosts, decisions[x.i.key], true))
      .sort((a, b) => b.hosts.size - a.hosts.size || Number(b.i.source.kind === "website") - Number(a.i.source.kind === "website") || b.i.confidence - a.i.confidence)[0]?.i ??
    null;
  // The brand's own words about itself ride under a certain name.
  const description = name ? pick(of("description"), ["short_description", "description"], true) : null;
  const website = of("website").find((i) => i.key === typedWebsiteKey) ?? pick(of("website"), ["website"]);

  const accounts: FoundAccount[] = of("social")
    .filter((i) => i.platform && certain(hostsOf(i), decisions[i.key]))
    .sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1) || b.confidence - a.confidence)
    .filter((i, idx, all) => all.findIndex((x) => x.platform === i.platform) === idx)
    .slice(0, 4)
    .map((i) => ({ item: i, platform: i.platform as string, handle: i.handle, followers: i.followers }));

  const declaredLogo = of("logo")
    .filter((i) => certain(hostsOf(i), decisions[i.key], true))
    .sort((a, b) => b.confidence - a.confidence)[0];
  const logo = declaredLogo
    ? { url: declaredLogo.image_url ?? declaredLogo.value, item: declaredLogo }
    : accounts[0]?.item.image_url
      ? {
          url: accounts[0].item.image_url,
          // The account photo is also a Logo & images row: that row is what "Looks right" answers.
          item: of("logo").find((l) => (l.image_url ?? l.value) === accounts[0].item.image_url) ?? accounts[0].item,
        }
      : null;

  // A name the site gives itself (title, og:site_name, schema name) never doubles as "what you do".
  const titles = new Set(of("name").map((i) => norm(i.value)));
  const notTitle = (text: string) => !titles.has(norm(text));

  return {
    name,
    description,
    logo,
    website,
    location: findLocation(of("address"), sure, hostsOf, factHosts, decisions, (h) => certain(h, undefined, true)),
    accounts,
    category: findCategory(of("category").filter((i) => notTitle(i.value)), sure.filter((f) => notTitle(f.value)), hostsOf, factHosts, decisions),
    tools: factCard(sure, TOOL_FIELDS, factHosts, decisions, 3),
    competitor: factCard(sure, ["competitor"], factHosts, decisions, 1),
  };
}

type HostsOf = (i: EvidenceItem) => string[];
type FactHosts = (fields: readonly string[], value: string) => { hosts: string[]; facts: BrandFact[] };

const confirmedFact = (f: BrandFact, decisions: Record<string, Decision>) => isOurs(decisions[f.key]);

/** "Based in": a city (with its state) or an address that two hosts agree on, or that the vouched site states. */
function findLocation(
  addresses: EvidenceItem[],
  sure: BrandFact[],
  hostsOf: HostsOf,
  factHosts: FactHosts,
  decisions: Record<string, Decision>,
  selfCertain: (hosts: Iterable<string>) => boolean,
): FoundFact | null {
  for (const city of sure.filter((f) => CITY_FIELDS.includes(f.field))) {
    const item = addresses.find((a) => norm(a.value).includes(norm(city.value))) ?? null;
    const own = factHosts(CITY_FIELDS, city.value);
    const hosts = new Set([...own.hosts, ...(item ? hostsOf(item) : [])]);
    if (!selfCertain(hosts) && !confirmedFact(city, decisions) && !(item && isOurs(decisions[item.key]))) continue;
    const state = city.field === "city" ? sure.find((x) => x.field === "state") : undefined;
    const text = state && !norm(city.value).includes(norm(state.value)) ? `${city.value}, ${state.value}` : city.value;
    return { text, item, facts: [...own.facts, ...(state ? [state] : [])] };
  }
  for (const item of addresses) {
    const own = factHosts(ADDRESS_FIELDS, item.value);
    if (selfCertain([...hostsOf(item), ...own.hosts]) || isOurs(decisions[item.key])) return { text: item.value, item, facts: own.facts };
  }
  return null;
}

/** What the business is: a category two hosts agree on (its own row and the facts that cite it). */
function findCategory(
  categories: EvidenceItem[],
  sure: BrandFact[],
  hostsOf: HostsOf,
  factHosts: FactHosts,
  decisions: Record<string, Decision>,
): FoundFact | null {
  for (const item of categories) {
    const own = factHosts(CATEGORY_FIELDS, item.value);
    if (new Set([...hostsOf(item), ...own.hosts]).size >= CERTAIN_AT || isOurs(decisions[item.key]))
      return { text: item.value, item, facts: own.facts };
  }
  return factCard(sure, CATEGORY_FIELDS, factHosts, decisions, 1);
}

/** Facts alone (tools, a competitor, a category with no row): shown when their cited hosts reach two. */
function factCard(sure: BrandFact[], fields: readonly string[], factHosts: FactHosts, decisions: Record<string, Decision>, max: number): FoundFact | null {
  const shown: BrandFact[] = [];
  const values: string[] = [];
  for (const f of sure.filter((x) => fields.includes(x.field))) {
    if (values.some((v) => norm(v) === norm(f.value))) continue;
    const own = factHosts(fields, f.value);
    if (new Set(own.hosts).size < CERTAIN_AT && !confirmedFact(f, decisions)) continue;
    values.push(f.value);
    shown.push(...own.facts);
    if (values.length >= max) break;
  }
  return values.length ? { text: values.join(" · "), item: null, facts: shown } : null;
}

/** The core that moves the run forward: a certain name and a certain website (the brand's own site). */
export function foundCoreReady(cards: FoundCards): boolean {
  return Boolean(cards.name && cards.website);
}

/**
 * "Looks right": an answer for EVERY card shown, through the full review's own decision path. An evidence row gets
 * the answer its slot takes there (the one value = preferred; accounts = ours); a fact behind a card is recorded as
 * the person's Yes under its own key (Create keeps it confirmed; the validation page treats it as answered).
 * Keys already answered are left alone.
 */
export function foundAnswers(cards: FoundCards, decisions: Record<string, Decision>): { key: string; decision: Decision }[] {
  const out: { key: string; decision: Decision }[] = [];
  const add = (key: string | null | undefined, decision: Decision) => {
    if (key && !decisions[key] && !out.some((o) => o.key === key)) out.push({ key, decision });
  };
  const card = (c: FoundFact | null) => {
    if (!c) return;
    add(c.item?.key, "preferred");
    for (const f of c.facts) add(f.key, "yes");
  };
  add(cards.name?.key, "preferred");
  add(cards.description?.key, "preferred");
  add(cards.website?.key, "preferred");
  if (cards.logo?.item.field === "logo") add(cards.logo.item.key, "preferred");
  for (const a of cards.accounts) add(a.item.key, "yes");
  card(cards.location);
  card(cards.category);
  card(cards.tools);
  card(cards.competitor);
  return out;
}

/** The host a website card shows (no scheme, no www, no trailing slash). */
export function shownHost(item: EvidenceItem): string {
  return websiteHost(item.url ?? item.value);
}

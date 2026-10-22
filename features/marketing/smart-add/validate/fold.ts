/**
 * Smart Add validation — one real thing, one card (pure; no I/O).
 *
 * One card asks about ONE thing (Arman, 2026-10-22: "It needs to be one by one."). Folding is only for copies of
 * the SAME thing: a phone written "(866) 941-8214" and "+1-866-941-8214", an address with and without its city, the
 * facts agent's `social_facebook` beside the Facebook account itself, nine Yelp location pages, eight copies of the
 * bio, one picture found at two addresses. Two different logos, two different services, two different streets are
 * two cards — never a batch answered at once. This module:
 *
 *   1. drops what the brand already knows (its name and aliases, its own website and pages on it, its
 *      accounts, its confirmed facts) — the person is never asked twice;
 *   2. fixes classifications the finders got wrong (a post address is not an account; a LinkedIn /in/
 *      profile is a key person);
 *   3. folds every finding that is the same real thing into ONE card (`twins` = the folded keys, answered
 *      together; `folded` = the copies, shown in the grounding hover);
 *   4. orders the stage: accounts and websites, names, what you do, offerings, audience, locations, people,
 *      contact, the web, logos, everything else — the "Ask me later" pile last.
 *
 * Spec: common-docs/systems/marketing/websites-and-brands/projects/smart-add-brand/SPEC.md § Validation page
 */

import { domainAddress, domainHost } from "@/lib/web-domains/registry";
import { looksLikePostUrl, postOwnerFromUrl } from "@/features/marketing/social/link";
import type { FocusItem } from "./queue";

// ── What the brand already knows ─────────────────────────────────────────────────────

export interface KnownOnBrand {
  /** The brand's name, aliases and confirmed names. */
  names: string[];
  /** Hosts the brand owns (its website and sites). */
  hosts: string[];
  /** Every confirmed address (accounts, sites, link pages). */
  urls: string[];
  /** Confirmed facts' values (phones, emails, addresses, categories…). */
  values: string[];
  /** Accounts the brand owns as `<platform>:<handle>` (a property row with a handle but no address still counts). */
  accounts?: string[];
  /** Pictures already answered or saved as the brand's logos: a logo candidate showing one of them is not asked again (MKT-139). */
  images?: string[];
  /** The person already settled what the brand does (an About line confirmed at Create): no About card is asked again (MKT-175). */
  about?: boolean;
}

export const EMPTY_KNOWN: KnownOnBrand = { names: [], hosts: [], urls: [], values: [] };

// ── Identity ─────────────────────────────────────────────────────────────────────────

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9@]+/g, " ")
    .trim();

const SOCIAL_HOSTS: Record<string, string> = {
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "instagram.com": "instagram",
  "x.com": "x",
  "twitter.com": "x",
  "tiktok.com": "tiktok",
  "youtube.com": "youtube",
  "linkedin.com": "linkedin",
  "pinterest.com": "pinterest",
  "threads.net": "threads",
  "threads.com": "threads",
};

/** True for any page on a social platform (a profile, a post, a group): it is an account question, never a listing. */
export function isSocialPlatformPage(url: string): boolean {
  return Boolean(SOCIAL_HOSTS[domainHost(url)]);
}

/** Path heads that name a post, a reel, a status — never an account. */
const POST_HEADS = new Set(["p", "reel", "reels", "tv", "posts", "status", "video", "watch", "shorts", "events", "photo", "photos", "story", "stories", "hashtag", "explore", "share", "groups", "pulse"]);

/** A social profile address → `acct:<platform>:<handle>`; a post address → null (and `isPost`). */
export function socialIdentity(url: string): { key: string | null; post: boolean; person: boolean } {
  const addr = domainAddress(url);
  const host = domainHost(url);
  const platform = SOCIAL_HOSTS[host];
  if (!platform) return { key: null, post: false, person: false };
  const parts = addr.split("/").slice(1).filter(Boolean);
  if (!parts.length) return { key: null, post: false, person: false };
  // THE post rule (features/marketing/social/link.ts, shared case table with matrx-social): a story.php, photo.php,
  // permalink, reel, status, share or event link is never an account, whatever its first path segment looks like.
  if (looksLikePostUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`)) return { key: null, post: true, person: false };
  let head = parts[0];
  // `facebook.com/p/<Page-Name>-<numeric id>` is a real page address; the numeric id is the account.
  if (platform === "facebook" && head === "p") {
    const id = /-(\d{8,})$/.exec(parts[1] ?? "")?.[1];
    return id ? { key: `acct:facebook:${id}`, post: false, person: false } : { key: null, post: true, person: false };
  }
  if (platform === "linkedin") {
    if (parts[0] === "posts" || parts[0] === "feed" || parts[0] === "pulse") return { key: null, post: true, person: false };
    if ((parts[0] === "company" || parts[0] === "in" || parts[0] === "school" || parts[0] === "showcase") && parts[1]) {
      return { key: `acct:linkedin:${parts[0]}/${parts[1]}`, post: false, person: parts[0] === "in" };
    }
    return { key: null, post: false, person: false };
  }
  if (platform === "youtube" && (head === "channel" || head === "c" || head === "user") && parts[1]) head = parts[1];
  if (POST_HEADS.has(head) || (parts.length > 1 && POST_HEADS.has(parts[1]))) return { key: null, post: true, person: false };
  if (platform === "facebook" && head === "profile.php") return { key: null, post: false, person: false };
  return { key: `acct:${platform}:${head.replace(/^@/, "")}`, post: false, person: false };
}

/** A post address → the account it sits under (`acct:facebook:ritualcoffee`), so a page of our own account folds into
 *  that account's card and is never asked again as a second "web" card (MKT-045). Null for a profile or a non-post. */
export function accountOfPost(url: string): string | null {
  const social = socialIdentity(url);
  if (!social.post) return null;
  const platform = SOCIAL_HOSTS[domainHost(url)];
  if (!platform || platform === "linkedin") return null;
  // The owner comes from the shared post rule, so `story.php?id=<numeric>` and `<page>/posts/…` both name their account.
  const owner = postOwnerFromUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  return owner ? `acct:${platform}:${owner.handle.toLowerCase()}` : null;
}

const PHONE_FIELDS = new Set(["phone", "toll_free_phone", "sms_number", "fax"]);
const ADDRESS_FIELDS = new Set(["address", "street_address", "additional_location", "headquarters_location"]);
const NAME_FIELDS = new Set(["official_name", "legal_entity_name", "dba_name", "former_name", "also_known_as", "brand_name"]);
const CATEGORY_FIELDS = new Set(["category", "business_category", "industry", "business_type"]);
const ABOUT_FIELDS = new Set(["description", "short_description", "long_description"]);

const STREET_WORDS: Record<string, string> = {
  street: "st", drive: "dr", avenue: "ave", boulevard: "blvd", road: "rd", highway: "hwy", lane: "ln", court: "ct",
  place: "pl", parkway: "pkwy", suite: "ste", north: "n", south: "s", east: "e", west: "w",
};

/** "300 East Esplanade Dr., Suite 101, Oxnard" → "300 e esplanade dr" (the street line: number + street). */
export function streetKey(value: string): string | null {
  const first = value.split(",")[0] ?? "";
  const words = norm(first)
    .split(" ")
    .map((w) => STREET_WORDS[w] ?? w)
    .filter((w) => w && w !== "ste");
  if (!words.length || !/^\d/.test(words[0])) return null;
  // A suite on the street line ("7553 Auburn Blvd Ste 1/2") is not part of the street.
  const cut = words.findIndex((w, i) => i > 1 && /^\d/.test(w));
  return (cut > 0 ? words.slice(0, cut) : words).join(" ");
}

function field(item: FocusItem): string {
  return item.fact?.field ?? item.evidence?.field ?? item.kind;
}

function urlOf(item: FocusItem): string | null {
  const v = item.fact ? item.value : (item.evidence?.url ?? item.openUrl ?? (/^https?:\/\//i.test(item.value) ? item.value : null));
  return v && /^https?:\/\//i.test(v.trim()) ? v.trim() : null;
}

/** The picture a logo finding shows (its own image address, else the value when that is an address). */
export function logoImageOf(item: FocusItem): string | null {
  const v = (item.imageUrl ?? item.evidence?.image_url ?? item.value ?? "").trim();
  return /^https?:\/\//i.test(v) ? v : null;
}

/** The tray's label for an answered logo card: one card is one picture, however many addresses it was found at. */
export function logoLabel(_item: FocusItem): string {
  return "Logo";
}

/** Every address of the one picture an answered logo card settled: its own and each folded copy's. */
export function logoImagesOf(item: FocusItem): string[] {
  return [item, ...(item.folded ?? [])].map(logoImageOf).filter((u): u is string => Boolean(u));
}

/**
 * Every identity a finding has; two findings sharing one are the same real thing. Never a key for a whole kind (all
 * logos, all services): a shared kind is not a shared thing. "about" is the one exception by design — every About
 * line is a copy of the one answer to "what do you do" (MKT-044).
 * `samePicture`: evidence key → the server's near-identical-image group (logoGroups.tsx), so one mark found at two
 * image addresses is one card.
 */
export function identities(item: FocusItem, samePicture?: ReadonlyMap<string, string>): string[] {
  const f = field(item);
  const keys: string[] = [];
  const url = urlOf(item);
  if (url) {
    keys.push(`url:${domainAddress(url)}`);
    const social = socialIdentity(url);
    if (social.key) keys.push(social.key);
    const post = accountOfPost(url);
    if (post) keys.push(post);
  }
  if (item.kind === "account" && item.platform && item.evidence?.handle && !socialIdentity(item.evidence.url ?? "").post) {
    keys.push(`acct:${item.platform === "twitter" ? "x" : item.platform}:${item.evidence.handle.toLowerCase().replace(/^@/, "")}`);
  }
  // Web results about the brand on one site (nine Yelp location pages, three news pieces on one outlet): one card.
  if (item.kind === "web" && url && !socialIdentity(url).key) keys.push(`host:${domainHost(url)}`);
  if (PHONE_FIELDS.has(f)) {
    const digits = item.value.replace(/\D/g, "").slice(-10);
    if (digits.length >= 7) keys.push(`tel:${digits}`);
  }
  if (f === "email") keys.push(`mail:${item.value.trim().toLowerCase()}`);
  if (ADDRESS_FIELDS.has(f)) {
    const street = streetKey(item.value);
    keys.push(street ? `addr:${street}` : `place:${norm(item.value)}`);
  }
  if (item.kind === "name" || NAME_FIELDS.has(f)) keys.push(`name:${norm(item.value)}`);
  if (CATEGORY_FIELDS.has(f)) keys.push(`cat:${norm(item.value)}`);
  if (ABOUT_FIELDS.has(f)) keys.push("about");
  if (f === "logo") {
    const image = logoImageOf(item);
    if (image) keys.push(`img:${domainAddress(image)}`);
    const group = samePicture?.get(item.key);
    if (group) keys.push(`pic:${group}`);
  }
  if (f === "service_area") keys.push(`area:${norm(item.value)}`);
  if (item.fact) keys.push(`fact:${f}:${norm(item.value)}`);
  return keys;
}

function knownKeys(known: KnownOnBrand): Set<string> {
  const keys = new Set<string>();
  for (const n of known.names) if (n.trim()) keys.add(`name:${norm(n)}`);
  for (const u of known.urls) {
    if (!u) continue;
    const full = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    keys.add(`url:${domainAddress(full)}`);
    const s = socialIdentity(full).key;
    if (s) keys.add(s);
  }
  for (const a of known.accounts ?? []) {
    const [platform, ...rest] = a.toLowerCase().split(":");
    const handle = rest.join(":").replace(/^@/, "");
    if (platform && handle) keys.add(`acct:${platform === "twitter" ? "x" : platform}:${handle}`);
  }
  for (const img of known.images ?? []) if (/^https?:\/\//i.test(img)) keys.add(`img:${domainAddress(img)}`);
  if (known.about) keys.add("about");
  for (const v of known.values) {
    if (!v.trim()) continue;
    const digits = v.replace(/\D/g, "").slice(-10);
    if (/^[\d\s().+-]{7,}$/.test(v.trim()) && digits.length >= 7) keys.add(`tel:${digits}`);
    if (v.includes("@")) keys.add(`mail:${v.trim().toLowerCase()}`);
    const street = streetKey(v);
    if (street) keys.add(`addr:${street}`);
    keys.add(`cat:${norm(v)}`);
    keys.add(`area:${norm(v)}`);
  }
  return keys;
}

// ── Classification fixes ─────────────────────────────────────────────────────────────

/** A post address found as an account is a post (a web result); a LinkedIn /in/ profile is a key person. */
export function reclassify(item: FocusItem): FocusItem {
  if (item.kind !== "account") return item;
  const url = item.evidence?.url ?? item.openUrl ?? item.value;
  const social = socialIdentity(url);
  if (social.post) return { ...item, kind: "web", label: "Post", value: url, title: item.title };
  if (social.person) return { ...item, label: "Key person" };
  return item;
}

// ── Sections (the stage order) and sets ──────────────────────────────────────────────

export type Section =
  | "accounts"
  | "names"
  | "what_you_do"
  | "offerings"
  | "audience"
  | "locations"
  | "people"
  | "contact"
  | "web"
  | "logos"
  | "more";

export const SECTION_LABEL: Record<Section, string> = {
  accounts: "Accounts",
  names: "Name",
  what_you_do: "What you do",
  offerings: "Offerings",
  audience: "Audience",
  locations: "Locations",
  people: "Key people",
  contact: "Contact",
  web: "On the web",
  logos: "Logos",
  more: "More",
};

const SECTION_FIELDS: [Section, readonly string[]][] = [
  ["names", ["name", "official_name", "legal_entity_name", "dba_name", "former_name", "also_known_as", "brand_name"]],
  ["what_you_do", ["description", "short_description", "long_description", "tagline", "brand_statement", "mission", "category", "business_category", "industry", "business_type", "specialty", "expertise"]],
  ["offerings", ["primary_products_services", "product", "service", "products", "services", "pricing"]],
  ["audience", ["target_market", "audience", "target_audience", "customer_type"]],
  ["locations", ["address", "street_address", "additional_location", "headquarters_location", "service_area", "city", "state", "country", "region"]],
  ["people", ["founder", "ceo", "president", "owner", "partner", "key_executive", "employee", "staff_contact"]],
  ["contact", ["phone", "toll_free_phone", "sms_number", "fax", "email", "contact_form_url", "booking_url", "business_hours", "live_chat"]],
  ["logos", ["logo"]],
];
const SECTION_OF = new Map(SECTION_FIELDS.flatMap(([s, fields]) => fields.map((f) => [f, s] as const)));
const SECTION_ORDER: Section[] = ["accounts", "names", "logos", "what_you_do", "offerings", "audience", "locations", "people", "contact", "web", "more"];

export function sectionOf(item: FocusItem): Section {
  if (item.kind === "account" || item.kind === "website") return item.label === "Key person" ? "people" : "accounts";
  if (item.kind === "logo") return "logos";
  if (item.kind === "web") return "web";
  const f = field(item);
  if (f.endsWith("_page") || f.startsWith("social_") || f === "website" || f === "additional_website") return "web";
  return SECTION_OF.get(f) ?? "more";
}

// ── People: one person, however the sources spell them ──────────────────────────────

const PEOPLE_FIELDS = new Set(["founder", "ceo", "president", "owner", "partner", "key_executive", "employee", "staff_contact"]);

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

/** Two spellings of one person: same first name, surnames one or two letters apart ("Akhoin" / "Akhoian"). */
export function sameSpokenName(a: string, b: string): boolean {
  const x = norm(a).split(" ");
  const y = norm(b).split(" ");
  if (x.length < 2 || y.length < 2 || x[0] !== y[0]) return false;
  const sx = x[x.length - 1];
  const sy = y[y.length - 1];
  return sx !== sy && Math.min(sx.length, sy.length) >= 4 && editDistance(sx, sy) <= 2;
}

/** Every other spelling of `name` written in the findings' own text (titles, snippets, values). */
function spellingsIn(name: string, texts: string[]): string[] {
  const first = name.trim().split(/\s+/)[0];
  if (!first) return [];
  const re = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+[A-Z][\\p{L}'-]+`, "gu");
  const found = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(re)) if (sameSpokenName(name, m[0])) found.add(m[0]);
  return [...found];
}

// ── The fold ─────────────────────────────────────────────────────────────────────────

/** How strongly a finding should lead its fold: an account over a fact about it, the agent's fact over a raw copy. */
function leadScore(item: FocusItem): number {
  const kindScore = { account: 0, website: 1, name: 2, logo: 2, fact: 3, web: 4 }[item.kind];
  return kindScore * 10 + (item.fact ? 0 : 1);
}

const looksLikeId = (v: string) => /^@?(UC[\w-]{20,}|\d{6,})$/.test(v.trim());

function better(a: FocusItem, b: FocusItem): FocusItem {
  const s = leadScore(a) - leadScore(b);
  if (s !== 0) return s < 0 ? a : b;
  // Two addresses of one account: the readable handle leads, never a channel or numeric id.
  if (a.kind === "account") return looksLikeId(a.value) && !looksLikeId(b.value) ? b : a;
  // Same kind: the fuller value (an address with its city) leads.
  return b.value.length > a.value.length ? b : a;
}

export interface FoldInput {
  queue: FocusItem[];
  known: KnownOnBrand;
  /** Keys sent to "Ask me later": their cards stay at the back. */
  later: readonly string[];
  /**
   * Keys of answers taken back on this page: Undo puts the card back in focus even when `known` still names what the
   * answer itself wrote (`known` is read once on load, so an earlier answer's site / account is in it). Without this,
   * an undone earlier "Ours" never came back (2026-10-22, pxdocs.com on brand e641a6d5).
   */
  reopened?: ReadonlySet<string>;
  /**
   * Keys of the brand's OWN accounts / websites no person confirmed yet (unconfirmed.ts): asked although the brand
   * "knows" them, because knowing is not confirming. Without this there was no place to confirm them (2026-10-22,
   * 70 of 71 Smart Add brands).
   */
  unconfirmed?: ReadonlySet<string>;
  /** Evidence key → near-identical-image group from the server (logoGroups.tsx `postImageGroups`): one mark, one card. */
  samePicture?: ReadonlyMap<string, string>;
}

/** The stage's queue: known findings dropped, one card per real thing, stage order. */
export function foldQueue({ queue, known, later, reopened, unconfirmed, samePicture }: FoldInput): FocusItem[] {
  const knownSet = knownKeys(known);
  const ownHosts = new Set(known.hosts.map((h) => domainHost(/^https?:\/\//i.test(h) ? h : `https://${h}`)).filter(Boolean));
  const items = queue.map(reclassify).filter((item) => {
    if (reopened && [item.key, ...item.twins].some((k) => reopened.has(k))) return true;
    if (unconfirmed?.has(item.key)) return true;
    const ids = identities(item);
    if (ids.some((k) => knownSet.has(k))) return false;
    // A page on the brand's own website (its blog, its booking page) is the website, already known.
    const url = urlOf(item);
    if (url && item.kind !== "account" && item.kind !== "logo" && ownHosts.has(domainHost(url))) return false;
    return true;
  });

  // An account with no picture of its own borrows the profile picture found on that same profile.
  const pictureOf = new Map<string, string>();
  for (const q of queue) {
    if (q.evidence?.field !== "logo" || !q.evidence.source.url) continue;
    const k = socialIdentity(q.evidence.source.url).key;
    if (k && !pictureOf.has(k)) pictureOf.set(k, q.imageUrl ?? q.value);
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== "account" || item.imageUrl || item.profileId) continue;
    const pic = identities(item).map((k) => pictureOf.get(k)).find(Boolean);
    if (pic) items[i] = { ...item, imageUrl: pic };
  }

  // Union-find over shared identities.
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<string, number>();
  items.forEach((item, i) => {
    for (const k of identities(item, samePicture)) {
      const j = owner.get(k);
      if (j === undefined) owner.set(k, i);
      else parent[find(i)] = find(j);
    }
  });
  // One person found under two spellings is one card (each row keeps its own spelling in the data).
  items.forEach((x, i) => {
    if (!PEOPLE_FIELDS.has(field(x))) return;
    items.forEach((y, j) => {
      if (j > i && PEOPLE_FIELDS.has(field(y)) && sameSpokenName(x.value, y.value)) parent[find(j)] = find(i);
    });
  });
  const groups = new Map<number, FocusItem[]>();
  items.forEach((item, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), item]));

  const folded: FocusItem[] = [];
  for (const group of groups.values()) {
    const lead = group.reduce(better);
    const rest = group.filter((g) => g !== lead);
    const twins = [...new Set([...lead.twins, ...rest.flatMap((r) => [r.key, ...r.twins])])];
    const one: FocusItem = rest.length ? { ...lead, twins, folded: rest } : lead;
    // A host fold of web results reads as the site, with how many pages it has.
    const pages = group.filter((g) => g.kind === "web" || (g.fact && /^https?:\/\//i.test(g.value))).length;
    const withPages = pages > 1 && !one.title && one.kind !== "account" ? { ...one, title: `${pages} pages` } : one;
    if (PEOPLE_FIELDS.has(field(lead))) {
      const texts = queue.flatMap((q) => [q.title ?? "", q.detail ?? "", q.value]);
      const spellings = [...new Set([...group.map((g) => g.value), ...spellingsIn(lead.value, texts)])];
      folded.push(spellings.length > 1 ? { ...withPages, spellings } : withPages);
    } else folded.push(withPages);
  }

  const laterAt = new Map(later.map((k, i) => [k, i]));
  const laterOf = (item: FocusItem) => {
    const keys = [item.key, ...item.twins];
    const hits = keys.map((k) => laterAt.get(k)).filter((n): n is number => n !== undefined);
    return hits.length ? Math.min(...hits) : -1;
  };
  const position = new Map(queue.map((q, i) => [q.key, i]));
  return folded
    .map((item) => ({ item, later: laterOf(item), section: SECTION_ORDER.indexOf(sectionOf(item)), at: position.get(item.key) ?? 0 }))
    .sort((a, b) => {
      // The missing core (gap cards, queue.ts coreGaps) leads whatever its section (MKT-143).
      const gap = Number(b.item.key.startsWith("gap:")) - Number(a.item.key.startsWith("gap:"));
      if (gap) return gap;
      if ((a.later >= 0) !== (b.later >= 0)) return a.later >= 0 ? 1 : -1;
      if (a.later >= 0) return a.later - b.later;
      return a.section - b.section || a.at - b.at;
    })
    .map((x) => x.item);
}

/** Every key a card answers: itself and its folded copies (copies of the same one thing). */
export function answeredKeysOf(item: FocusItem): string[] {
  return [item.key, ...item.twins];
}

/**
 * Smart Add Brand — the evidence model (pure; no I/O).
 *
 * The cascade's findings arrive as EVIDENCE ITEMS from the
 * `smart_add_brand_identify` system workflow (aidream
 * `aidream/graph_actions/brand_identify.py`). The person answers each one
 * "This is us" / "Not us". Confirmed items seed the next round (a confirmed
 * website gets read, a confirmed account gets looked up); rejected items stop
 * their branch, and every decided key rides `exclude_keys` so a round only
 * brings what is new.
 *
 * Spec: common-docs/systems/marketing/websites-and-brands/projects/smart-add-brand/SPEC.md
 */

import { handleKeyPart } from "../social/account-input";

export type EvidenceField =
  | "name"
  | "tagline"
  | "expertise"
  | "logo"
  | "website"
  | "social"
  | "description"
  | "category"
  | "phone"
  | "email"
  | "address"
  // The web tier: a review/listing page about the brand, and a news/video/image result about it.
  | "listing"
  | "mention"
  // Any other top web result: the person says what it is to the brand (web.brand_relation_kind).
  | "web_page"
  // A link the brand shows on its link-in-bio page that is neither an account nor its website.
  | "bio_link";

/** How sure the web tier is that a candidate is the brand (fixed rules on the server, no AI). */
export type Certainty = "certain" | "likely" | "possible";

export interface EvidenceSource {
  node: string;
  kind: "website" | "social_profile" | "link_in_bio" | "typed" | "web_search";
  url: string | null;
  where: string | null;
}

export interface EvidenceItem {
  key: string;
  field: EvidenceField;
  value: string;
  label: string | null;
  image_url: string | null;
  url: string | null;
  platform: string | null;
  handle: string | null;
  followers: number | null;
  verified: boolean | null;
  /** The stored social profile (its avatar door), when the item came from a lookup. */
  profile_id: string | null;
  /** Account rows: keys of the bare links this looked-up account IS (`/channel/UC…`, a numeric `/company/<id>`). */
  same_as?: string[];
  source: EvidenceSource;
  confidence: number;
  /** Web-found items only: how sure, and why (aidream brand_identify_web.web_certainty). */
  certainty?: Certainty | null;
  certainty_reasons?: string[];
  /** Web-found items: the engines that found it (admin/Builder data — never shown to customers). */
  engines?: string[];
  /** Web-found items: the result's description as served. */
  snippet?: string | null;
  /** Web-found items: every engine/query/rank that found it, best rank first. */
  hits?: WebHit[];
}

/** One place a web result was found. */
export interface WebHit {
  engine: string;
  rank: number;
  query: string;
  endpoint: string;
}

/**
 * The person's answer for one finding. `preferred` = THE value of its slot (one brand name, one
 * logo, one primary website/phone…); `yes` = ours as well; `alias` = another name we go by
 * (names only); `no` = not us.
 */
export type Decision = "preferred" | "yes" | "alias" | "no";

/** Ours, in any role. */
export function isOurs(decision: Decision | undefined): boolean {
  return decision === "preferred" || decision === "yes" || decision === "alias";
}

export interface SocialSeed {
  handle_or_url: string;
  platform?: string;
}

export interface RoundSeeds {
  website: string;
  socials: SocialSeed[];
}

/** One field answers once per brand (name, logo, website); the rest can hold several. */
export const SINGLE_VALUE_FIELDS: ReadonlySet<EvidenceField> = new Set(["name", "tagline", "website", "description", "category"]);

/** Display order of the results area. */
export const FIELD_ORDER: EvidenceField[] = [
  "name",
  "tagline",
  "expertise",
  "logo",
  "website",
  "social",
  "description",
  "category",
  "phone",
  "email",
  "address",
];

export const FIELD_LABEL: Record<EvidenceField, string> = {
  name: "Name",
  tagline: "Tagline",
  expertise: "Expertise",
  logo: "Logo",
  website: "Website",
  social: "Account",
  description: "About",
  category: "Category",
  phone: "Phone",
  email: "Email",
  address: "Address",
  listing: "On the web",
  mention: "On the web",
  web_page: "On the web",
  bio_link: "Also linked from their bio",
};

/** Fields that live only in the "On the web" row, never in the form's slots. */
export const WEB_FIELDS: ReadonlySet<EvidenceField> = new Set(["listing", "mention", "web_page"]);

/** Fields shown in their own compact groups, never in the form's slots. */
export const GROUP_FIELDS: ReadonlySet<EvidenceField> = new Set(["bio_link"]);

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseHit(raw: unknown): WebHit | null {
  if (typeof raw !== "object" || raw === null) return null;
  const h = raw as Record<string, unknown>;
  if (typeof h.rank !== "number") return null;
  return { engine: asString(h.engine) ?? "", rank: h.rank, query: asString(h.query) ?? "", endpoint: asString(h.endpoint) ?? "web" };
}

/** Read one evidence item from an untyped workflow payload; null when it is not one. */
export function parseEvidenceItem(raw: unknown): EvidenceItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const key = asString(r.key);
  const field = asString(r.field) as EvidenceField | null;
  const value = asString(r.value);
  if (!key || !field || !value || !(FIELD_ORDER.includes(field) || WEB_FIELDS.has(field) || GROUP_FIELDS.has(field))) return null;
  const src = (typeof r.source === "object" && r.source !== null ? r.source : {}) as Record<string, unknown>;
  return {
    key,
    field,
    value,
    label: asString(r.label),
    image_url: asString(r.image_url),
    url: asString(r.url),
    platform: asString(r.platform),
    handle: asString(r.handle),
    followers: typeof r.followers === "number" ? r.followers : null,
    verified: typeof r.verified === "boolean" ? r.verified : null,
    profile_id: asString(r.profile_id),
    same_as: Array.isArray(r.same_as) ? r.same_as.filter((x): x is string => typeof x === "string") : [],
    source: {
      node: asString(src.node) ?? "",
      kind: (asString(src.kind) as EvidenceSource["kind"]) ?? "website",
      url: asString(src.url),
      where: asString(src.where),
    },
    confidence: typeof r.confidence === "number" ? r.confidence : 0,
    certainty: r.certainty === "certain" || r.certainty === "likely" || r.certainty === "possible" ? r.certainty : null,
    certainty_reasons: Array.isArray(r.certainty_reasons)
      ? r.certainty_reasons.filter((x): x is string => typeof x === "string")
      : [],
    engines: Array.isArray(r.engines) ? r.engines.filter((x): x is string => typeof x === "string") : [],
    snippet: asString(r.snippet),
    hits: Array.isArray(r.hits) ? r.hits.map(parseHit).filter((h): h is WebHit => h !== null) : [],
  };
}

/** Every evidence item inside a payload: `{brand_evidence: [...]}` (an emission) or `{evidence: [...]}` (a node output). */
export function evidenceFromPayload(payload: unknown): EvidenceItem[] {
  if (typeof payload !== "object" || payload === null) return [];
  const p = payload as Record<string, unknown>;
  const list = Array.isArray(p.brand_evidence) ? p.brand_evidence : Array.isArray(p.evidence) ? p.evidence : [];
  return list.map(parseEvidenceItem).filter((item): item is EvidenceItem => item !== null);
}

/** Add items to a keyed map; a repeated key keeps the higher confidence. Returns a new map only when something changed. */
export function mergeEvidence(current: Map<string, EvidenceItem>, incoming: EvidenceItem[]): Map<string, EvidenceItem> {
  let next: Map<string, EvidenceItem> | null = null;
  for (const item of incoming) {
    const existing = (next ?? current).get(item.key);
    if (existing && existing.confidence >= item.confidence) continue;
    next ??= new Map(current);
    next.set(item.key, item);
  }
  return next ?? current;
}

/** Items in display order: field order, then confidence, high first. */
export function orderedEvidence(items: Iterable<EvidenceItem>): EvidenceItem[] {
  return [...items].sort((a, b) => {
    const f = FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field);
    return f !== 0 ? f : b.confidence - a.confidence;
  });
}

/** Normalize a website address for comparison ("https://www.x.com/" → "x.com"). */
export function websiteHost(url: string): string {
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * The seeds the NEXT round should explore: confirmed websites and accounts not
 * explored yet. `explored` holds the seeds already sent (website hosts, account keys).
 */
export function nextRoundSeeds(
  items: Map<string, EvidenceItem>,
  decisions: Record<string, Decision>,
  explored: ReadonlySet<string>,
): RoundSeeds {
  let website = "";
  const socials: SocialSeed[] = [];
  for (const item of items.values()) {
    const d = decisions[item.key];
    if (d !== "yes" && d !== "preferred") continue;
    if (item.field === "website" && !website) {
      const host = websiteHost(item.value);
      if (!explored.has(`website:${host}`)) website = item.url ?? item.value;
    } else if (item.field === "social" && item.source.kind !== "social_profile" && !explored.has(item.key)) {
      // An account found on a page is only a link: looking it up brings its own profile.
      socials.push({ handle_or_url: item.url ?? item.value, ...(item.platform ? { platform: item.platform } : {}) });
    }
  }
  return { website, socials };
}

/** The explored-set keys a round's seeds account for. */
export function seedKeys(seeds: RoundSeeds, accountKey: (seed: SocialSeed) => string | null): string[] {
  const keys: string[] = [];
  if (seeds.website) keys.push(`website:${websiteHost(seeds.website)}`);
  for (const s of seeds.socials) {
    const k = accountKey(s);
    if (k) keys.push(k);
  }
  return keys;
}

export interface LibraryImage {
  url: string;
  kind: "logo" | "headshot" | "favicon" | "og_image" | "image";
  primary: boolean;
  source: string | null;
}

export interface BrandBasics {
  name: string | null;
  tagline: string | null;
  expertise: string[];
  /** Every image kept (selected), the primary one flagged — it all lands in the asset library. */
  images: LibraryImage[];
  aliases: string[];
  logoUrl: string | null;
  websiteUrl: string | null;
  otherWebsites: string[];
  description: string | null;
  category: string | null;
  accounts: EvidenceItem[];
  /** Confirmed phone / email / address; the slot's primary one first. */
  facts: EvidenceItem[];
}

/** The confirmed basics a brand is created from: per slot the PREFERRED value, else the best confirmed one. */
export function confirmedBasics(
  items: Map<string, EvidenceItem>,
  decisions: Record<string, Decision>,
  person = false,
): BrandBasics {
  const ordered = orderedEvidence(items.values());
  const ours = ordered.filter((i) => decisions[i.key] === "preferred" || decisions[i.key] === "yes");
  const pick = (field: EvidenceField) =>
    ordered.find((i) => i.field === field && decisions[i.key] === "preferred") ??
    ours.find((i) => i.field === field) ??
    null;
  // An account confirmed both as a page link and as a looked-up profile is one account.
  const accounts = new Map<string, EvidenceItem>();
  for (const item of ours.filter((i) => i.field === "social")) {
    const existing = accounts.get(item.key);
    if (!existing || item.source.kind === "social_profile") accounts.set(item.key, item);
  }
  const website = pick("website");
  const facts = ours
    .filter((i) => i.field === "phone" || i.field === "email" || i.field === "address")
    .sort((a, b) => Number(decisions[b.key] === "preferred") - Number(decisions[a.key] === "preferred"));
  const imageKind = (i: EvidenceItem): LibraryImage["kind"] => {
    const where = (i.source.where ?? "").toLowerCase();
    if (where.includes("icon")) return "favicon";
    if (where.includes("share") || where.includes("og:image")) return "og_image";
    if (where.includes("photo") || where.includes("header image")) return "image";
    return "logo";
  };
  const primaryLogo = pick("logo");
  return {
    name: pick("name")?.value ?? null,
    tagline: pick("tagline")?.value ?? null,
    expertise: ours.filter((i) => i.field === "expertise").map((i) => i.value),
    images: ordered
      .filter((i) => i.field === "logo" && (decisions[i.key] === "preferred" || decisions[i.key] === "yes"))
      .map((i) => ({
        url: i.image_url ?? i.value,
        // A person's main picture is their headshot, never a "logo".
        kind: i === primaryLogo ? (person ? "headshot" : "logo") : imageKind(i),
        primary: i === primaryLogo,
        source: i.source.where,
      })),
    aliases: ordered.filter((i) => i.field === "name" && decisions[i.key] === "alias").map((i) => i.value),
    logoUrl: pick("logo")?.image_url ?? pick("logo")?.value ?? null,
    websiteUrl: website?.value ?? null,
    otherWebsites: ours.filter((i) => i.field === "website" && i !== website).map((i) => i.value),
    description: pick("description")?.value ?? null,
    category: pick("category")?.value ?? null,
    accounts: [...accounts.values()],
    facts,
  };
}

/**
 * Apply one answer with the slot's rules: a slot has at most ONE preferred value (a new one demotes
 * the old to `yes` — for images: the primary among many kept); answering again clears it.
 */
export function applyDecision(
  decisions: Record<string, Decision>,
  items: Map<string, EvidenceItem>,
  key: string,
  decision: Decision,
): Record<string, Decision> {
  const item = items.get(key);
  if (decisions[key] === decision) {
    const { [key]: _drop, ...rest } = decisions;
    return rest;
  }
  const next: Record<string, Decision> = { ...decisions, [key]: decision };
  if (item && decision === "preferred") {
    for (const other of items.values()) {
      if (other.key === key || other.field !== item.field) continue;
      if (next[other.key] === "preferred") next[other.key] = "yes";
    }
  }
  return next;
}

/** True when a confirmed single-value field makes this item moot (another value already said "this is us"). */
export function isSettledByAnother(item: EvidenceItem, items: Map<string, EvidenceItem>, decisions: Record<string, Decision>): boolean {
  if (!SINGLE_VALUE_FIELDS.has(item.field) || decisions[item.key]) return false;
  for (const other of items.values()) {
    if (other.key !== item.key && other.field === item.field && decisions[other.key] === "preferred") return true;
  }
  return false;
}

/** A value the person typed into a slot ("Custom"): their own word, confirmed at once. */
export function customItem(
  field: EvidenceField,
  value: string,
  extra: Partial<Pick<EvidenceItem, "platform" | "handle" | "url" | "label">> = {},
): EvidenceItem {
  const v = value.trim();
  const keyValue =
    field === "website"
      ? websiteHost(v)
      : field === "phone"
        ? v.replace(/\D/g, "").slice(-10)
        : v.toLowerCase();
  return {
    key: field === "social" && extra.platform && extra.handle ? `social:${extra.platform}:${handleKeyPart(extra.handle)}` : `${field}:${keyValue}`,
    field,
    value: field === "website" && !/^https?:\/\//i.test(v) ? `https://${v}` : v,
    label: extra.label ?? (field === "website" ? websiteHost(v) : null),
    image_url: null,
    url: extra.url ?? (field === "website" ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null),
    platform: extra.platform ?? null,
    handle: extra.handle ?? null,
    followers: null,
    verified: null,
    profile_id: null,
    source: { node: "person", kind: "typed", url: null, where: "typed by you" },
    confidence: 1,
  };
}

/** web.discovered_item category for a finding kept as an unreviewed candidate. */
export function candidateCategory(field: EvidenceField): "media" | "fact" | "social" | "link" | "identity" {
  if (field === "logo") return "media";
  if (field === "social") return "social";
  if (field === "website") return "link";
  if (field === "phone" || field === "email" || field === "address") return "fact";
  return "identity";
}

// ── Compare: candidates grouped by platform ─────────────────────────────────────

/** How a candidate relates to the brand when it is neither ours nor "not us" (web.brand_relation_kind). */
export interface Relation {
  key: string;
  label: string;
  routesTo: "owns" | "key_person" | "competitor" | "brand_property" | "exclusion" | null;
}

/** One website or account that may or may not be the brand, with what its own page said. */
export interface Candidate {
  /** The anchor item's key (the website or account finding). */
  id: string;
  /** "website" or the social platform. */
  platform: string;
  anchor: EvidenceItem;
  /** Everything this source said, anchor included. */
  items: EvidenceItem[];
  /** Keys that belong to this candidate alone (a shared website link is not rejected with one profile). */
  ownKeys: string[];
  name: string | null;
  /** The exact handle, no "@". */
  handle: string | null;
  /** The exact address to open. */
  url: string | null;
  followers: number | null;
  verified: boolean | null;
  bio: string | null;
  /** Stored profile photo door + its source link. */
  profileId: string | null;
  photoUrl: string | null;
  /** A website's own icon/logo. */
  iconUrl: string | null;
  /** Found by the web search: how sure, and why. */
  certainty?: Certainty | null;
  certaintyReasons?: string[];
}

export interface PlatformRow {
  platform: string;
  candidates: Candidate[];
}

/** Row order: the website first, then the platforms people check most. */
const PLATFORM_ORDER = ["website", "instagram", "facebook", "x", "linkedin", "youtube", "pinterest", "tiktok", "threads"];

/** One spelling per profile address: no scheme, no www, no trailing slash, twitter.com = x.com. */
function profileAddress(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^(www|m|mobile)\./, "")
    .replace(/^twitter\.com\//, "x.com/")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

function hostOf(url: string | null): string | null {
  return url ? websiteHost(url) : null;
}

/** Group findings into one row per platform, each row holding that platform's candidates side by side. */
export function compareRows(items: EvidenceItem[]): PlatformRow[] {
  const candidates: Candidate[] = [];

  // Accounts — one per account key; a looked-up profile beats a bare link found on a page.
  const accounts = new Map<string, EvidenceItem>();
  for (const i of items.filter((x) => x.field === "social")) {
    const existing = accounts.get(i.key);
    if (!existing || (existing.source.kind !== "social_profile" && i.source.kind === "social_profile")) accounts.set(i.key, i);
  }
  // A bare link the server resolved to a looked-up account (`same_as`) is that account, not a second row.
  const aliasKeys = new Map<string, string[]>();
  for (const a of accounts.values()) {
    for (const k of a.same_as ?? []) {
      if (k === a.key || !accounts.has(k)) continue;
      aliasKeys.set(a.key, [...(aliasKeys.get(a.key) ?? []), k]);
    }
  }
  for (const merged of aliasKeys.values()) for (const k of merged) accounts.delete(k);
  for (const acct of accounts.values()) {
    // A looked-up profile's findings carry the profile address as their source; match it to the account.
    const addresses = new Set(
      [acct.url, acct.value, acct.source.kind === "social_profile" ? acct.source.url : null]
        .filter((u): u is string => Boolean(u))
        .map(profileAddress),
    );
    const fromProfile = items.filter(
      (i) => i.source.kind === "social_profile" && i.source.url && addresses.has(profileAddress(i.source.url)),
    );
    const group = [acct, ...fromProfile.filter((i) => i.key !== acct.key)];
    const said = (f: EvidenceField) => fromProfile.find((i) => i.field === f) ?? null;
    const photo = acct.profile_id ? acct : (fromProfile.find((i) => i.field === "logo" && i.profile_id) ?? said("logo"));
    candidates.push({
      id: acct.key,
      platform: acct.platform ?? "other",
      anchor: acct,
      items: group,
      ownKeys: [],
      name: said("name")?.value ?? acct.label,
      handle: acct.handle,
      url: acct.url ?? acct.source.url ?? (/^https?:\/\//i.test(acct.value) ? acct.value : null),
      followers: acct.followers ?? photo?.followers ?? null,
      verified: acct.verified,
      bio: said("description")?.value ?? said("tagline")?.value ?? null,
      profileId: photo?.profile_id ?? null,
      photoUrl: photo?.image_url ?? null,
      iconUrl: null,
      certainty: acct.certainty ?? null,
      certaintyReasons: acct.certainty_reasons ?? [],
    });
  }

  // Websites — one per host: the address itself plus everything read off that site.
  const siteItems = items.filter(
    (i) => i.source.kind !== "social_profile" && i.source.kind !== "typed" && i.source.kind !== "web_search" && i.field !== "social",
  );
  const hosts = new Map<string, EvidenceItem | null>();
  for (const w of items.filter((i) => i.field === "website")) {
    const h = websiteHost(w.value);
    const current = hosts.get(h);
    if (!current || (current.source.kind === "social_profile" && w.source.kind !== "social_profile")) hosts.set(h, w);
  }
  for (const i of siteItems) {
    const h = hostOf(i.source.url);
    if (h && !hosts.has(h)) hosts.set(h, null);
  }
  for (const [host, anchorItem] of hosts) {
    const fromSite = siteItems.filter((i) => hostOf(i.source.url) === host);
    const anchor = anchorItem ?? fromSite[0];
    if (!anchor) continue;
    const group = [anchor, ...fromSite.filter((i) => i.key !== anchor.key)];
    const said = (f: EvidenceField) => fromSite.find((i) => i.field === f) ?? null;
    const logos = fromSite.filter((i) => i.field === "logo");
    const icon = logos.find((i) => (i.source.where ?? "").toLowerCase().includes("icon")) ?? logos[0] ?? null;
    const url = anchor.field === "website" ? (anchor.url ?? anchor.value) : (anchor.source.url ?? `https://${host}`);
    candidates.push({
      id: anchor.field === "website" ? anchor.key : `site:${host}`,
      platform: "website",
      anchor,
      items: group,
      ownKeys: [],
      name: said("name")?.value ?? null,
      handle: null,
      url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
      followers: null,
      verified: null,
      bio: said("description")?.value ?? said("tagline")?.value ?? null,
      profileId: null,
      photoUrl: null,
      iconUrl: icon ? (icon.image_url ?? icon.value) : null,
    });
  }

  // A key in two candidates (a profile's link to the site) belongs to neither alone.
  const seen = new Map<string, number>();
  for (const c of candidates) for (const i of c.items) seen.set(i.key, (seen.get(i.key) ?? 0) + 1);
  for (const c of candidates) {
    c.ownKeys = [
      ...c.items.filter((i) => i.key === c.anchor.key || seen.get(i.key) === 1).map((i) => i.key),
      ...(aliasKeys.get(c.anchor.key) ?? []),
    ];
  }

  const rows = new Map<string, Candidate[]>();
  for (const c of candidates) rows.set(c.platform, [...(rows.get(c.platform) ?? []), c]);
  const rank = (p: string) => (PLATFORM_ORDER.indexOf(p) === -1 ? PLATFORM_ORDER.length : PLATFORM_ORDER.indexOf(p));
  return [...rows.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([platform, list]) => ({
      platform,
      candidates: list.sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1) || b.anchor.confidence - a.anchor.confidence),
    }));
}

// ── The web tier: confirmed facts that wake it, and the "On the web" row ─────────────

/** The facts the person confirmed, as the identify workflow reads them (`confirmed` input). */
export interface ConfirmedFacts {
  name?: string;
  domain?: string;
  location?: string;
}

/** The links a link-in-bio page shows (exact addresses), grouped by the page they came from, in page order. */
export function bioLinkGroups(items: Iterable<EvidenceItem>): { from: string; links: EvidenceItem[] }[] {
  const groups = new Map<string, EvidenceItem[]>();
  for (const i of items) {
    if (i.field !== "bio_link") continue;
    const from = i.source.where ?? "from their bio";
    groups.set(from, [...(groups.get(from) ?? []), i]);
  }
  return [...groups.entries()].map(([from, links]) => ({ from, links }));
}

const CERTAINTY_RANK: Record<Certainty, number> = { certain: 0, likely: 1, possible: 2 };

/** A web result's best (lowest) rank across every engine and query that found it. */
export function bestRank(item: EvidenceItem): number {
  return item.hits?.length ? Math.min(...item.hits.map((h) => h.rank)) : 99;
}

/**
 * Every web result (pages, review/listing pages, news/video/image results), merged across engines:
 * best rank first, then found by more engines, then surer.
 */
export function webRow(items: Iterable<EvidenceItem>): EvidenceItem[] {
  return [...items]
    .filter((i) => WEB_FIELDS.has(i.field))
    .sort(
      (a, b) =>
        bestRank(a) - bestRank(b) ||
        (b.engines?.length ?? 0) - (a.engines?.length ?? 0) ||
        CERTAINTY_RANK[a.certainty ?? "possible"] - CERTAINTY_RANK[b.certainty ?? "possible"] ||
        b.confidence - a.confidence,
    );
}

/**
 * What a confirmation should wake: the facts not yet sent. `sent` holds "name:<v>" / "location:<v>".
 * A newly confirmed name re-wakes a known location (its local search names the brand).
 */
export function wakeFacts(facts: ConfirmedFacts, sent: ReadonlySet<string>): ConfirmedFacts {
  const woken: ConfirmedFacts = {};
  if (facts.name && !sent.has(`name:${facts.name}`)) woken.name = facts.name;
  if (facts.location && (woken.name || !sent.has(`location:${facts.location}`))) woken.location = facts.location;
  return woken;
}

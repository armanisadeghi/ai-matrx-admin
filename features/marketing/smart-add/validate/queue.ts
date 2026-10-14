/**
 * Smart Add — the validation queue (pure; no I/O).
 *
 * Once the core is settled (VALIDATION_THRESHOLD) and the brand exists, Smart Add shifts to a focus
 * queue: every finding the person has not answered comes into focus one at a time, in a fixed order
 * (socials and websites first, then names, then facts, then web results), and each answer is saved
 * at once. "Ask me later" moves an item to the end; the "we think" suggestion only highlights an
 * option — it is never chosen for the person.
 *
 * Spec: common-docs/systems/marketing/websites-and-brands/projects/smart-add-brand/SPEC.md § Validation page
 */

import type { BrandRelationKind } from "@/features/marketing/data/service";
import {
  collapseAliasedAccounts,
  websiteHost,
  type Decision,
  type EvidenceField,
  type EvidenceItem,
} from "../evidence";
import { suggestKind, type SuggestContext, type WebChoice } from "../webKinds";

// ── The trigger ──────────────────────────────────────────────────────────────────────

/**
 * The core that must be settled before Smart Add shifts to validation: a brand name, the primary
 * website, and at least this many confirmed social accounts. Below it the person stays on the form,
 * where the core is gathered; at or above it, Create shifts straight to the focus queue.
 */
export const VALIDATION_THRESHOLD = { name: true, website: true, minAccounts: 1 } as const;

export function coreSettled(
  basics: { name: string | null; websiteUrl: string | null; accounts: unknown[] },
  person = false,
): boolean {
  // A person (PEOPLE-AND-CREATORS §4, Part 9): a name and one confirmed account; the website is optional.
  if (person) return Boolean(basics.name) && basics.accounts.length >= VALIDATION_THRESHOLD.minAccounts;
  return (
    (!VALIDATION_THRESHOLD.name || Boolean(basics.name)) &&
    (!VALIDATION_THRESHOLD.website || Boolean(basics.websiteUrl)) &&
    basics.accounts.length >= VALIDATION_THRESHOLD.minAccounts
  );
}

// ── Answers ──────────────────────────────────────────────────────────────────────────

export type FocusKind = "account" | "website" | "name" | "fact" | "web";

export type Answer =
  | "preferred"
  | "ours"
  | "alias"
  | "not_us"
  | "related"
  | "later"
  | "ignore"
  | "correct"
  | "wrong";

export const ANSWER_LABEL: Record<Answer, string> = {
  preferred: "Preferred",
  ours: "Ours",
  alias: "Alias",
  not_us: "Not us",
  related: "Related",
  later: "Ask me later",
  ignore: "Ignore",
  correct: "Correct",
  wrong: "Wrong",
};

/** One key per answer (and E = edit a fact, U / Cmd+Z = undo). */
export const ANSWER_KEY: Record<Answer, string> = {
  preferred: "p",
  ours: "o",
  alias: "a",
  not_us: "n",
  related: "r",
  later: "l",
  ignore: "i",
  correct: "c",
  wrong: "w",
};

/** Every option a kind offers, in button order. Ask me later and Ignore are always there. */
export function optionsFor(kind: FocusKind): Answer[] {
  if (kind === "name") return ["preferred", "alias", "not_us", "related", "later", "ignore"];
  if (kind === "fact") return ["correct", "wrong", "later", "ignore"];
  return ["ours", "not_us", "related", "later", "ignore"];
}

/** The "we think" slot: filled by rules today (web results) and by the suggestion agent later. */
export interface Suggestion {
  choice: Answer;
  relation_key?: string | null;
  /** 0–1, when the suggester gives one. */
  probability: number | null;
  reason: string;
}

export function parseSuggestion(raw: unknown): Suggestion | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const choice = typeof s.choice === "string" ? (s.choice as Answer) : null;
  if (!choice || !(choice in ANSWER_LABEL)) return null;
  return {
    choice,
    relation_key: typeof s.relation_key === "string" ? s.relation_key : null,
    probability: typeof s.probability === "number" && Number.isFinite(s.probability) ? s.probability : null,
    reason: typeof s.reason === "string" ? s.reason : "",
  };
}

// ── Facts (the Brand Basics Fact Finder, kind `brand_basics`) ─────────────────────────

export interface BrandFact {
  key: string;
  field: string;
  field_label: string;
  value: string;
  certainty: string;
  reason: string;
  evidence_urls: string[];
  known_field: string | null;
  suggestion?: Suggestion | null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function parseFact(raw: unknown): BrandFact | null {
  if (typeof raw !== "object" || raw === null) return null;
  const f = raw as Record<string, unknown>;
  const field = str(f.field);
  const value = str(f.value);
  if (!field || !value) return null;
  return {
    key: `fact:${field}:${value.toLowerCase()}`,
    field,
    field_label: str(f.field_label) ?? field,
    value,
    certainty: str(f.certainty) ?? "possible",
    reason: str(f.reason) ?? "",
    evidence_urls: Array.isArray(f.evidence_urls) ? f.evidence_urls.filter((u): u is string => typeof u === "string") : [],
    known_field: typeof f.known_field === "boolean" ? String(f.known_field) : str(f.known_field),
    suggestion: parseSuggestion(f.suggestion),
  };
}

/**
 * Every `brand_basics_fact` in a payload: a `brand_basics` object (by `__kind` or by key) with
 * `items`, wherever it sits in a step output or a live frame (bounded walk).
 */
export function factsFromPayload(payload: unknown, depth = 0): BrandFact[] {
  if (depth > 4 || typeof payload !== "object" || payload === null) return [];
  if (Array.isArray(payload)) return payload.flatMap((p) => factsFromPayload(p, depth + 1));
  const o = payload as Record<string, unknown>;
  if (o.__kind === "brand_basics_fact" || o.__kind === "person_basics_fact") {
    const one = parseFact(o);
    return one ? [one] : [];
  }
  // The kind's list is `facts` (Arman's agent and the registered kind); `items` is read too.
  const list = (b: Record<string, unknown>): unknown[] | null =>
    Array.isArray(b.facts) ? b.facts : Array.isArray(b.items) ? b.items : null;
  if (o.__kind === "brand_basics" || o.__kind === "person_basics") {
    return (list(o) ?? []).map(parseFact).filter((f): f is BrandFact => Boolean(f));
  }
  return Object.entries(o).flatMap(([k, v]) => {
    const block = (k === "brand_basics" || k === "person_basics") && typeof v === "object" && v !== null ? list(v as Record<string, unknown>) : null;
    return block ? block.map(parseFact).filter((f): f is BrandFact => Boolean(f)) : factsFromPayload(v, depth + 1);
  });
}

export function mergeFacts(current: BrandFact[], incoming: BrandFact[]): BrandFact[] {
  if (!incoming.length) return current;
  const byKey = new Map(current.map((f) => [f.key, f]));
  let changed = false;
  for (const f of incoming) {
    if (!byKey.has(f.key)) {
      byKey.set(f.key, f);
      changed = true;
    }
  }
  return changed ? [...byKey.values()] : current;
}

// ── The focus item ───────────────────────────────────────────────────────────────────

export interface FocusItem {
  key: string;
  kind: FocusKind;
  /** What it is, short: "Instagram", "Website", "Name", "Founded", "On the web". */
  label: string;
  /** The exact value, as found. */
  value: string;
  /** A display name beside the value (an account's name, a page title). */
  title: string | null;
  platform: string | null;
  /** Raw image: a stored profile door, else the address as found. */
  profileId: string | null;
  imageUrl: string | null;
  openUrl: string | null;
  /** Where we found it. */
  source: string | null;
  certainty: string | null;
  /** Facts: why the finder thinks so. Web: the snippet. */
  detail: string | null;
  evidenceUrls: string[];
  followers: number | null;
  suggestion: Suggestion | null;
  /** The evidence item behind it (everything but agent facts). */
  evidence: EvidenceItem | null;
  fact: BrandFact | null;
  /** Other keys that are this same account (one profile found under two addresses): answered together. */
  twins: string[];
}

const KIND_ORDER: Record<FocusKind, number> = { account: 0, website: 0, name: 1, fact: 2, web: 3 };
const CERTAINTY_ORDER: Record<string, number> = { certain: 0, confirmed: 0, likely: 1, possible: 2 };

const FACT_FIELDS: ReadonlySet<EvidenceField> = new Set(["phone", "email", "address", "description", "category", "tagline"]);
const WEB_FIELDS: ReadonlySet<EvidenceField> = new Set(["listing", "mention", "web_page", "bio_link"]);

const FIELD_LABEL: Partial<Record<EvidenceField, string>> = {
  phone: "Phone",
  email: "Email",
  address: "Address",
  description: "About",
  category: "Category",
  tagline: "Tagline",
  name: "Name",
  website: "Website",
};

function kindOf(field: EvidenceField): FocusKind | null {
  if (field === "social") return "account";
  if (field === "website") return "website";
  if (field === "name") return "name";
  if (FACT_FIELDS.has(field)) return "fact";
  if (WEB_FIELDS.has(field)) return "web";
  return null;
}

function platformName(platform: string | null): string {
  if (!platform) return "Account";
  const map: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    x: "X",
    twitter: "X",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    tiktok: "TikTok",
    pinterest: "Pinterest",
    threads: "Threads",
  };
  return map[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** A rule suggestion for a web result (webKinds.suggestKind) in the "we think" shape. */
function webSuggestion(item: EvidenceItem, kinds: BrandRelationKind[], ctx: SuggestContext): Suggestion | null {
  const s = suggestKind(item, kinds, ctx);
  if (!s) return null;
  const choice: Answer = s.kind === "ours" ? "ours" : s.kind === "not_us" ? "not_us" : "related";
  return { choice, relation_key: choice === "related" ? s.kind : null, probability: null, reason: s.reason };
}

export function focusFromEvidence(item: EvidenceItem, kinds: BrandRelationKind[], ctx: SuggestContext): FocusItem | null {
  const kind = kindOf(item.field);
  if (!kind) return null;
  const url = item.url ?? (kind === "website" || kind === "web" ? item.value : null);
  const base: FocusItem = {
    key: item.key,
    kind,
    label: FIELD_LABEL[item.field] ?? "On the web",
    value: item.value,
    title: null,
    platform: item.platform,
    profileId: item.profile_id,
    imageUrl: item.image_url,
    openUrl: url,
    source: item.source.where,
    certainty: item.certainty ?? null,
    detail: null,
    evidenceUrls: item.source.url ? [item.source.url] : [],
    followers: item.followers,
    suggestion: parseSuggestion(item.suggestion),
    evidence: item,
    fact: null,
    twins: [],
  };
  if (kind === "account") {
    return { ...base, label: platformName(item.platform), value: item.handle ? `@${item.handle}` : item.value, title: item.label };
  }
  if (kind === "website") return { ...base, value: item.value, title: item.label && item.label !== websiteHost(item.value) ? item.label : null };
  if (kind === "web") {
    return {
      ...base,
      label: item.field === "mention" ? "Mention" : item.field === "listing" ? "Listing" : item.field === "bio_link" ? "Bio link" : "On the web",
      value: url ?? item.value,
      title: item.field === "listing" ? [item.handle, item.label].filter(Boolean).join(" · ") || null : (item.label ?? item.handle),
      detail: item.snippet ?? null,
      suggestion: parseSuggestion(item.suggestion) ?? webSuggestion(item, kinds, ctx),
    };
  }
  return base;
}

export function focusFromFact(f: BrandFact): FocusItem {
  return {
    key: f.key,
    kind: "fact",
    label: f.field_label,
    value: f.value,
    title: null,
    platform: null,
    profileId: null,
    imageUrl: null,
    openUrl: f.evidence_urls[0] ?? null,
    source: f.evidence_urls[0] ? websiteHost(f.evidence_urls[0]) : null,
    certainty: f.certainty,
    detail: f.reason || null,
    evidenceUrls: f.evidence_urls,
    followers: null,
    suggestion: f.suggestion ?? null,
    evidence: null,
    fact: f,
    twins: [],
  };
}

/**
 * The facts agent's fields in the order a person settles them: identity and contact, then what the
 * business is and does, then its people, then listings and metrics. Every other field is the later
 * pile (after the web results).
 */
const FACT_GROUPS: readonly (readonly string[])[] = [
  [
    "official_name", "legal_entity_name", "dba_name", "former_name", "also_known_as", "website", "additional_website",
    "street_address", "city", "county", "state", "province", "region", "postal_code", "country",
    "headquarters_location", "additional_location", "phone", "toll_free_phone", "sms_number", "fax", "email",
    "contact_form_url", "live_chat", "booking_url", "careers_page", "online_store_url", "linkedin_company_page",
    "social_facebook", "social_instagram", "social_x", "social_tiktok", "social_youtube", "social_pinterest",
    "social_threads", "social_snapchat", "social_reddit", "social_discord", "social_github", "social_bluesky",
    "social_whatsapp", "social_telegram", "unresolved_profile",
  ],
  [
    "business_type", "industry", "business_category", "entity_type", "primary_products_services", "specialty",
    "target_market", "short_description", "tagline", "service_area", "sic_code", "naics_code",
  ],
  ["founder", "ceo", "president", "owner", "partner", "key_executive", "employee", "staff_contact"],
  [
    "google_business_profile", "yelp_page", "bbb_profile", "trustpilot_page", "glassdoor_page", "crunchbase_page",
    "wikipedia_page", "apple_app_store_app", "google_play_app", "amazon_storefront", "other_listing",
    "review_rating", "verified_account", "social_follower_count", "stated_metric", "employee_count_range",
    "annual_revenue", "year_founded",
  ],
];
const FACT_GROUP = new Map(FACT_GROUPS.flatMap((fields, group) => fields.map((f) => [f, group] as const)));
/** A field's place inside its group (Official Name before Country before Booking URL); unknown fields last. */
const FACT_POSITION = new Map(FACT_GROUPS.flatMap((fields) => fields.map((f, i) => [f, i] as const)));
/** The later pile: a fact field outside the four groups. */
export const LATER_FACT_GROUP = FACT_GROUPS.length;

export function factGroup(field: string): number {
  return FACT_GROUP.get(field) ?? LATER_FACT_GROUP;
}

function rank(i: FocusItem): number[] {
  const certainty = CERTAINTY_ORDER[i.certainty ?? ""] ?? 1;
  const confidence = i.evidence ? 1 - i.evidence.confidence : 0.5;
  const group = i.fact ? factGroup(i.fact.field) : 0;
  // MKT-063: inside a group the fields keep the ruling's order, never the alphabet of their keys.
  const position = i.fact ? (FACT_POSITION.get(i.fact.field) ?? Number.MAX_SAFE_INTEGER) : 0;
  // A later-pile fact comes after the web results.
  const kind = i.fact && group === LATER_FACT_GROUP ? KIND_ORDER.web + 1 : KIND_ORDER[i.kind];
  return [kind, group, position, certainty, confidence];
}

function compare(a: FocusItem, b: FocusItem): number {
  const ra = rank(a);
  const rb = rank(b);
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
  return a.key.localeCompare(b.key);
}

export interface QueueInput {
  items: EvidenceItem[];
  facts: BrandFact[];
  decisions: Record<string, Decision>;
  webChoices: Record<string, WebChoice>;
  /** Keys answered on this page (saved or saving). */
  answered: ReadonlySet<string>;
  /** Keys sent to "Ask me later", oldest first: they come back after everything else. */
  later: string[];
  broken?: ReadonlySet<string>;
  kinds: BrandRelationKind[];
  ctx: SuggestContext;
}

/** The open findings in focus order, the later pile last. Typed values and answered ones are out. */
export function buildQueue(input: QueueInput): FocusItem[] {
  // One card per account: aliased addresses collapse, and so do two addresses of one stored profile
  // (a vanity and a numeric LinkedIn company address) — the readable one leads.
  const accounts = collapseAliasedAccounts(input.items.filter((i) => i.field === "social"));
  const twinsOf = new Map<string, string[]>();
  const byProfile = new Map<string, EvidenceItem[]>();
  for (const a of accounts) {
    const id = a.profile_id ?? a.key;
    byProfile.set(id, [...(byProfile.get(id) ?? []), a]);
  }
  for (const group of byProfile.values()) {
    const lead = [...group].sort((x, y) => Number(/:\d+$/.test(x.key)) - Number(/:\d+$/.test(y.key)))[0];
    twinsOf.set(lead.key, group.filter((g) => g.key !== lead.key).map((g) => g.key));
  }
  const closed = (key: string) =>
    input.answered.has(key) || Boolean(input.decisions[key]) || Boolean(input.webChoices[key]) || Boolean(input.broken?.has(key));
  const open = (key: string) => !closed(key) && !(twinsOf.get(key) ?? []).some(closed);
  const fromEvidence = input.items
    .filter((i) => i.field !== "social" || twinsOf.has(i.key))
    .filter((i) => i.source.kind !== "typed" && i.source.where !== "the address itself" && open(i.key))
    .map((i) => focusFromEvidence(i, input.kinds, input.ctx))
    .filter((f): f is FocusItem => Boolean(f))
    .map((f) => ({ ...f, twins: twinsOf.get(f.key) ?? [] }));
  const fromFacts = input.facts.filter((f) => open(f.key)).map(focusFromFact);
  const all = [...fromEvidence, ...fromFacts];
  const laterSet = new Set(input.later);
  const now = all.filter((f) => !laterSet.has(f.key)).sort(compare);
  const byKey = new Map(all.map((f) => [f.key, f]));
  const back = input.later.map((k) => byKey.get(k)).filter((f): f is FocusItem => Boolean(f));
  return [...now, ...back];
}

/** The decision the identify workflow reads for an answer (wakes the next round / the confirmed tiers). */
export function decisionFor(answer: Answer): Decision | null {
  if (answer === "preferred") return "preferred";
  if (answer === "ours") return "yes";
  if (answer === "alias") return "alias";
  if (answer === "not_us") return "no";
  return null;
}

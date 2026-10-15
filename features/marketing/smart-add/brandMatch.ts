/**
 * Smart Add · duplicate-brand matcher (pure; the live reads are in brandMatchLive.ts).
 *
 * Arman, 2026-10-14: "When you add a brand that is clearly already a brand you have, there is no recognition
 * of that and no attempt to ask you to reconcile."
 *
 * A brand the person can see (across all their organizations; the active org is never a filter) matches an
 * entry when ANY of these holds:
 *   - the same site domain (www and case ignored);
 *   - the same social account (same platform, same handle);
 *   - a strong name match: the same normalized name AND a shared city or a shared domain name (ritualcoffee.co
 *     and ritualcoffee.com). A name made only of common words ("Coffee", "The Studio") never matches by itself.
 */
import { parseSocialAccount } from "@/features/marketing/social/link";
import { isSocialPlatform } from "@/features/marketing/social/types";

/** What the entry (or the round's confirmed answers) says about the brand being added. */
export interface BrandProbe {
  /** Hosts, already normalized (websiteHost). */
  domains: string[];
  accounts: { platform: string | null; handle: string }[];
  name: string | null;
  /** A city, or an address line: the places it names are compared with the existing brand's addresses. */
  place: string | null;
}

/** An existing brand with everything the matcher compares (built by the live read). */
export interface BrandCandidate {
  id: string;
  slug: string | null;
  name: string;
  organizationId: string;
  /** The organization's name, when it could be read. */
  organizationName: string | null;
  /** When the brand was created (ISO). */
  createdAt: string | null;
  domains: string[];
  accounts: { platform: string | null; handle: string }[];
  /** Every address text the brand holds. */
  places: string[];
}

export type MatchReason =
  | { kind: "site"; value: string }
  | { kind: "account"; platform: string | null; handle: string }
  | { kind: "name"; shared: "city" | "domain"; value: string };

export interface BrandMatch {
  brand: BrandCandidate;
  reasons: MatchReason[];
  /** What tells this brand apart from a same-name one (describeCandidate). */
  detail: string;
}

/**
 * The matching rules that are settings (feature knobs smart_add.brand_match.*; read in brandMatchLive.ts):
 * the common-word list, the shared-host list and the shortest name that can match. The platform seeds the
 * starting values; an organization may override them.
 */
export interface MatchRules {
  /** Words that name a kind of business, not a business: a name made only of these never matches. */
  genericWords: ReadonlySet<string>;
  /** Hosts shared by many brands: typing one is never "the brand's own site". */
  sharedHosts: ReadonlySet<string>;
  nameMinLength: number;
}

const wordList = (v: unknown, what: string): Set<string> => {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw new Error(`Smart Add setting ${what} is not a list of words`);
  return new Set((v as string[]).map((x) => x.trim().toLowerCase()).filter(Boolean));
};

/** The knob values → rules. A value of the wrong shape raises by name; there is no fallback list. */
export function parseMatchRules(v: { genericWords: unknown; sharedHosts: unknown; nameMinLength: unknown }): MatchRules {
  const min = typeof v.nameMinLength === "number" ? v.nameMinLength : Number(v.nameMinLength);
  if (!Number.isFinite(min) || min < 1) throw new Error("Smart Add setting brand_match.name_min_length is not a number");
  return { genericWords: wordList(v.genericWords, "brand_match.generic_words"), sharedHosts: wordList(v.sharedHosts, "brand_match.shared_hosts"), nameMinLength: min };
}

/** Dropped from names before comparing ("Ritual Coffee Co." = "Ritual Coffee"). */
const LEGAL_SUFFIXES = new Set(["inc", "llc", "ltd", "co", "corp", "corporation", "company", "incorporated", "limited", "llp", "pllc"]);
/** Address words that carry no place ("Main Street, Suite 4"). */
const ADDRESS_WORDS = new Set([
  "street", "st", "avenue", "ave", "boulevard", "blvd", "road", "rd", "drive", "dr", "lane", "ln", "court", "ct",
  "suite", "ste", "unit", "floor", "north", "south", "east", "west", "united", "states", "usa", "america", "main",
  "county", "highway", "hwy", "plaza", "place", "way", "the", "and",
]);

/** Lowercase, no accents, letters and digits only, split on everything else. */
function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** The comparable form of a brand name ("Ritual Coffee Co." → "ritual coffee"). */
export function normalizeName(name: string): string {
  const w = words(name);
  while (w.length > 1 && LEGAL_SUFFIXES.has(w[w.length - 1])) w.pop();
  return w.filter((x) => x !== "the" || w.length === 1).join(" ");
}

/** A name that says nothing about which business it is ("Coffee", "The Studio"). */
export function isGenericName(name: string, rules: MatchRules): boolean {
  const w = words(name).filter((x) => !LEGAL_SUFFIXES.has(x));
  return w.every((x) => rules.genericWords.has(x) || x.length < 3);
}

/** A host as the brand data stores it: lowercase, no scheme, path or www. "" when it is not a host. */
export function normalizeHost(input: string): string {
  const t = input.trim();
  if (!t || /\s/.test(t)) return "";
  try {
    const host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`).hostname.toLowerCase().replace(/^www\./, "");
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : "";
  } catch {
    return "";
  }
}

/** True for a host many brands share (a social network, a link page, a site builder). */
export function isSharedHost(host: string, rules: MatchRules): boolean {
  return [...rules.sharedHosts].some((h) => host === h || host.endsWith(`.${h}`));
}

/** The name part of a host: ritualcoffee.co.uk and ritualcoffee.com both say "ritualcoffee". */
export function domainLabel(host: string): string {
  const parts = host.split(".");
  if (parts.length < 2) return host;
  const secondLevel = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);
  const n = parts.length >= 3 && parts[parts.length - 1].length === 2 && secondLevel.has(parts[parts.length - 2]) ? 3 : 2;
  return parts[parts.length - n] ?? host;
}

export function normalizeHandle(handle: string): string {
  let h = handle.trim();
  try {
    h = decodeURIComponent(h);
  } catch {
    /* keep as typed */
  }
  return h.replace(/^@+/, "").replace(/\/+$/, "").toLowerCase();
}

/** The places an address text names: its words minus street words and numbers. */
function placeWords(text: string): Set<string> {
  return new Set(words(text).filter((w) => w.length >= 4 && !ADDRESS_WORDS.has(w) && !/^\d+$/.test(w)));
}

function sharesPlace(probePlace: string, places: string[]): string | null {
  const mine = placeWords(probePlace);
  if (!mine.size) return null;
  for (const text of places) {
    for (const w of placeWords(text)) if (mine.has(w)) return w;
  }
  return null;
}

/** Existing brands that match the probe, strongest reasons first. Pure. */
export function matchBrands(probe: BrandProbe, pool: BrandCandidate[], rules: MatchRules): BrandMatch[] {
  const hosts = new Set(probe.domains.map(normalizeHost).filter((h) => h && !isSharedHost(h, rules)));
  const accounts = probe.accounts
    .map((a) => ({ platform: a.platform, handle: normalizeHandle(a.handle) }))
    .filter((a) => a.handle.length >= 2);
  const name = probe.name ? normalizeName(probe.name) : "";
  const nameUsable = name.length >= rules.nameMinLength && !isGenericName(name, rules);
  const labels = new Set([...hosts].map(domainLabel));
  const out: BrandMatch[] = [];
  for (const brand of pool) {
    const reasons: MatchReason[] = [];
    const brandHosts = brand.domains.map(normalizeHost).filter(Boolean);
    for (const h of hosts) if (brandHosts.includes(h)) reasons.push({ kind: "site", value: h });
    for (const a of accounts) {
      const hit = brand.accounts.find(
        (b) => normalizeHandle(b.handle) === a.handle && (!a.platform || !b.platform || a.platform === b.platform),
      );
      if (hit) reasons.push({ kind: "account", platform: hit.platform ?? a.platform, handle: a.handle });
    }
    if (nameUsable && normalizeName(brand.name) === name) {
      const sharedLabel = brandHosts.find((h) => !isSharedHost(h, rules) && labels.has(domainLabel(h)));
      const place = probe.place ? sharesPlace(probe.place, brand.places) : null;
      if (place) reasons.push({ kind: "name", shared: "city", value: place });
      else if (sharedLabel) reasons.push({ kind: "name", shared: "domain", value: sharedLabel });
    }
    if (reasons.length) out.push({ brand, reasons, detail: describeCandidate(brand, rules) });
  }
  const weight = (m: BrandMatch) => m.reasons.length * 10 + (m.reasons.some((r) => r.kind === "site") ? 5 : 0);
  return out.sort((a, b) => weight(b) - weight(a) || a.brand.name.localeCompare(b.brand.name));
}

/** What the person typed on the entry (the address draft) → a probe. Anything unreadable is simply absent. */
export function probeFromDraft(d: {
  website?: string | null;
  social?: string | null;
  platform?: string | null;
  name?: string | null;
  city?: string | null;
}): BrandProbe {
  const domain = d.website ? normalizeHost(d.website) : "";
  const picked = d.platform && isSocialPlatform(d.platform) ? d.platform : null;
  const parsed = d.social?.trim() ? parseSocialAccount(d.social, picked) : null;
  return {
    domains: domain ? [domain] : [],
    accounts: parsed && parsed.status === "ok" && (parsed.detected || picked) ? [{ platform: parsed.platform, handle: parsed.handle }] : [],
    name: d.name?.trim() || null,
    place: d.city?.trim() || null,
  };
}

/** The probe has something worth looking up. */
export function probeIsEmpty(p: BrandProbe): boolean {
  return !p.domains.length && !p.accounts.length && !(p.name && normalizeName(p.name).length >= 3);
}

/** Equal probes ask the same question (the live read and the notice share one answer). */
export function probeKey(p: BrandProbe): string {
  return JSON.stringify([
    [...p.domains].map(normalizeHost).sort(),
    p.accounts.map((a) => `${a.platform ?? ""}:${normalizeHandle(a.handle)}`).sort(),
    p.name ? normalizeName(p.name) : "",
    p.place ? [...placeWords(p.place)].sort() : [],
  ]);
}

/** "Oct 12", or "Oct 12, 2025" when it was not this year. Empty when the date is unreadable. */
export function shortDate(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions = d.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" };
  return d.toLocaleDateString("en-US", opts);
}

/**
 * What tells two same-name brands apart, under the brand's name: organization, site, account count, when it
 * was created ("Harbor Dental Group · ritualcoffee.com · 3 accounts · Oct 12"). A part with no value is left out.
 */
export function describeCandidate(b: BrandCandidate, rules: MatchRules, now?: Date): string {
  const site = b.domains.map(normalizeHost).find((h) => h && !isSharedHost(h, rules));
  const n = b.accounts.length;
  return [b.organizationName, site, n ? `${n} ${n === 1 ? "account" : "accounts"}` : null, shortDate(b.createdAt, now)].filter(Boolean).join(" · ");
}

/**
 * Smart Add — the first data, shown the moment it lands (Arman, 2026-10-14: "something visible must appear
 * immediately, and slow work never blocks it").
 *
 * Two feeds into the same evidence rows the slots already read:
 *  1. `webFirstData` — the web step's own-site results (out in about a second): the search listing's
 *     publisher organization name and its logo, the listing's own profile name when it says more than the
 *     address, and the homepage's description. A site that refuses a direct read (a bot wall) still gets
 *     its name on screen at once.
 *  2. `factEvidence` — the facts agent (a minute or more) MERGES in later: its brand name and its name /
 *     phone / email / category facts become rows under the same keys the server uses, so a value already
 *     on screen is never reset or duplicated (mergeEvidence keeps the higher confidence) and a new one is
 *     simply added to its slot.
 */

import { isLinkInBioUrl } from "../lib/link-in-bio";
import { websiteHost, type Certainty, type EvidenceField, type EvidenceItem, type EvidenceSource } from "./evidence";
import type { BrandFact } from "./validate/queue";

function hostOf(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function rec(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function text(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t || null;
}

/** The server's evidence key (aidream brand_identify._key) for the fields fed here. */
export function evidenceKey(field: EvidenceField, value: string): string {
  const v = value.replace(/\s+/g, " ").trim().toLowerCase();
  if (field === "phone") return `phone:${v.replace(/\D/g, "").slice(-10)}`;
  if (field === "description") return `description:${v.slice(0, 80)}`;
  if (field === "website") return `website:${websiteHost(v)}`;
  return `${field}:${v}`;
}

function item(field: EvidenceField, value: string, source: EvidenceSource, confidence: number, extra?: Partial<EvidenceItem>): EvidenceItem {
  return {
    key: evidenceKey(field, value),
    field,
    value,
    label: null,
    image_url: null,
    url: null,
    platform: null,
    handle: null,
    followers: null,
    verified: null,
    profile_id: null,
    source,
    confidence,
    ...extra,
  };
}

/** The address re-cased ("Fullspecstaff" for fullspecstaff.com) says nothing the address did not. */
function onlyTheAddress(name: string, domain: string): boolean {
  const stem = domain.split(".")[0] ?? "";
  return name.replace(/[^a-z0-9]/gi, "").toLowerCase() === stem.replace(/[^a-z0-9]/g, "");
}

/** Name, logo and description rows from the web step's own-site results (its output, about a second in). */
export function webFirstData(output: unknown): EvidenceItem[] {
  const out = rec(output);
  const own = Array.isArray(out?.own_site_results) ? out.own_site_results : [];
  const domain = hostOf(out?.domain) || hostOf(rec(rec(own[0])?.result)?.url);
  if (!domain) return [];
  const mine = (url: unknown) => {
    const h = hostOf(url);
    return Boolean(h) && (h === domain || h.endsWith(`.${domain}`));
  };
  const found = new Map<string, EvidenceItem>();
  const add = (i: EvidenceItem) => {
    const had = found.get(i.key);
    if (!had || had.confidence < i.confidence) found.set(i.key, i);
  };
  for (const raw of own) {
    const result = rec(rec(raw)?.result);
    if (!result || !mine(result.url)) continue;
    const src: EvidenceSource = { node: "web", kind: "web_search", url: typeof result.url === "string" ? result.url : null, where: "search listing" };
    const publisher = rec(rec(result.article)?.publisher);
    const pubName = text(publisher?.name);
    if (publisher && publisher.type === "organization" && pubName && mine(publisher.url ?? result.url)) {
      add(item("name", pubName, src, 0.9));
      const logo = rec(publisher.thumbnail)?.original;
      if (typeof logo === "string" && mine(logo)) add(item("logo", logo, src, 0.7, { image_url: logo, url: logo }));
    }
    const profileName = text(rec(result.profile)?.name);
    if (profileName && !onlyTheAddress(profileName, domain)) add(item("name", profileName, src, 0.6));
    // The homepage's own listing (the result itself, or a cluster row) carries the site's description.
    const rows = [result, ...(Array.isArray(result.cluster) ? result.cluster.map(rec) : [])];
    for (const row of rows) {
      if (!row || !mine(row.url)) continue;
      let path = "";
      try {
        path = new URL(String(row.url)).pathname;
      } catch {
        continue;
      }
      const about = text(row.description);
      if ((path === "/" || path === "") && about && about.length >= 40)
        add(item("description", about, { ...src, url: String(row.url) }, 0.6));
    }
  }
  return [...found.values()];
}

/** The facts agent's `brand_name` (kind brand_basics), wherever it sits in its output (bounded walk). */
export function brandNameFromPayload(payload: unknown, depth = 0): string | null {
  if (depth > 5 || typeof payload !== "object" || payload === null) return null;
  if (Array.isArray(payload)) {
    for (const p of payload) {
      const n = brandNameFromPayload(p, depth + 1);
      if (n) return n;
    }
    return null;
  }
  const o = payload as Record<string, unknown>;
  if (o.__kind === "brand_basics" && text(o.brand_name)) return text(o.brand_name);
  for (const v of Object.values(o)) {
    const n = brandNameFromPayload(v, depth + 1);
    if (n) return n;
  }
  return null;
}

/**
 * The facts agent's fields that land in a slot (validate/queue keeps every fact for the validation page). A slot the
 * site read left empty (a bot wall, a timeout) is filled by what the agent found, as a suggestion with its certainty.
 */
const FACT_SLOT: Record<string, EvidenceField> = {
  name: "name",
  phone: "phone",
  email: "email",
  category: "category",
  business_category: "category",
  website: "website",
  website_url: "website",
  logo: "logo",
  logo_url: "logo",
  short_description: "description",
  description: "description",
  about: "description",
  tagline: "tagline",
  slogan: "tagline",
};

function factField(f: BrandFact): EvidenceField | null {
  return FACT_SLOT[f.known_field ?? ""] ?? FACT_SLOT[f.field] ?? null;
}

/** The fact's value as its slot holds it: URLs decoded (`&amp;` in a scraped logo address), websites as addresses. */
function factValue(field: EvidenceField, value: string): string | null {
  const v = field === "logo" || field === "website" ? value.replace(/&amp;/g, "&").trim() : value.trim();
  if (!v) return null;
  if (field === "website") {
    if (isLinkInBioUrl(v)) return null; // a link-in-bio page is never the brand's website
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }
  if (field === "logo" && !/^https?:\/\//i.test(v)) return null;
  return v;
}

const FACT_CERTAINTY: Record<string, Certainty> = { confirmed: "certain", certain: "certain", likely: "likely", possible: "possible" };

/** The slot finding's key a fact fed (name / phone / email / category / website / logo / about), so the person's answer there is the fact's. */
export function factSlotKey(f: BrandFact): string | null {
  const field = factField(f);
  const value = field ? factValue(field, f.value) : null;
  return field && value ? evidenceKey(field, value) : null;
}

/** The facts agent's findings as slot rows, merged under the server's keys (added or refined, never reset). */
export function factEvidence(facts: BrandFact[], brandName: string | null): EvidenceItem[] {
  const src = (url: string | null): EvidenceSource => ({ node: "facts", kind: "web_search", url, where: "research" });
  const out: EvidenceItem[] = [];
  if (brandName) out.push(item("name", brandName, src(null), 0.85));
  for (const f of facts) {
    const field = factField(f);
    if (!field || f.conflict_with) continue;
    const value = factValue(field, f.value);
    if (!value) continue;
    const confidence = f.certainty === "confirmed" ? 0.85 : f.certainty === "likely" ? 0.7 : 0.5;
    const extra: Partial<EvidenceItem> = {
      certainty: FACT_CERTAINTY[f.certainty] ?? "possible",
      ...(f.reason ? { certainty_reasons: [f.reason] } : {}),
      ...(field === "website" ? { url: value, label: websiteHost(value) } : {}),
      ...(field === "logo" ? { url: value, image_url: value } : {}),
    };
    out.push(item(field, value, src(f.evidence_urls[0] ?? null), confidence, extra));
  }
  return out;
}

/**
 * The website the person typed, as its own Websites row from the first moment — whether or not the site lets us read
 * it (a bot wall, a timeout). Same key and source as the server's quick-check row (aidream brand_identify
 * probe_evidence: "the address itself"), so a successful read merges into it instead of adding a second row.
 */
export function typedWebsiteItem(typed: string): EvidenceItem | null {
  const raw = typed.trim();
  if (!raw || isLinkInBioUrl(raw)) return null;
  const host = websiteHost(raw);
  if (!host || !host.includes(".")) return null;
  const url = `https://${host}`;
  return item("website", url, { node: "probe", kind: "website", url, where: "the address itself" }, 0.9, { url, label: host });
}

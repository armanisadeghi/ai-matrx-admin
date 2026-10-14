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

import type { EvidenceField, EvidenceItem, EvidenceSource } from "./evidence";
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

/** The facts agent's fields that land in a slot (validate/queue keeps every fact for the validation page). */
const FACT_SLOT: Record<string, EvidenceField> = { name: "name", phone: "phone", email: "email", category: "category" };

/** The slot finding's key a fact fed (name / phone / email / category), so the person's answer there is the fact's. */
export function factSlotKey(f: BrandFact): string | null {
  const field = FACT_SLOT[f.known_field ?? ""] ?? FACT_SLOT[f.field];
  return field ? evidenceKey(field, f.value) : null;
}

/** The facts agent's findings as slot rows, merged under the server's keys (added or refined, never reset). */
export function factEvidence(facts: BrandFact[], brandName: string | null): EvidenceItem[] {
  const src = (url: string | null): EvidenceSource => ({ node: "facts", kind: "web_search", url, where: "research" });
  const out: EvidenceItem[] = [];
  if (brandName) out.push(item("name", brandName, src(null), 0.85));
  for (const f of facts) {
    const field = FACT_SLOT[f.known_field ?? ""] ?? FACT_SLOT[f.field];
    if (!field || f.conflict_with) continue;
    const confidence = f.certainty === "confirmed" ? 0.85 : f.certainty === "likely" ? 0.7 : 0.5;
    out.push(item(field, f.value, src(f.evidence_urls[0] ?? null), confidence));
  }
  return out;
}

/**
 * Company intelligence: what the live-data sources say about a company party, as short labelled
 * facts for the record page. Pure mapping (no network): the card fetches, these functions read.
 *
 * Storage: `crm.party.attributes.company_intelligence[sourceKey]` = {@link StoredIntel}. The
 * display-ready facts are stored (not the raw provider record, which stays in the person's own
 * fetched table named by `table_id`), so the card renders after a reload with no fetch and no
 * provider field names reach the screen.
 */

import {
  countText,
  moneyText,
  pickList,
  pickNumber,
  pickObject,
  pickText,
  type DataRecord,
} from "@/features/data-sources/records";

export interface IntelFact {
  label: string;
  value: string;
}

export interface StoredIntel {
  fetched_at: string;
  source_url: string;
  job_id: string;
  table_id: string;
  facts: IntelFact[];
}

export type IntelSourceKey = "linkedin_company" | "crunchbase_company" | "glassdoor_company" | "google_maps_place";

export interface IntelSource {
  key: IntelSourceKey;
  /** Words the person sees (never the vendor). */
  label: string;
  /** Placeholder for the paste box. */
  example: string;
  /** Is this web address one this source reads? */
  accepts: (url: URL) => boolean;
}

const host = (u: URL) => u.hostname.replace(/^www\./, "").toLowerCase();

export const INTEL_SOURCES: readonly IntelSource[] = [
  {
    key: "linkedin_company",
    label: "LinkedIn company page",
    example: "https://www.linkedin.com/company/stripe/",
    accepts: (u) => /(^|\.)linkedin\.com$/.test(host(u)) && u.pathname.startsWith("/company/"),
  },
  {
    key: "crunchbase_company",
    label: "Crunchbase company page",
    example: "https://www.crunchbase.com/organization/stripe",
    accepts: (u) => /(^|\.)crunchbase\.com$/.test(host(u)) && u.pathname.startsWith("/organization/"),
  },
  {
    key: "glassdoor_company",
    label: "Glassdoor company overview",
    example: "https://www.glassdoor.com/Overview/Working-at-Stripe-EI_IE671932.11,17.htm",
    accepts: (u) => /(^|\.)glassdoor\.[a-z.]+$/.test(host(u)) && u.pathname.startsWith("/Overview/"),
  },
  {
    key: "google_maps_place",
    label: "Google Maps place",
    example: "https://www.google.com/maps/place/?q=place_id:ChIJVVVVVVVVVVVVVVVVVVVVVVV",
    accepts: (u) => /(^|\.)google\.[a-z.]+$/.test(host(u)) && u.pathname.startsWith("/maps/place"),
  },
];

/** The web addresses a party already carries (contact methods, website), for finding each source's input. */
export function candidateUrls(parts: { values: (string | null | undefined)[] }): string[] {
  const out: string[] = [];
  for (const v of parts.values) {
    const s = v?.trim();
    if (s && /^https?:\/\//i.test(s) && !out.includes(s)) out.push(s);
  }
  return out;
}

/** The party's existing address for a source, if any (first match wins). */
export function inputUrlFor(source: IntelSource, urls: string[]): string | null {
  for (const raw of urls) {
    try {
      if (source.accepts(new URL(raw))) return raw;
    } catch {
      // not a URL
    }
  }
  return null;
}

/** A pasted value as an address this source can read: a full link, or (Maps) a bare place id. */
export function normalizePastedUrl(source: IntelSource, pasted: string): string | null {
  const text = pasted.trim();
  if (source.key === "google_maps_place" && /^ChIJ[\w-]{10,}$/.test(text)) {
    return `https://www.google.com/maps/place/?q=place_id:${text}`;
  }
  const withScheme = /^https?:\/\//i.test(text) ? text : /^[\w-]+(\.[\w-]+)+\//.test(text) ? `https://${text}` : null;
  if (!withScheme) return null;
  try {
    return source.accepts(new URL(withScheme)) ? withScheme : null;
  } catch {
    return null;
  }
}

function fact(label: string, value: string | null | undefined): IntelFact[] {
  return value ? [{ label, value }] : [];
}

function amount(rec: DataRecord | null, ...paths: string[]): string | null {
  const obj = pickObject(rec, ...paths);
  if (obj) {
    const n = pickNumber(obj, "value", "amount", "usd", "total");
    if (n != null) return moneyText(n, pickText(obj, "currency", "currency_code") ?? "USD");
    return pickText(obj, "text", "display", "formatted");
  }
  const n = pickNumber(rec, ...paths);
  if (n != null) return moneyText(n);
  return pickText(rec, ...paths);
}

function hoursSummary(rec: DataRecord): string | null {
  const text = pickText(rec, "open_hours_text", "hours", "opening_hours");
  if (text) return text;
  const obj = pickObject(rec, "open_hours", "opening_hours", "hours");
  if (obj) {
    const days = Object.entries(obj).filter(([, v]) => typeof v === "string" && v.trim() !== "");
    if (days.length === 0) return null;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const hit = days.find(([d]) => d.toLowerCase().startsWith(today.toLowerCase().slice(0, 3)));
    const [d, v] = hit ?? days[0];
    return `${d.charAt(0).toUpperCase()}${d.slice(1)} ${String(v).trim()}`;
  }
  const arr = Array.isArray((rec as DataRecord).open_hours) ? ((rec as DataRecord).open_hours as unknown[]) : [];
  if (arr.length > 0) {
    const first = arr[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const o = first as DataRecord;
      const d = pickText(o, "day");
      const t = pickText(o, "hours", "time", "open");
      if (d && t) return `${d} ${t}`;
    }
  }
  return null;
}

/** Display-ready facts for one source's fetched record. Empty when the record has nothing we recognise. */
export function intelFacts(sourceKey: string, rec: DataRecord | null): IntelFact[] {
  if (!rec) return [];
  switch (sourceKey) {
    case "linkedin_company": {
      const employees = pickNumber(rec, "employees_in_linkedin", "employees");
      const size = pickText(rec, "company_size");
      const lastRound = [
        pickText(rec, "funding.last_round_type", "last_funding_type"),
        amount(rec, "funding.last_round_raised", "funding.last_round_amount"),
        pickText(rec, "funding.last_round_date", "last_funding_date"),
      ]
        .filter(Boolean)
        .join(" · ");
      return [
        ...fact("Employees", employees != null ? `${countText(employees)} on LinkedIn` : size),
        ...fact("Size", employees != null ? size : null),
        ...fact("Followers", pickNumber(rec, "followers") != null ? countText(pickNumber(rec, "followers") as number) : null),
        ...fact("Industry", pickList(rec, "industries", "industry").slice(0, 2).join(", ") || null),
        ...fact("Founded", pickText(rec, "founded")),
        ...fact("Headquarters", pickText(rec, "headquarters", "formatted_locations.0", "locations.0")),
        ...fact("Last funding round", lastRound || null),
        ...fact("Website", pickText(rec, "website")),
      ];
    }
    case "crunchbase_company": {
      const total = amount(rec, "financials_highlights.total_funding_amount", "total_funding", "funding_total", "total_funding_amount");
      const last = [
        pickText(rec, "financials_highlights.last_funding_type", "last_funding_type", "last_funding_round_type"),
        pickText(rec, "financials_highlights.last_funding_date", "last_funding_at", "last_funding_date"),
      ]
        .filter(Boolean)
        .join(" · ");
      const rounds = pickNumber(rec, "financials_highlights.num_funding_rounds", "num_funding_rounds", "funding_rounds.num_funding_rounds");
      return [
        ...fact("Total funding", total),
        ...fact("Last round", last || null),
        ...fact("Funding rounds", rounds != null ? countText(rounds) : null),
        ...fact("Employees", pickText(rec, "num_employees")),
        ...fact("Industry", pickList(rec, "industries").slice(0, 3).join(", ") || null),
        ...fact("Founded", pickText(rec, "founded_date")),
        ...fact("Status", pickText(rec, "operating_status")),
      ];
    }
    case "glassdoor_company": {
      const rating = pickNumber(rec, "ratings_overall", "rating", "overall_rating");
      const reviews = pickNumber(rec, "reviews_count", "review_count", "ratings_count", "total_reviews");
      return [
        ...fact("Rating", rating != null ? `${rating.toFixed(1)} / 5` : null),
        ...fact("Reviews", reviews != null ? countText(reviews) : null),
        ...fact("Size", pickText(rec, "details_size")),
        ...fact("Industry", pickText(rec, "details_industry")),
        ...fact("Headquarters", pickText(rec, "details_headquarters")),
        ...fact("Founded", pickText(rec, "details_founded")),
      ];
    }
    case "google_maps_place": {
      const rating = pickNumber(rec, "rating");
      const reviews = pickNumber(rec, "reviews_count", "review_count");
      return [
        ...fact("Rating", rating != null ? `${rating.toFixed(1)} / 5` : null),
        ...fact("Reviews", reviews != null ? countText(reviews) : null),
        ...fact("Address", pickText(rec, "address")),
        ...fact("Hours", hoursSummary(rec)),
        ...fact("Phone", pickText(rec, "phone_number", "phone")),
        ...fact("Category", pickText(rec, "category")),
      ];
    }
    default:
      return [];
  }
}

/** Read the stored block back off a party's attributes (tolerant of anything else in there). */
export function storedIntel(attributes: unknown): Partial<Record<string, StoredIntel>> {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return {};
  const block = (attributes as Record<string, unknown>).company_intelligence;
  if (!block || typeof block !== "object" || Array.isArray(block)) return {};
  const out: Partial<Record<string, StoredIntel>> = {};
  for (const [key, v] of Object.entries(block as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    if (!Array.isArray(o.facts)) continue;
    out[key] = {
      fetched_at: typeof o.fetched_at === "string" ? o.fetched_at : "",
      source_url: typeof o.source_url === "string" ? o.source_url : "",
      job_id: typeof o.job_id === "string" ? o.job_id : "",
      table_id: typeof o.table_id === "string" ? o.table_id : "",
      facts: o.facts.filter(
        (f): f is IntelFact => !!f && typeof (f as IntelFact).label === "string" && typeof (f as IntelFact).value === "string",
      ),
    };
  }
  return out;
}

/** attributes with one source's block replaced (everything else in attributes is kept). */
export function withIntel(attributes: unknown, sourceKey: string, intel: StoredIntel): Record<string, unknown> {
  const base = attributes && typeof attributes === "object" && !Array.isArray(attributes) ? (attributes as Record<string, unknown>) : {};
  const prior = base.company_intelligence && typeof base.company_intelligence === "object" ? (base.company_intelligence as Record<string, unknown>) : {};
  return { ...base, company_intelligence: { ...prior, [sourceKey]: intel } };
}

import type { BusinessFact, BusinessLocation, LocationListing } from "@/features/marketing/types";
import { isJsonRecord } from "@/features/marketing/types";
import { pickNumber, pickText, type DataRecord } from "@/features/data-sources/records";

/**
 * WS1 — profile autofill (PLAN.md): a location's canonical profile populates
 * itself from data the platform already holds. Manual typing is the fallback,
 * never the flow. Pure functions; the human applies suggestions, we never
 * silently overwrite a field they filled.
 *
 * Source precedence per field: google (structured, live-extracted) →
 * site (crawled JSON-LD the business itself published) → facts (confirmed
 * brand facts, may be unstructured).
 */

export type AutofillField =
  | "street_address"
  | "locality"
  | "region"
  | "postal_code"
  | "country_code"
  | "phone"
  | "email"
  | "website_url"
  | "business_type"
  | "description";

export type AutofillSource = "google" | "site" | "facts";

export const AUTOFILL_SOURCE_LABELS: Record<AutofillSource, string> = {
  google: "live Google listing",
  site: "your website's structured data",
  facts: "confirmed brand facts",
};

export interface ProfileSuggestion {
  field: AutofillField;
  value: string;
  source: AutofillSource;
}

const FIELDS: AutofillField[] = [
  "street_address",
  "locality",
  "region",
  "postal_code",
  "country_code",
  "phone",
  "email",
  "website_url",
  "business_type",
  "description",
];

function textAt(record: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Flatten the highest-signal observed payload from the location's listings (google first). */
export function observedFromListings(listings: LocationListing[]): Record<string, unknown> | null {
  const scored = listings
    .filter((listing) => isJsonRecord(listing.observed) && Object.keys(listing.observed).length > 0)
    .sort((a, b) => {
      const aScore = a.source === "dataforseo" ? 0 : 1;
      const bScore = b.source === "dataforseo" ? 0 : 1;
      return aScore - bScore;
    });
  return scored.length > 0 ? (scored[0].observed as Record<string, unknown>) : null;
}

/** Brand business facts → flat field candidates ({text}/{url} payloads, per factValuePayload). */
export function fieldsFromBusinessFacts(facts: BusinessFact[]): Record<string, string> {
  const out: Record<string, string> = {};
  const factText = (fact: BusinessFact): string | null => {
    if (!isJsonRecord(fact.value)) return null;
    return textAt(fact.value as Record<string, unknown>, "text") ?? textAt(fact.value as Record<string, unknown>, "url");
  };
  for (const fact of facts) {
    const value = factText(fact);
    if (!value) continue;
    if (fact.kind === "phone" && !out.phone) out.phone = value;
    if (fact.kind === "email" && !out.email) out.email = value;
    // A brand address fact is one unstructured string — offered for the street
    // field so a human confirms; structured sources outrank it.
    if (fact.kind === "address" && !out.street_address) out.street_address = value;
  }
  return out;
}

/**
 * Suggestions for every EMPTY profile field, best source first. Filled fields
 * are never suggested against — the human's data always outranks machines.
 */
export function buildProfileSuggestions(
  location: BusinessLocation,
  sources: {
    googleObserved?: Record<string, unknown> | null;
    siteObserved?: Record<string, string> | null;
    facts?: BusinessFact[];
  },
): ProfileSuggestion[] {
  const factFields = fieldsFromBusinessFacts(sources.facts ?? []);
  const suggestions: ProfileSuggestion[] = [];
  for (const field of FIELDS) {
    const current = location[field];
    if (typeof current === "string" && current.trim() !== "") continue;
    const google = textAt(sources.googleObserved ?? null, field);
    const site = sources.siteObserved ? (sources.siteObserved[field]?.trim() || null) : null;
    const fact = factFields[field] ?? null;
    const pick: [string, AutofillSource] | null = google
      ? [google, "google"]
      : site
        ? [site, "site"]
        : fact
          ? [fact, "facts"]
          : null;
    if (pick) suggestions.push({ field, value: pick[0], source: pick[1] });
  }
  return suggestions;
}

// ---------------------------------------------------------------------------
// "Fill from Google Maps": one live place record -> the same observed shape the
// google source already uses, so the existing suggestion chips take it from there.
// ---------------------------------------------------------------------------

const COUNTRY_CODES: Record<string, string> = {
  "united states": "US",
  usa: "US",
  us: "US",
  canada: "CA",
  "united kingdom": "GB",
  uk: "GB",
  australia: "AU",
};

export interface ParsedAddress {
  street_address?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
}

/** "123 Main St, Austin, TX 78701, United States" -> parts. Anything unrecognised stays in street_address. */
export function parsePlaceAddress(address: string, countryHint?: string | null): ParsedAddress {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  const out: ParsedAddress = {};
  const last = parts[parts.length - 1].toLowerCase();
  if (COUNTRY_CODES[last]) {
    out.country_code = COUNTRY_CODES[last];
    parts.pop();
  } else if (countryHint && /^[A-Za-z]{2}$/.test(countryHint.trim())) {
    out.country_code = countryHint.trim().toUpperCase();
  }
  const stateZip = parts.length > 1 ? /^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(parts[parts.length - 1]) : null;
  if (stateZip) {
    out.region = stateZip[1].toUpperCase();
    out.postal_code = stateZip[2];
    parts.pop();
    if (!out.country_code) out.country_code = "US";
  }
  if (parts.length >= 3) {
    out.locality = parts[parts.length - 1];
    out.street_address = parts.slice(0, -1).join(", ");
  } else if (parts.length === 2) {
    out.street_address = parts[0];
    out.locality = parts[1];
  } else {
    out.street_address = parts[0];
  }
  return out;
}

/** The place record's fields, keyed by the profile fields the autofill fills (only non-empty ones). */
export function observedFromPlaceRecord(record: DataRecord): Record<string, string> {
  const out: Record<string, string> = {};
  const address = pickText(record, "address", "formatted_address", "full_address");
  if (address) Object.assign(out, parsePlaceAddress(address, pickText(record, "country", "country_code")));
  const phone = pickText(record, "phone_number", "phone");
  if (phone) out.phone = phone;
  const website = pickText(record, "open_website", "website", "web_site");
  if (website) out.website_url = website;
  const category = pickText(record, "category");
  if (category) out.business_type = category;
  const description = pickText(record, "description");
  if (description) out.description = description;
  return out;
}

/** The place's rating line for the confirmation ("4.6 from 1,203 reviews"), or null. */
export function placeRatingWords(record: DataRecord): string | null {
  const rating = pickNumber(record, "rating");
  const reviews = pickNumber(record, "reviews_count", "review_count");
  if (rating == null) return null;
  return reviews != null ? `${rating.toFixed(1)} from ${Math.round(reviews).toLocaleString("en-US")} reviews` : rating.toFixed(1);
}

/** A link or a bare place id as the address the Maps source reads; null when it is neither. */
export function placeLookupUrl(input: string): string | null {
  const text = input.trim();
  if (/^ChIJ[\w-]{10,}$/.test(text)) return `https://www.google.com/maps/place/?q=place_id:${text}`;
  try {
    const u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return /(^|\.)google\.[a-z.]+$/.test(u.hostname.replace(/^www\./, "")) && u.pathname.startsWith("/maps/place") ? u.toString() : null;
  } catch {
    return null;
  }
}

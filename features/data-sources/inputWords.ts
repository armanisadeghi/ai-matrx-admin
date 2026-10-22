/**
 * Plain words for a source's input fields — the ONE place a technical field name ("keyword", "cid",
 * "place_id", "country") becomes what a person reads: a question or a plain noun, an example, and
 * whether it belongs behind "More options". Every source's form (the library panel, the board's Get
 * data tile) goes through `plainField`; a field this file does not know keeps the catalog's own label.
 */

import type { DataSourceField } from "./contract";

export interface PlainField {
  label: string;
  /** A hint for the empty box (never a value that is sent). */
  placeholder: string | null;
  /** `country`: a picker of countries instead of a free box. */
  picker: "country" | null;
  /** Technical and rarely needed: shown behind "Advanced". */
  advanced: boolean;
  /** A short fixed list the provider accepts (value sent, label read): a picker, never a free box. */
  choices: { value: string; label: string }[] | null;
}

type Words = { label: string; example?: string; picker?: "country"; advanced?: boolean; choices?: { value: string; label: string }[] };

const norm = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const FIELD_WORDS: Record<string, Words> = {
  keyword: { label: "What are you looking for?", example: "dentist in Irvine" },
  keywords: { label: "What are you looking for?", example: "dentist in Irvine" },
  keywordsearch: { label: "What are you looking for?", example: "dentist in Irvine" },
  query: { label: "What are you looking for?", example: "dentist in Irvine" },
  search: { label: "What are you looking for?", example: "dentist in Irvine" },
  searchterm: { label: "What are you looking for?", example: "dentist in Irvine" },
  q: { label: "What are you looking for?", example: "dentist in Irvine" },
  country: { label: "Country", picker: "country" },
  countrycode: { label: "Country", picker: "country" },
  location: { label: "Where", example: "Irvine, California" },
  city: { label: "City", example: "Irvine" },
  state: { label: "State", example: "California" },
  region: { label: "Region" },
  zip: { label: "ZIP code" },
  zipcode: { label: "ZIP code" },
  postalcode: { label: "Postal code" },
  language: { label: "Language", example: "English" },
  lang: { label: "Language", example: "English" },
  url: { label: "Page address", example: "https://" },
  link: { label: "Page address", example: "https://" },
  domain: { label: "Website", example: "example.com" },
  cid: { label: "Place number", advanced: true },
  placeid: { label: "Place ID", advanced: true },
  placeids: { label: "Place ID", advanced: true },
  startdate: { label: "From date" },
  enddate: { label: "To date" },
  sku: { label: "Product code" },
  asin: { label: "Product code" },
  searchkeyword: { label: "What are you looking for?", example: "coffee grinder" },
  username: { label: "Account", example: "@nasa" },
  propertytype: { label: "What kind", example: "flat" },
  category: { label: "What kind", example: "plumbers" },
  // Zillow's own values (Bright Data input_filters; confirmed live 2026-10-22).
  listingcategory: {
    label: "For sale or rent",
    choices: [
      { value: "House for sale", label: "For sale" },
      { value: "House for rent", label: "For rent" },
      { value: "Sold", label: "Sold" },
    ],
  },
  hometype: {
    label: "Home type",
    choices: [
      { value: "Houses", label: "Houses" },
      { value: "Townhomes", label: "Townhomes" },
      { value: "Condos", label: "Condos" },
      { value: "Apartments", label: "Apartments" },
    ],
  },
  // A page address inside a search option (a category, a search-results page): Advanced only.
  categoryurl: { label: "Category page address", advanced: true },
  searchurl: { label: "Search page address", advanced: true },
  bestsellersurl: { label: "Best sellers page address", advanced: true },
};

/** What one source's field means in plain words, when the general meaning would mislead ("Company or role"). */
const SOURCE_FIELD_WORDS: Record<string, Record<string, Words>> = {
  linkedin_jobs_search: { keyword: { label: "Company or role", example: "Stripe" } },
  indeed_jobs: { keywordsearch: { label: "Company or role", example: "Stripe" } },
  glassdoor_jobs_search: { keyword: { label: "Company or role", example: "Stripe" } },
  crunchbase_company: { keyword: { label: "Company name", example: "OpenAI" } },
  yahoo_finance_companies: { keyword: { label: "Company or ticker", example: "AAPL" } },
  youtube_channels: { keyword: { label: "Channel name", example: "NASA" } },
  amazon_product: { keyword: { label: "Product name", example: "Stanley tumbler" } },
  amazon_product_search: { keyword: { label: "Product name", example: "Stanley tumbler" } },
  walmart_product: { keyword: { label: "Product name", example: "Stanley tumbler" } },
  walmart_product_search: { keyword: { label: "Product name", example: "Stanley tumbler" } },
  google_shopping: { keyword: { label: "Product name", example: "Stanley tumbler" } },
  google_shopping_search: { keyword: { label: "Product name", example: "Stanley tumbler" } },
  facebook_marketplace_search: { keyword: { label: "What are you looking for?", example: "standing desk" }, city: { label: "Where", example: "Austin" } },
  zillow_listing: { location: { label: "Where", example: "Austin, TX" } },
};

/** A catalog label that is only the raw name ("keyword_search", "place_id") is no label at all. */
const looksTechnical = (label: string, name: string) => !label.trim() || /[_]/.test(label) || label.trim().toLowerCase() === name.toLowerCase();

export function plainField(f: DataSourceField, sourceKey?: string | null): PlainField {
  const known = (sourceKey ? SOURCE_FIELD_WORDS[sourceKey]?.[norm(f.name)] : undefined) ?? FIELD_WORDS[norm(f.name)];
  if (known) {
    const example = known.example ?? f.example ?? null;
    const placeholder = example && !known.picker && !known.choices ? (/^https?:\/\//.test(example) ? example : `e.g. ${example}`) : null;
    return { label: known.label, placeholder, picker: known.picker ?? null, advanced: known.advanced === true, choices: known.choices ?? null };
  }
  const label = looksTechnical(f.label, f.name) ? fieldLabelOf(f.name) : f.label;
  return { label, placeholder: f.example ?? null, picker: null, advanced: /url$/i.test(f.name), choices: null };
}

function fieldLabelOf(name: string): string {
  const words = name.replace(/[_.-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

/**
 * A way of asking ("search option") in plain words; `advanced` ones (ids, page addresses) sit behind
 * "Advanced". The provider's option names ("input_filters", "search_url") never reach a person.
 */
export function plainOption(name: string): { label: string; advanced: boolean } {
  const n = norm(name);
  if (n === "cid") return { label: "By place number", advanced: true };
  if (n === "placeid" || n === "placeids") return { label: "By place ID", advanced: true };
  if (n === "location" || n === "locations") return { label: "By place", advanced: false };
  if (n === "keyword" || n === "keywords" || n === "query" || n === "search") return { label: "By keyword", advanced: false };
  if (n === "inputfilters" || n === "searchfilters" || n === "filters") return { label: "By place", advanced: false };
  if (n === "username" || n === "usernames") return { label: "By account", advanced: false };
  if (n === "url" || n === "urls" || /url$/.test(n)) return { label: n.startsWith("bestseller") ? "By best sellers page" : n.startsWith("category") ? "By category page" : "By page address", advanced: true };
  if (n === "upc" || n === "sku") return { label: "By product code", advanced: true };
  return { label: `By ${fieldLabelOf(name).toLowerCase()}`, advanced: /(^|_)(id|ids|cid)$/i.test(name) };
}

/** ISO country codes the picker offers; names come from the browser (`Intl.DisplayNames`). */
const COUNTRY_CODES = (
  "US CA GB AU NZ IE DE FR ES IT NL BE CH AT SE NO DK FI PT PL CZ GR RO HU BG HR RS UA TR IL AE SA EG ZA NG KE MA IN PK BD LK NP CN JP KR TW HK SG MY TH VN ID PH MX BR AR CL CO PE UY EC VE CR PA DO PR RU KZ"
).split(" ");

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Country codes, A-Z by name, the organization's / the browser's own first. */
export function countryOptions(home: string): string[] {
  const rest = COUNTRY_CODES.filter((c) => c !== home).sort((a, b) => countryName(a).localeCompare(countryName(b)));
  return [home, ...rest];
}

/** The country a form starts on: the organization's when known, else the browser's region, else US. */
export function defaultCountry(organizationCountry?: string | null): string {
  const given = organizationCountry?.trim().toUpperCase();
  if (given && COUNTRY_CODES.includes(given)) return given;
  const region = typeof navigator !== "undefined" ? /-([A-Za-z]{2})\b/.exec(navigator.language || "")?.[1]?.toUpperCase() : null;
  return region && COUNTRY_CODES.includes(region) ? region : "US";
}

/** "Trustpilot reviews" → "reviews"; a name that is not a plural noun → "records". */
export function recordNoun(label: string): string {
  const last = label.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
  return /^[a-z]{3,}s$/.test(last) && !/ss$/.test(last) ? last : "records";
}

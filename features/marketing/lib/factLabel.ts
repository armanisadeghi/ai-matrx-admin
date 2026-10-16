/**
 * A fact's sub-label (pure). Nothing is "other": a catch-all field label ("Other Listing", "Other Profile") never
 * reaches the screen — a listing names its platform from the URL (MapQuest, Superpages, newmexico.org).
 * Server twin: aidream `services/brand_profile/promote.py` `fact_label` (the late-findings writer).
 */

/** Listing sites we name by hand; every other host reads as its registrable domain. */
const SITE_NAMES: Record<string, string> = {
  yelp: "Yelp",
  bbb: "BBB",
  trustpilot: "Trustpilot",
  glassdoor: "Glassdoor",
  indeed: "Indeed",
  healthgrades: "Healthgrades",
  zocdoc: "Zocdoc",
  vitals: "Vitals",
  tripadvisor: "Tripadvisor",
  yellowpages: "Yellow Pages",
  superpages: "Superpages",
  crunchbase: "Crunchbase",
  angi: "Angi",
  houzz: "Houzz",
  opentable: "OpenTable",
  nextdoor: "Nextdoor",
  foursquare: "Foursquare",
  mapquest: "MapQuest",
  manta: "Manta",
  chamberofcommerce: "Chamber of Commerce",
  thumbtack: "Thumbtack",
  facebook: "Facebook",
  google: "Google",
  apple: "Apple Maps",
  bing: "Bing Places",
  linkedin: "LinkedIn",
  amazon: "Amazon",
  etsy: "Etsy",
};

const GENERIC = /^(other|misc|miscellaneous)\b/i;

/** The registrable domain of a URL (`albuquerque.kidsoutandabout.com` → `kidsoutandabout.com`), or null. */
function registrableDomain(url: string): string | null {
  let host: string;
  try {
    host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null;
  }
  const parts = host.replace(/^www\./, "").split(".").filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  const second = parts[parts.length - 2];
  const tld2 = parts.length > 2 && last.length === 2 && second.length <= 3;
  return parts.slice(tld2 ? -3 : -2).join(".");
}

/** The platform behind a listing URL: a known site's name, else its registrable domain, else null. */
export function listingSiteName(url: string): string | null {
  const domain = registrableDomain(url);
  if (!domain) return null;
  const name = domain.split(".")[0];
  return SITE_NAMES[name] ?? domain;
}

/** True when a label is a catch-all ("Other Listing") that says nothing about the row. */
export function isGenericFactLabel(label: string | null | undefined): boolean {
  return GENERIC.test((label ?? "").trim());
}

/** The label to show (and store) for a fact: a catch-all label becomes the URL's platform; otherwise unchanged. */
export function factDisplayLabel(label: string | null | undefined, value: string | null | undefined): string {
  const clean = (label ?? "").trim();
  if (!isGenericFactLabel(clean)) return clean;
  const site = value && /^(https?:\/\/)?[^\s/]+\.[^\s/]+/i.test(value.trim()) ? listingSiteName(value.trim()) : null;
  return site ?? clean.replace(GENERIC, "").trim();
}

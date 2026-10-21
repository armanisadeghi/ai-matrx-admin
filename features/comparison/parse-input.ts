/**
 * The one friendly box: whatever a person types or pastes becomes a list of items. Pure.
 *
 *   "Hydro Flask vs Yeti vs Stanley"         → three companies by name
 *   "hydroflask.com, yeti.com"               → two companies by website
 *   one link per line (any review / map link) → those exact pages
 *   "Sparrow Bakery, Bend OR vs Looney Bean in Bend, OR" → two local businesses with their cities
 *
 * A link decides its own kind (a map link is a local business, a review page is a company); with
 * no links, the person's chosen tab decides. Coming kinds are suggested too — the page shows them
 * as "Soon", never hides them.
 */

import type { ComparisonItemInput } from "./contract";

export type KindKey = "companies_reviews" | "local_business" | "products" | "social_accounts" | "list_items";

/** Kinds whose rows are a name with an optional city ("Name in City"). */
const NAMED_WITH_PLACE = (kind: KindKey): boolean => kind === "local_business" || kind === "list_items";

export interface ParsedItem {
  /** What the person typed for this item, trimmed — shown on its chip. */
  text: string;
  input: ComparisonItemInput;
}

export interface ParsedInput {
  items: ParsedItem[];
  /** The kind the links point to, when every link agrees; `null` = no links (the tab decides). */
  suggestedKind: KindKey | null;
  /**
   * A city typed on the LAST item only ("A vs B, Nashville TN"), which applies to every item that
   * names none of its own. The page shows it in the Near box so the person can edit it. "" = none.
   */
  sharedArea: string;
}

export const MAX_ITEMS = 20;

const URL_RE = /^(https?:\/\/|www\.)\S+$/i;
const DOMAIN_RE = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)+(\/\S*)?$/i;
/** Separators that always split: new lines, "vs", "versus", semicolons, pipes. */
const HARD_SPLIT = /\r?\n|;|\|| +(?:vs\.?|versus|v\.) +/i;

export function isLink(text: string): boolean {
  return URL_RE.test(text.trim());
}

export function isDomain(text: string): boolean {
  const t = text.trim();
  return !t.includes(" ") && DOMAIN_RE.test(t);
}

function hostOf(link: string): string {
  try {
    return new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** The kind a single link points to (`null` = a plain website, which a company lookup handles). */
export function kindOfLink(link: string): KindKey | null {
  const host = hostOf(link);
  const path = (() => {
    try {
      return new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`).pathname;
    } catch {
      return "";
    }
  })();
  if (host.includes("trustpilot.")) return "companies_reviews";
  if ((host.includes("google.") && path.startsWith("/maps")) || host === "maps.app.goo.gl" || host.startsWith("maps.google.")) {
    return "local_business";
  }
  if (host.includes("amazon.") || host.includes("walmart.") || host.includes("etsy.")) return "products";
  if (/(^|\.)(instagram|tiktok|x|twitter|facebook|youtube|linkedin|threads)\.(com|net)$/.test(host)) return "social_accounts";
  return null;
}

/** "Sparrow Bakery, Bend OR" / "Sparrow Bakery in Bend, OR" → name + city. */
export function splitNameAndPlace(text: string): { name: string; city: string } {
  const t = text.trim();
  const inAt = t.match(/^(.+?)\s+(?:in|near|at)\s+(.+)$/i);
  if (inAt) return { name: inAt[1].trim(), city: inAt[2].trim() };
  const comma = t.indexOf(",");
  if (comma > 0) return { name: t.slice(0, comma).trim(), city: t.slice(comma + 1).trim() };
  return { name: t, city: "" };
}

function segments(text: string, kind: KindKey): string[] {
  const hard = text.split(HARD_SPLIT)
    .map((s) => s.trim().replace(/^(?:vs\.?|versus)(?:\s+|$)/i, "").replace(/\s+(?:vs\.?|versus)$/i, "").trim())
    .filter(Boolean);
  if (hard.length > 1) return hard;
  const one = hard[0] ?? "";
  // A single line of commas: a list of companies; for places, "Name, City" is one item unless
  // there are 3+ parts ("A, B, C" is a list).
  if (one.includes(",")) {
    const parts = one.split(",").map((s) => s.trim()).filter(Boolean);
    if (!NAMED_WITH_PLACE(kind) || parts.length >= 3) return parts;
  }
  // "A and B" is a list for names (never inside a link); for places only with a trailing
  // "in/near/at City" ("A and B in Nashville TN").
  if (!isLink(one) && / and /i.test(one) &&
      (kind === "companies_reviews" || (NAMED_WITH_PLACE(kind) && / (?:in|near|at) \S/i.test(one)))) {
    return one.split(/ and /i).map((s) => s.trim()).filter(Boolean);
  }
  return one ? [one] : [];
}

/** "Prince's Hot Chicken Shack, Nashville TN" → "Prince's Hot Chicken Shack". */
function stripPlace(text: string): string {
  return isLink(text) ? text : splitNameAndPlace(text).name;
}

function itemFor(text: string, kind: KindKey, area: string): ComparisonItemInput {
  if (isLink(text)) {
    const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    return { url };
  }
  if (NAMED_WITH_PLACE(kind)) {
    const { name, city } = splitNameAndPlace(text);
    const where = city || area.trim();
    return { label: name, inputs: { name, ...(where ? { city: where } : {}), country: "US" } };
  }
  return { label: text };
}

/**
 * The shared city of a places list: the LAST item names one and no other item does. Only then does
 * it read as "these are all there" rather than each item's own city.
 */
function sharedAreaOf(parts: string[], kind: KindKey): string {
  if (!NAMED_WITH_PLACE(kind) || parts.length < 2) return "";
  const named = parts.map((p) => (isLink(p) ? "" : splitNameAndPlace(p).city));
  const last = named[named.length - 1];
  return last && named.slice(0, -1).every((c) => !c) ? last : "";
}

/**
 * Parse the box. `kind` is the chosen tab; `area` is the shared "near" box for local businesses
 * (used for any item that names no city of its own).
 */
export function parseInput(text: string, kind: KindKey, area = ""): ParsedInput {
  const parts = segments(text, kind);
  const linkKinds = new Set(parts.filter(isLink).map(kindOfLink).filter((k): k is KindKey => k !== null));
  const suggestedKind = linkKinds.size === 1 ? [...linkKinds][0] : null;
  const effective = suggestedKind ?? kind;
  const sharedArea = sharedAreaOf(parts, effective);
  // The Near box (visible, editable) wins; the typed trailing city fills in when it is empty.
  const where = sharedArea ? (area.trim() || sharedArea) : area;
  const seen = new Set<string>();
  const items: ParsedItem[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ text: p, input: itemFor(sharedArea ? stripPlace(p) : p, effective, where) });
    if (items.length >= MAX_ITEMS) break;
  }
  return { items, suggestedKind, sharedArea };
}

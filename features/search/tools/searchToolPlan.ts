/**
 * The search page's catalog tabs (third-party services lane L12d). Pure.
 *
 * Three tabs on the one search page run catalog Tools through `/tools/calls` instead of a search
 * door of their own: Deep (web search across the routed sources), Reviews (a place, a business, an
 * app) and AI answers (how a brand shows up when an AI assistant is asked). A tab names WHAT the
 * person wants; the Tool behind it is named by its job, and a job may be served by two Tools while
 * the catalog is still filling in (the first live one answers). Never a vendor name here (R-1):
 * "Google Maps", "Trustpilot", "App Store" and "Google Play" name where the reviews live, which is
 * what the person is choosing.
 */

import { classifyText, siteOf } from "@ai-matrx/chat/mandates/invoke/smart-box";

export type ToolTab = "deep" | "reviews" | "answers";

export const TOOL_TABS: readonly ToolTab[] = ["deep", "reviews", "answers"];

export const TOOL_TAB_LABEL: Record<ToolTab, string> = {
  deep: "Deep",
  reviews: "Reviews",
  answers: "AI answers",
};

export function isToolTab(value: unknown): value is ToolTab {
  return typeof value === "string" && (TOOL_TABS as readonly string[]).includes(value);
}

export interface ToolLane {
  id: string;
  /** Where the answer comes from, in the words a person picks it by. */
  label: string;
  /** Catalog job keys that do this job, best first. The first LIVE one answers. */
  jobKeys: readonly string[];
}

export const TOOL_LANES: Record<ToolTab, readonly ToolLane[]> = {
  deep: [{ id: "web", label: "Web", jobKeys: ["web_search_results"] }],
  reviews: [
    { id: "maps", label: "Google Maps", jobKeys: ["place_reviews"] },
    { id: "trustpilot", label: "Trustpilot", jobKeys: ["customer_reviews", "data_trustpilot_reviews"] },
    { id: "appstore", label: "App Store", jobKeys: ["app_store_reviews", "data_app_store_reviews"] },
    { id: "play", label: "Google Play", jobKeys: ["play_store_reviews", "data_google_play_reviews"] },
  ],
  answers: [{ id: "ai", label: "AI answers", jobKeys: ["ai_visibility_mentions"] }],
};

export function laneOf(tab: ToolTab, laneId: string | null | undefined): ToolLane {
  const lanes = TOOL_LANES[tab];
  return lanes.find((l) => l.id === laneId) ?? (lanes[0] as ToolLane);
}

/** Which review lane a pasted link belongs to, or null when the text names none. */
export function detectReviewLane(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/(^|[/.])(apps|itunes)\.apple\.com\b/.test(t)) return "appstore";
  if (/\bplay\.google\.com\b/.test(t)) return "play";
  if (/\bmaps\.app\.goo\.gl\b|\bgoo\.gl\/maps\b|\bgoogle\.[a-z.]+\/maps\b/.test(t)) return "maps";
  if (/\btrustpilot\.com\b/.test(t)) return "trustpilot";
  return null;
}

/** The website a Trustpilot page or a bare address names ("www.example.com"), or "". */
function trustpilotDomain(text: string): string {
  const t = text.trim();
  const page = /trustpilot\.com\/review\/([^/?#\s]+)/i.exec(t);
  if (page?.[1]) return page[1];
  const found = classifyText(t, { anyEnding: true });
  if (found?.type === "domain") return found.value.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (found?.type === "url") return siteOf(found.value);
  return t;
}

/**
 * What one input must hold for the Tool that will answer, given what the person typed or pasted.
 * Pasting the app's store link into an "App number" box, or a Trustpilot page into a "Website" box,
 * has one obvious answer; anything else is sent as typed (validation offers, never blocks).
 */
export function adaptInput(jobKey: string, inputName: string, value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (jobKey === "app_store_reviews" && inputName === "product_id") {
    const id = /\/id(\d+)/.exec(v) ?? /^(?:id)?(\d{6,})$/i.exec(v);
    return id?.[1] ?? v;
  }
  if (jobKey === "data_app_store_reviews" && inputName === "url" && /^\d{6,}$/.test(v)) {
    return `https://apps.apple.com/us/app/id${v}`;
  }
  if (jobKey === "play_store_reviews" && inputName === "product_id") return /[?&]id=([\w.]+)/.exec(v)?.[1] ?? v;
  if (jobKey === "data_google_play_reviews" && inputName === "url" && /^[a-z][\w]*(\.[\w]+)+$/i.test(v)) {
    return `https://play.google.com/store/apps/details?id=${v}`;
  }
  if (jobKey === "place_reviews" && inputName === "place" && !/^https?:\/\//i.test(v) && detectReviewLane(v) === "maps") {
    return `https://${v}`;
  }
  if (jobKey === "customer_reviews" && inputName === "domain") return trustpilotDomain(v);
  if (jobKey === "data_trustpilot_reviews" && inputName === "url" && !/trustpilot\.com/i.test(v)) {
    const domain = trustpilotDomain(v);
    return domain ? `https://www.trustpilot.com/review/${domain}` : v;
  }
  return v;
}

/** `adaptInput` over a whole values object (every string input; the rest pass through). */
export function adaptInputs(jobKey: string, values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values)) {
    out[name] = typeof value === "string" ? adaptInput(jobKey, name, value) : value;
  }
  return out;
}

// ── Finding the thing by name ────────────────────────────────────────────────

/** One thing a name could mean: pick it and what the Tool needs fills in (the box keeps showing the name). */
export interface FindCandidate {
  /** What it is called, cleaned of the site's own suffix ("Gumroad"). */
  label: string;
  /** Where it lives or sits, as the person knows it ("App Store", "Austin, TX"). */
  caption: string;
  /** What the Tool is given: the page's link, or the place's id. */
  value: string;
}

interface Finder {
  /** `web`: the free Matrx web search looks for the page. `places`: the places search looks for the business. */
  source: "web" | "places";
  /** What is searched for. */
  query: (words: string) => string;
  /** A result address that IS one of these things (a page, not a listing of pages). */
  accepts: RegExp;
  site: string;
  /** Drops the site's own suffix from a page title. */
  clean: (title: string) => string;
}

const FINDERS: Record<string, Finder> = {
  maps: {
    source: "places",
    query: (w) => w,
    accepts: /^$/,
    site: "Google Maps",
    clean: (t) => t.trim(),
  },
  appstore: {
    source: "web",
    query: (w) => `${w} app site:apps.apple.com`,
    accepts: /^https?:\/\/apps\.apple\.com\/[^?#]*\/id\d+/i,
    site: "App Store",
    clean: (t) => t.replace(/\s+on the app store\s*$/i, "").replace(/\s+[-–—]\s+apps on.*$/i, "").trim(),
  },
  play: {
    source: "web",
    query: (w) => `${w} app site:play.google.com`,
    accepts: /^https?:\/\/play\.google\.com\/store\/apps\/details\?id=/i,
    site: "Google Play",
    clean: (t) => t.replace(/\s+[-–—]\s+apps on google play\s*$/i, "").replace(/\s+[-–—]\s+google play\s*$/i, "").trim(),
  },
  trustpilot: {
    source: "web",
    query: (w) => `${w} reviews site:trustpilot.com`,
    accepts: /^https?:\/\/[a-z]+\.trustpilot\.com\/review\/[^/?#]+\/?$/i,
    site: "Trustpilot",
    clean: (t) => t.replace(/\s+reviews?\s*[|:-].*$/i, "").replace(/\s*\|\s*trustpilot.*$/i, "").trim(),
  },
};

/** Lanes a name can be looked up for (the rest need a link, or are already a website). */
export function laneCanFind(laneId: string): boolean {
  return laneId in FINDERS;
}

/**
 * True when the box holds words that name a thing rather than a link or an id the Tool can take:
 * the person gets choices to pick from instead of an error.
 */
export function needsFinder(laneId: string, text: string): boolean {
  const t = text.trim();
  if (!t || !laneCanFind(laneId)) return false;
  // A link (even without its https://), an app number, or the `id…` the store prints: nothing to look for.
  if (/^https?:\/\//i.test(t) || /^(id)?\d{6,}$/i.test(t) || detectReviewLane(t)) return false;
  if (laneId === "maps") return !(/^ChIJ[\w-]{10,}$/.test(t) || /^\d{12,}$/.test(t));
  if (laneId === "trustpilot") {
    const kind = classifyText(t, { anyEnding: true })?.type;
    return kind !== "domain" && kind !== "url";
  }
  if (laneId === "play") return !/^[a-z][\w]*(\.[\w]+)+$/i.test(t);
  return true;
}

export function finderQuery(laneId: string, words: string): string | null {
  const finder = FINDERS[laneId];
  return finder ? finder.query(words.trim()) : null;
}

/** Where a lane's name is looked up. */
export function finderSource(laneId: string): "web" | "places" | null {
  return FINDERS[laneId]?.source ?? null;
}

/** The few results that are exactly the thing asked for, each once, best first. */
export function pickCandidates(laneId: string, results: readonly { title?: string | null; url?: string | null }[], max = 4): FindCandidate[] {
  const finder = FINDERS[laneId];
  if (!finder) return [];
  const seen = new Set<string>();
  const out: FindCandidate[] = [];
  for (const r of results) {
    const url = (r.url ?? "").trim();
    if (!url || !finder.accepts.test(url)) continue;
    const key = url.replace(/[?#].*$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const label = finder.clean((r.title ?? "").trim()) || siteOf(url);
    out.push({ label, caption: finder.site, value: url });
    if (out.length >= max) break;
  }
  return out;
}

/** A places search answer → the businesses Google knows (each with the id the reviews Tool takes). */
export function pickPlaces(places: readonly Record<string, unknown>[], max = 5): FindCandidate[] {
  const out: FindCandidate[] = [];
  const seen = new Set<string>();
  for (const place of places) {
    const id = typeof place.place_id === "string" ? place.place_id : "";
    const name = typeof place.name === "string" ? place.name.trim() : "";
    // Google's own handle for a place: its place id (ChIJ…) or its cid (the long number) — the reviews Tool takes either.
    if (!id || !name || seen.has(id) || !(/^ChIJ/.test(id) || /^\d{8,}$/.test(id))) continue;
    seen.add(id);
    const address = place.address;
    const display =
      address && typeof address === "object" && typeof (address as Record<string, unknown>).display === "string"
        ? ((address as Record<string, unknown>).display as string)
        : "";
    // Where it is, else what it is and how it is rated: enough to tell two places of one name apart.
    const rating = place.rating && typeof place.rating === "object" ? (place.rating as Record<string, unknown>) : null;
    const stars = rating && typeof rating.value === "number" ? `${rating.value.toFixed(1)}★${typeof rating.count === "number" ? ` (${rating.count})` : ""}` : "";
    const category = Array.isArray(place.categories) && typeof place.categories[0] === "string" ? place.categories[0] : "";
    const caption = display.replace(/,?\s*(United States|USA)\s*$/i, "").trim() || [category, stars].filter(Boolean).join(" · ") || "Google Maps";
    out.push({ label: name, caption, value: id });
    if (out.length >= max) break;
  }
  return out;
}

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
    { id: "maps", label: "Google Maps", jobKeys: ["data_google_maps_reviews"] },
    { id: "trustpilot", label: "Trustpilot", jobKeys: ["customer_reviews", "data_trustpilot_reviews"] },
    { id: "appstore", label: "App Store", jobKeys: ["app_store_reviews", "data_app_store_reviews"] },
    { id: "play", label: "Google Play", jobKeys: ["data_google_play_reviews"] },
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
    const id = /\/id(\d+)/.exec(v) ?? /^(\d{6,})$/.exec(v);
    return id?.[1] ?? v;
  }
  if (jobKey === "data_app_store_reviews" && inputName === "url" && /^\d{6,}$/.test(v)) {
    return `https://apps.apple.com/us/app/id${v}`;
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

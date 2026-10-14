/**
 * Smart Add helpers — find a person by name, one method per window panel ("focused session").
 * Server: aidream `/brand-intake/people-search` (services/brand_intake/people_search.py).
 * Research behind each method: common-docs …/smart-add-brand/PEOPLE-SEARCH-RESEARCH.md.
 */

export const HELPER_METHODS = ["linkedin", "google", "threads", "tiktok", "youtube", "grok"] as const;
export type HelperMethod = (typeof HELPER_METHODS)[number];

export const HELPER_LABELS: Record<HelperMethod, string> = {
  linkedin: "LinkedIn people",
  google: "Google deep search",
  threads: "Threads users",
  tiktok: "TikTok users",
  youtube: "YouTube channels",
  grok: "Grok on X",
};

export function isHelperMethod(v: unknown): v is HelperMethod {
  return typeof v === "string" && (HELPER_METHODS as readonly string[]).includes(v);
}

/** What a helper searches with: prefilled from the current Smart Add round, editable in the panel. */
export interface HelperInput {
  name: string;
  city: string;
  occupation: string;
  company: string;
}

export const EMPTY_INPUT: HelperInput = { name: "", city: "", occupation: "", company: "" };

export interface HelperHit {
  query: string;
  page: number;
  rank: number;
}

export interface HelperCandidate {
  key: string;
  platform: string;
  url: string;
  handle: string | null;
  name: string | null;
  headline: string | null;
  location: string | null;
  employer: string | null;
  image_url: string | null;
  followers: number | null;
  verified: boolean | null;
  snippet: string | null;
  sources: string[];
  hits: HelperHit[];
}

export interface HelperCostLine {
  provider: string;
  operation: string;
  units: number;
  unit_label: string;
  /** Admins only (null for everyone else). */
  usd: number | null;
  points: number | null;
  replayed: boolean;
}

export interface HelperMethodInfo {
  method: HelperMethod;
  label: string;
  provider: string;
  endpoint: string;
  typical_time: string;
  estimate_units: string;
  estimate_usd: number | null;
  estimate_points: number | null;
  confirm_required: boolean;
}

/** One server request exactly as sent and received (aidream request_ledger entry). Admins only. */
export interface HelperLedgerEntry {
  seq: number;
  at: string;
  ms: number | null;
  kind: string;
  provider: string;
  label: string | null;
  status: number | string | null;
  error: string | null;
  request: unknown;
  response: unknown;
  replayed_from_test_cache?: boolean;
}

export interface HelperResult {
  method: HelperMethod;
  status: "done" | "running" | "failed" | "cancelled" | "needs_confirm";
  candidates: HelperCandidate[];
  groups: Record<string, HelperCandidate[]>;
  filtered_aggregators: string[];
  queries: string[];
  job: { snapshot_id?: string | null; progress?: Record<string, unknown>; records?: number; [k: string]: unknown } | null;
  /** Google only: the page this answer covers; whether a deeper page can be asked for. */
  page: number;
  more: boolean;
  ms: number;
  points: number | null;
  estimate: HelperMethodInfo | null;
  error: string | null;
  costs: HelperCostLine[];
  requests: HelperLedgerEntry[];
}

/**
 * The ask reader's contract — aidream `POST /data-sources/ask/read` (compare's ONE plain-language reader,
 * `services/comparison/discover.py` `read_ask`). A sentence in, `{task, place, filters}` out, free and instant.
 * The Data Library box calls `readAsk`, opens `cardId`, fills the form from `filters`, and shows `chips`
 * as the editable "what we understood" row (each chip's `key` names the filter it edits).
 */

import { postJson } from "@/lib/python-client";

export type AskTask =
  | "homes"
  | "local_business"
  | "jobs"
  | "products"
  | "company_research"
  | "company_reviews"
  | "app_reviews"
  | "social_posts"
  | "unknown";

export type AskConfidence = "clear" | "guessed" | "unclear";
export type AskHomeType = "house" | "condo" | "townhouse" | "apartment" | "multi_family" | "land";
export type AskStatus = "for_sale" | "for_rent" | "sold";

export interface AskFilters {
  priceMin: number | null;
  priceMax: number | null;
  bedsMin: number | null;
  /** true = "3-bed" (exactly), false = "3+ beds". */
  bedsExact: boolean | null;
  bathsMin: number | null;
  homeType: AskHomeType | null;
  status: AskStatus | null;
  ratingMin: number | null;
  openNow: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: "year" | "hour" | null;
  remote: boolean | null;
  keyword: string;
  brand: string;
  company: string;
  platform: string;
  handle: string;
  url: string;
}

export interface AskChip {
  key: string;
  label: string;
}

export interface AskReading {
  text: string;
  task: AskTask;
  /** The Data Library task card to open (`library/tasks.ts` id); "" when the task is unknown. */
  cardId: string;
  confidence: AskConfidence;
  subject: string;
  place: string;
  nearMe: boolean;
  filters: AskFilters;
  /** Other tasks the words fit equally ("apple" → company research or products). */
  alternatives: AskTask[];
  chips: AskChip[];
  summary: string;
}

const TASKS: readonly AskTask[] = [
  "homes", "local_business", "jobs", "products", "company_research", "company_reviews", "app_reviews",
  "social_posts", "unknown",
];

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const boolOrNull = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const task = (v: unknown): AskTask => TASKS.find((t) => t === v) ?? "unknown";

export function parseAskReading(raw: unknown): AskReading {
  const o = obj(raw);
  const f = obj(o.filters);
  return {
    text: str(o.text),
    task: task(o.task),
    cardId: str(o.card_id),
    confidence: o.confidence === "clear" || o.confidence === "guessed" ? o.confidence : "unclear",
    subject: str(o.subject),
    place: str(o.place),
    nearMe: o.near_me === true,
    filters: {
      priceMin: numOrNull(f.price_min), priceMax: numOrNull(f.price_max),
      bedsMin: numOrNull(f.beds_min), bedsExact: boolOrNull(f.beds_exact), bathsMin: numOrNull(f.baths_min),
      homeType: (str(f.home_type) || null) as AskHomeType | null,
      status: (str(f.status) || null) as AskStatus | null,
      ratingMin: numOrNull(f.rating_min), openNow: boolOrNull(f.open_now),
      salaryMin: numOrNull(f.salary_min), salaryMax: numOrNull(f.salary_max),
      salaryPeriod: f.salary_period === "year" || f.salary_period === "hour" ? f.salary_period : null,
      remote: boolOrNull(f.remote),
      keyword: str(f.keyword), brand: str(f.brand), company: str(f.company),
      platform: str(f.platform), handle: str(f.handle), url: str(f.url),
    },
    alternatives: Array.isArray(o.alternatives) ? o.alternatives.map(task) : [],
    chips: Array.isArray(o.chips)
      ? o.chips.map((c) => ({ key: str(obj(c).key), label: str(obj(c).label) })).filter((c) => c.key && c.label)
      : [],
    summary: str(o.summary),
  };
}

/** Read a plain sentence into a task and its filters. Free; nothing is fetched. */
export async function readAsk(
  text: string,
  opts: { organizationId?: string; area?: string; signal?: AbortSignal } = {},
): Promise<AskReading> {
  const { data } = await postJson<unknown>(
    "/data-sources/ask/read",
    { text: text.trim(), ...(opts.area?.trim() ? { area: opts.area.trim() } : {}) },
    { organizationId: opts.organizationId, signal: opts.signal },
  );
  return parseAskReading(data);
}

import { formatDurationSeconds } from "@ai-matrx/kit/format";
/**
 * "Try advanced reader" — the wire shapes of aidream `POST /scraper/advanced-read/quote` and
 * `POST /scraper/advanced-read` (server: `services/data_fetch/advanced_read.py`). Parsed defensively:
 * a field the server did not send is `null`/empty, never invented.
 */

export type AdvancedAllow = "fast" | "all";

/** One reader that could get a page our scraper could not (server `Coverage.to_dict()`). */
export interface Coverage {
  service: string;
  label: string;
  speed: "fast" | "research" | "batch";
  typicalSeconds: number | null;
  unit: string;
  pointsPerUnit: number | null;
  returns: string;
  sourceKey: string | null;
  sourceLabel: string | null;
  platform: string | null;
}

export interface QuoteItem {
  url: string;
  coverage: Coverage[];
  wouldTry: string[];
  /** The most this page can cost; null = a price is unknown. */
  pointsUpTo: number | null;
}

export interface Quote {
  allow: AdvancedAllow;
  items: QuoteItem[];
  pointsUpToTotal: number | null;
  /** Set when the server's URL limit lowered the request. */
  limitApplied: { setting: string; value: number; requested: number } | null;
}

export interface ReaderTry {
  service: string;
  reader: string;
  ok: boolean;
  seconds: number;
  points: number;
  message: string;
}

export interface AdvancedItem {
  url: string;
  ok: boolean;
  service: string | null;
  reader: string | null;
  seconds: number;
  points: number;
  title: string | null;
  text: string;
  markdown: string | null;
  recordCount: number | null;
  message: string;
  tried: ReaderTry[];
}

export class AdvancedReadRefusal extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdvancedReadRefusal";
  }
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function parseCoverage(raw: unknown): Coverage | null {
  const o = obj(raw);
  const service = str(o.service);
  if (!service) return null;
  const speed = o.speed === "research" || o.speed === "batch" ? o.speed : "fast";
  return {
    service,
    label: str(o.label) ?? service,
    speed,
    typicalSeconds: num(o.typical_seconds),
    unit: str(o.unit) ?? "page",
    pointsPerUnit: num(o.points_per_unit),
    returns: str(o.returns) ?? "",
    sourceKey: str(o.source_key),
    sourceLabel: str(o.source_label),
    platform: str(o.platform),
  };
}

export const parseCoverageList = (raw: unknown): Coverage[] =>
  (Array.isArray(raw) ? raw : []).map(parseCoverage).filter((c): c is Coverage => c !== null);

export function parseQuote(raw: unknown): Quote {
  const o = obj(raw);
  const limit = obj(o.limit_applied);
  return {
    allow: o.allow === "all" ? "all" : "fast",
    items: (Array.isArray(o.items) ? o.items : []).map((i) => {
      const q = obj(i);
      return {
        url: str(q.url) ?? "",
        coverage: parseCoverageList(q.coverage),
        wouldTry: (Array.isArray(q.would_try) ? q.would_try : []).filter((s): s is string => typeof s === "string"),
        pointsUpTo: num(q.points_up_to),
      };
    }),
    pointsUpToTotal: num(o.points_up_to_total),
    limitApplied: str(limit.setting) ? { setting: str(limit.setting) ?? "", value: num(limit.value) ?? 0, requested: num(limit.requested) ?? 0 } : null,
  };
}

export function parseItem(raw: unknown): AdvancedItem | null {
  const o = obj(raw);
  const url = str(o.url);
  if (!url) return null;
  return {
    url,
    ok: o.ok === true,
    service: str(o.service),
    reader: str(o.reader),
    seconds: num(o.seconds) ?? 0,
    points: num(o.points) ?? 0,
    title: str(o.title),
    text: typeof o.text === "string" ? o.text : "",
    markdown: str(o.markdown),
    recordCount: num(o.record_count),
    message: str(o.message) ?? "",
    tried: (Array.isArray(o.tried) ? o.tried : []).map((t) => {
      const r = obj(t);
      return { service: str(r.service) ?? "", reader: str(r.reader) ?? "", ok: r.ok === true, seconds: num(r.seconds) ?? 0, points: num(r.points) ?? 0, message: str(r.message) ?? "" };
    }),
  };
}

export type AdvancedEvent =
  | { kind: "item"; item: AdvancedItem }
  | { kind: "result"; items: AdvancedItem[]; pointsTotal: number }
  | { kind: "refusal"; refusal: AdvancedReadRefusal }
  | null;

/** One NDJSON envelope: an item, the closing result, or the server's one refusal. */
export function readAdvancedEvent(evt: unknown): AdvancedEvent {
  const e = obj(evt);
  const d = obj(e.data);
  if (e.event === "error") {
    const details = obj(d.details);
    return {
      kind: "refusal",
      refusal: new AdvancedReadRefusal(
        str(d.code) ?? str(details.code) ?? "advanced_read_failed",
        str(d.user_message) ?? str(details.user_message) ?? str(d.message) ?? "The advanced reader could not run.",
      ),
    };
  }
  if (e.event !== "data") return null;
  if (d.type === "advanced_read_item") {
    const item = parseItem(d);
    return item ? { kind: "item", item } : null;
  }
  if (d.type === "advanced_read_result") {
    const items = (Array.isArray(d.items) ? d.items : []).map(parseItem).filter((i): i is AdvancedItem => i !== null);
    return { kind: "result", items, pointsTotal: num(d.points_total) ?? 0 };
  }
  return null;
}

/** The slowest-covering reader a person could opt into (a structured-data one), or null. */
export function slowCoverage(items: readonly QuoteItem[]): Coverage | null {
  let slow: Coverage | null = null;
  for (const item of items) {
    for (const c of item.coverage) {
      if (c.speed === "fast") continue;
      if (!slow || (c.typicalSeconds ?? 0) > (slow.typicalSeconds ?? 0)) slow = c;
    }
  }
  return slow;
}

/** "about 3 min" / "about 20 s" for a typical duration. */
export function aboutTime(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  return `about ${formatDurationSeconds(seconds, { style: "long", abbreviate: true, round: "nearest" })}`;
}

/** Characters of a read page drawn at once; the rest is behind "Show more" (a huge page froze the renderer). */
export const RENDER_CHARS = 6000;

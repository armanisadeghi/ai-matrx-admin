/**
 * Builder panel — finding things in long lists (hundreds of page and server calls, activity
 * events, values, story rows). One query grammar everywhere: words are AND-ed, case-insensitive,
 * a leading "-" excludes, and a request also matches inside its stored request and response.
 * FEATURE: ./FEATURE.md.
 */
import type { ActivityRow, RequestRow } from "./requests";

export interface ParsedQuery {
  include: string[];
  exclude: string[];
}

export function parseQuery(query: string): ParsedQuery {
  const include: string[] = [];
  const exclude: string[] = [];
  for (const raw of query.toLowerCase().split(/\s+/)) {
    if (!raw) continue;
    if (raw.length > 1 && raw.startsWith("-")) exclude.push(raw.slice(1));
    else include.push(raw);
  }
  return { include, exclude };
}

export function isEmptyQuery(q: ParsedQuery): boolean {
  return !q.include.length && !q.exclude.length;
}

/** Every word found somewhere in `haystacks` and no excluded word anywhere. */
export function matchesText(q: ParsedQuery, haystacks: readonly string[]): boolean {
  const text = haystacks.join("\n").toLowerCase();
  return q.include.every((w) => text.includes(w)) && !q.exclude.some((w) => text.includes(w));
}

// Bodies are stringified once per object; rows are rebuilt each render but keep their payloads.
const bodyText = new WeakMap<object, string>();
function textOf(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  let text = bodyText.get(value);
  if (text === undefined) {
    try {
      text = JSON.stringify(value).toLowerCase();
    } catch {
      text = "";
    }
    bodyText.set(value, text);
  }
  return text;
}

/** Where a request matched: its row (title, source, url, status…) or only inside a body. */
export type MatchPlace = "row" | "request" | "response";

export function sourceOf(row: RequestRow): string {
  return row.side === "server" ? row.provider || "server" : "page";
}

function urlOf(row: RequestRow): string {
  const req = row.request as { url?: unknown } | null;
  return req && typeof req === "object" && typeof req.url === "string" ? req.url : "";
}

/** Null when the row does not match; otherwise the first place every word was found. */
export function requestMatch(row: RequestRow, q: ParsedQuery, stepLabel?: string): MatchPlace | null {
  if (isEmptyQuery(q)) return "row";
  const rowText = [row.title, sourceOf(row), row.kind, urlOf(row), String(row.status ?? ""), row.error ?? "", stepLabel ?? row.nodeId ?? ""];
  const request = textOf(row.request);
  const response = textOf(row.response);
  // Exclusions look everywhere: "-google" must drop a row whose body says google.
  if (!matchesText({ include: [], exclude: q.exclude }, [...rowText, request, response])) return null;
  if (matchesText({ include: q.include, exclude: [] }, rowText)) return "row";
  if (matchesText({ include: q.include, exclude: [] }, [...rowText, request])) return "request";
  if (matchesText({ include: q.include, exclude: [] }, [...rowText, request, response])) return "response";
  return null;
}

export type RequestStatusFilter = "any" | "ok" | "failed" | "pending" | "slow";
export type RequestSort = "time" | "newest" | "slowest";

/** A call slower than this reads as slow. */
export const SLOW_MS = 2_000;

export function requestStatusOf(row: RequestRow): Exclude<RequestStatusFilter, "any" | "slow"> {
  if (row.error) return "failed";
  if (typeof row.status === "number") return row.status < 400 ? "ok" : "failed";
  if (row.status === null) return "pending";
  return /^(ok|done|success|2\d\d|3\d\d)$/i.test(String(row.status)) ? "ok" : "failed";
}

export interface RequestFind {
  query: string;
  /** "" = every source; else a value of `sourceOf`. */
  source: string;
  /** "" = every kind. */
  kind: string;
  /** "" = every step. */
  step: string;
  status: RequestStatusFilter;
  sort: RequestSort;
}

export const EMPTY_REQUEST_FIND: RequestFind = { query: "", source: "", kind: "", step: "", status: "any", sort: "time" };

export function isFindActive(f: RequestFind): boolean {
  return Boolean(f.query.trim() || f.source || f.kind || f.step || f.status !== "any");
}

export interface FoundRequest {
  row: RequestRow;
  place: MatchPlace;
}

export function findRequests(rows: readonly RequestRow[], f: RequestFind, stepLabels: Record<string, string> = {}): FoundRequest[] {
  const q = parseQuery(f.query);
  const out: FoundRequest[] = [];
  for (const row of rows) {
    if (f.source && sourceOf(row) !== f.source) continue;
    if (f.kind && row.kind !== f.kind) continue;
    if (f.step && row.nodeId !== f.step) continue;
    if (f.status === "slow" ? (row.ms ?? 0) < SLOW_MS : f.status !== "any" && requestStatusOf(row) !== f.status) continue;
    const place = requestMatch(row, q, row.nodeId ? stepLabels[row.nodeId] : undefined);
    if (place) out.push({ row, place });
  }
  if (f.sort === "newest") out.sort((a, b) => b.row.at - a.row.at);
  else if (f.sort === "slowest") out.sort((a, b) => (b.row.ms ?? -1) - (a.row.ms ?? -1));
  else out.sort((a, b) => a.row.at - b.row.at);
  return out;
}

/** Distinct values with how many rows carry each, most common first. */
export function tally<T>(rows: readonly T[], keyOf: (row: T) => string | null): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function findActivity(rows: readonly ActivityRow[], query: string, kind: string): ActivityRow[] {
  const q = parseQuery(query);
  return rows.filter(
    (r) => (!kind || r.kind === kind) && (isEmptyQuery(q) || matchesText(q, [r.title, r.kind, r.status ?? "", r.nodeId ?? ""])),
  );
}

/** Splits `text` around the query's words so a list can mark what matched. */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const words = parseQuery(query).include.filter((w) => w.length > 0);
  if (!words.length) return [{ text, hit: false }];
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text
    .split(pattern)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, hit: words.includes(part.toLowerCase()) }));
}

interface StoryLike {
  kind: string;
  number: string | null;
  title: string;
  detail: string | null;
  reason: string | null;
  status: string | null;
}

/** Story rows that match, kept in place: a matching call keeps its step, a run keeps its header. */
export function findStory<T extends StoryLike>(rows: readonly T[], query: string): T[] {
  const q = parseQuery(query);
  if (isEmptyQuery(q)) return [...rows];
  // Split into sections (rows before the first run header, then one per run): numbers repeat per run.
  const sections: { header: T | null; rows: T[] }[] = [{ header: null, rows: [] }];
  for (const r of rows) {
    if (r.kind === "run") sections.push({ header: r, rows: [] });
    else sections[sections.length - 1].rows.push(r);
  }
  const out: T[] = [];
  for (const { header, rows: list } of sections) {
    const hits = new Set(list.filter((r) => matchesText(q, [r.number ?? "", r.title, r.detail ?? "", r.reason ?? "", r.status ?? ""])));
    const parents = new Set([...hits].filter((r) => r.number?.includes(".")).map((r) => (r.number as string).split(".")[0]));
    const kept = list.filter((r) => hits.has(r) || (r.number !== null && parents.has(r.number)));
    if (kept.length) out.push(...(header ? [header] : []), ...kept);
  }
  return out;
}

interface EntryLike {
  key: string;
  label: string;
  source?: string | null;
}

export function findEntries<T extends EntryLike>(entries: readonly T[], query: string): T[] {
  const q = parseQuery(query);
  if (isEmptyQuery(q)) return [...entries];
  return entries.filter((e) => matchesText(q, [e.label, e.key, e.source ?? ""]));
}

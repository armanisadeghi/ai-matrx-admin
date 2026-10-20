// features/launchpad/bus/ports.ts — THE PAGE BUS CONTRACT (project custom-experience §5.6, lane L).
//
// A widget type declares what it PUBLISHES (values it offers the page — "Selected row") and what it ACCEPTS
// (inputs another widget can feed — "Filter"). A launchpad doc stores the connections
// (`LaunchpadDoc.bindings`, contract.ts). Each port names a value KIND; the kinds and their shapes are below.
// Vocabulary is alchemy's: a port is a surface value by name, delivered the way `useValue(name)` reads one;
// an Applet on the page reads its inputs and publishes its outputs through its own surface (`useValue`).
//
// Pure: no React. Values are JSON; a value carrying `__kind` (a kind envelope an Applet set) passes through
// whole — the bus never strips or rewrites it.
import type { LaunchpadBinding, LaunchpadDoc } from "@/features/shell/shell-layout/contract";

/** The value kinds a port carries. */
export type PageValueKind = "record" | "file" | "text" | "rows";

/** One chosen platform record (entity token + id), with the words a person reads. */
export interface PageRecordValue {
  token: string;
  id: string;
  label: string;
  /** Where the record opens in the app, when known. */
  href?: string;
}

/** One file, by its durable identity (`file_id` — never a URL). */
export interface PageFileValue {
  file_id: string;
  label: string;
}

/** A list of rows another widget is showing. */
export interface PageRowsValue {
  token?: string;
  rows: { id: string; label: string }[];
}

export interface PageValueOf {
  record: PageRecordValue;
  file: PageFileValue;
  text: string;
  rows: PageRowsValue;
}

export interface LaunchpadPort {
  /** Stable within the widget type (`selected`, `filter`). Saved in bindings — never rename. */
  key: string;
  label: string;
  kind: PageValueKind;
}

/** Which published kinds can feed an input kind (exact first; a record or file feeds text by its words). */
const FEEDS: Record<PageValueKind, readonly PageValueKind[]> = {
  record: ["record", "file"],
  file: ["file", "record"],
  text: ["text", "record", "file"],
  rows: ["rows"],
};

export function canFeed(from: PageValueKind, to: PageValueKind): boolean {
  return FEEDS[to].includes(from);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * A published value shaped for an input of `to` kind, or `undefined` when it cannot be (nothing chosen,
 * a record that is not a file feeding a file input). A value that already IS the input kind is returned as
 * given (its `__kind`, if any, intact).
 */
export function coercePageValue<K extends PageValueKind>(value: unknown, from: PageValueKind, to: K): PageValueOf[K] | undefined {
  if (value === undefined || value === null) return undefined;
  if (from === to) return value as PageValueOf[K];
  if (!canFeed(from, to)) return undefined;
  if (to === "text") {
    if (isObj(value) && typeof value.label === "string") return value.label as PageValueOf[K];
    return undefined;
  }
  if (to === "record" && from === "file" && isObj(value) && typeof value.file_id === "string") {
    return { token: "file", id: value.file_id, label: typeof value.label === "string" ? value.label : "File" } as PageValueOf[K];
  }
  if (to === "file" && from === "record" && isObj(value) && value.token === "file" && typeof value.id === "string") {
    return { file_id: value.id, label: typeof value.label === "string" ? value.label : "File" } as PageValueOf[K];
  }
  return undefined;
}

/** `widgetId\u0000key` — one address on the bus. */
export const busAddress = (widgetId: string, key: string): string => `${widgetId}\u0000${key}`;

/** The two halves of a `busAddress`, or null. */
export function splitBusAddress(address: string): { widgetId: string; key: string } | null {
  const [widgetId, key] = address.split("\u0000");
  return widgetId && key ? { widgetId, key } : null;
}

/** The connection feeding one input, or none. */
export function bindingInto(doc: Pick<LaunchpadDoc, "bindings">, widgetId: string, key: string): LaunchpadBinding | null {
  return doc.bindings?.find((b) => b.to.widgetId === widgetId && b.to.key === key) ?? null;
}

/** Read stored bindings: well-formed entries only, one per input (the first wins), no self-feeds. */
export function parseBindings(raw: unknown, widgetIds: ReadonlySet<string>): LaunchpadBinding[] {
  if (!Array.isArray(raw)) return [];
  const out: LaunchpadBinding[] = [];
  const end = (v: unknown) =>
    isObj(v) && typeof v.widgetId === "string" && typeof v.key === "string" && v.widgetId && v.key ? { widgetId: v.widgetId, key: v.key } : null;
  for (const r of raw) {
    if (!isObj(r)) continue;
    const from = end(r.from);
    const to = end(r.to);
    if (!from || !to || from.widgetId === to.widgetId) continue;
    if (!widgetIds.has(from.widgetId) || !widgetIds.has(to.widgetId)) continue;
    if (out.some((b) => b.to.widgetId === to.widgetId && b.to.key === to.key)) continue;
    out.push({ from, to });
  }
  return out;
}

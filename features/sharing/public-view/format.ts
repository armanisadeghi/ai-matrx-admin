// features/sharing/public-view/format.ts — a stored cell, as words, for a page nobody signed in to read.
// Pure and deterministic (dates in UTC) so the server paints exactly what the browser would.

import type { PublishedViewField, PublishedViewOpen, PublishedViewRow } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const normChoice = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");

function ids(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((e) => {
    if (typeof e === "string") return [e];
    if (e && typeof e === "object") {
      const o = e as Record<string, unknown>;
      const id = o["id"] ?? o["record_id"];
      return typeof id === "string" ? [id] : [];
    }
    return [];
  });
}

/** A date or an instant (a string, or `{start}`) → `Oct 17, 2026`, with the time when it carries one. */
export function dateOf(value: unknown): Date | null {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>)["start"] : value;
  if (typeof raw !== "string" || !raw) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dayText(d: Date, withTime: boolean): string {
  const day = d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
  return withTime ? `${day}, ${d.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" })} UTC` : day;
}

export function cellValue(view: PublishedViewOpen, field: PublishedViewField, row: PublishedViewRow): string[] {
  if (field.system === "created_time") return [dayText(new Date(row.created_at), true)];
  if (field.system === "modified_time") return [dayText(new Date(row.updated_at), true)];
  const value = row.values[field.key];
  if (value === null || value === undefined || value === "") return [];
  if (field.relation_target) return ids(value).map((id) => view.refs[id]).filter((w): w is string => Boolean(w));
  const choices = view.labels[field.key];
  if (choices) {
    return ids(value).map((v) => choices[normChoice(v)] ?? v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()));
  }
  if (field.type === "range") {
    const d = dateOf(value);
    if (d) return [dayText(d, field.format === "datetime" || (typeof value === "string" && value.length > 10))];
  }
  if (typeof value === "boolean") return [value ? "Yes" : "No"];
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string" || typeof v === "number").map(String);
  return [];
}

/** A record's title: its first text column that holds something (never the import id). */
export function titleOf(view: PublishedViewOpen, row: PublishedViewRow): string {
  for (const f of view.fields) {
    if (f.type !== "text" || f.key === "notion_id") continue;
    const v = row.values[f.key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "Untitled";
}

export function isRecordId(v: string): boolean {
  return UUID.test(v);
}

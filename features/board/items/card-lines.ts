/**
 * The far-zoom card's facts (L2, `components/TileFace.tsx`): 1–3 short lines made from the tile's saved
 * `basics` (`BoardNode.basics.values` — what the item last said about itself). Pure: no store, no fetch.
 *
 * A prose value (a note's content) becomes an excerpt line; a short value becomes "Label  value"; ids,
 * links, the title again and the status (the chip shows it) are left out.
 */

import type { ItemBasicValues } from "./types";

export interface CardLine {
  /** Muted lead ("Due", "Priority"); null for an excerpt. */
  label: string | null;
  value: string;
}

/** Keys that never make a card line: ids, links, the name (the title shows it), the status (the chip shows it). */
const SKIP_KEY = /(^|_)(id|ids|uuid|url|urls|href|link|slug|status|state|title|name|kind|type|organization|org|owner|user)$/;
const PREFIX = /^(active|current|selected|focused|open|brief)_/;
/** A first word that only repeats what the card already says (its type). */
const ENTITY_WORD = new Set([
  "task", "note", "meeting", "run", "chat", "conversation", "table", "record", "file", "doc", "document",
  "project", "post", "profile", "research", "room", "deck", "kit", "scope", "workflow", "page", "ad", "item",
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const PROSE_CHARS = 48;
const LINE_CHARS = 120;

export function humanizeKey(key: string): string {
  let parts = key.replace(PREFIX, "").split(/[_\s]+/).filter(Boolean);
  if (parts.length > 1 && ENTITY_WORD.has(parts[0].toLowerCase())) parts = parts.slice(1);
  // "updated_at" → "Updated"; "size_bytes" → "Size" (the value carries its unit).
  if (parts.length > 1 && /^(at|bytes)$/i.test(parts[parts.length - 1])) parts = parts.slice(0, -1);
  const words = parts.join(" ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function shortDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** The first readable line of prose: headings, markdown marks and blank lines dropped (a heading usually repeats the title). */
function excerpt(text: string): string {
  const line =
    text
      .split(/\n+/)
      .filter((l) => !/^\s*#/.test(l))
      .map((l) => l.replace(/^[>*\-\s\d.]+/, "").replace(/[*_`~]+/g, "").trim())
      .find((l) => l.length > 0) ?? "";
  return line.length > LINE_CHARS ? `${line.slice(0, LINE_CHARS - 1)}…` : line;
}

export function cardLinesFromBasics(values: ItemBasicValues | null | undefined, opts: { title?: string; max?: number } = {}): CardLine[] {
  if (!values) return [];
  const max = opts.max ?? 3;
  const title = (opts.title ?? "").trim().toLowerCase();
  const prose: CardLine[] = [];
  const facts: CardLine[] = [];
  for (const [key, raw] of Object.entries(values)) {
    if (SKIP_KEY.test(key.toLowerCase())) continue;
    const label = humanizeKey(key);
    if (!label) continue;
    if (typeof raw === "string") {
      const v = raw.trim();
      if (!v || UUID.test(v) || /^https?:\/\//.test(v) || v.toLowerCase() === title) continue;
      if (ISO_DATE.test(v)) {
        const d = shortDate(v);
        if (d) facts.push({ label, value: d });
        continue;
      }
      if (v.length > PROSE_CHARS || v.includes("\n")) {
        const e = excerpt(v);
        if (e && e.toLowerCase() !== title) prose.push({ label: null, value: e });
        continue;
      }
      facts.push({ label, value: v });
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      facts.push({ label, value: /_bytes$/i.test(key) ? bytes(raw) : raw.toLocaleString() });
    } else if (Array.isArray(raw) && raw.length > 0) {
      facts.push({ label, value: raw.length.toLocaleString() });
    }
  }
  return [...prose.slice(0, 1), ...facts].slice(0, max);
}

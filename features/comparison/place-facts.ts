/**
 * Reading the structured facts a place comparison carries (star counts, hours, contact, status,
 * attributes, reviews). Pure; the view and the tests share it. These are facts to read side by side,
 * never scores: nothing here ranks, and nothing here feeds the headline.
 */

import type { CompareField, ComparedItem, ComparedValue, ComparisonResult } from "./contract";
import { comparedItems } from "./verdict";

/** Field types that render as their own side-by-side card (hours too, which older runs sent as text). */
const RICH = new Set(["distribution", "contact", "status", "tags", "hours"]);
export const isRich = (f: CompareField): boolean => RICH.has(f.type);
/** Rendered on each contender's card (behind a disclosure), not as a table row. */
export const isCardOnly = (f: CompareField): boolean => f.type === "reviews";

const has = (v: ComparedValue | undefined): v is ComparedValue =>
  Boolean(v) && v!.value !== null && v!.value !== undefined && v!.display !== "—";

/** A rich row is worth showing only when at least two contenders have the value to set side by side. */
export function hasSideBySide(field: CompareField, result: ComparisonResult): boolean {
  return comparedItems(result).filter((i) => has(i.values[field.key])).length >= 2;
}

// ── star counts ──────────────────────────────────────────────────────────────

export interface StarShares { total: number; counts: number[]; shares: number[] }

/** Counts for 5..1 stars (index 0 = five-star) and each one's share of all counted reviews. */
export function starShares(value: unknown): StarShares | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const counts = [5, 4, 3, 2, 1].map((s) => (typeof o[String(s)] === "number" ? (o[String(s)] as number) : 0));
  const total = counts.reduce((a, b) => a + b, 0);
  return total > 0 ? { total, counts, shares: counts.map((c) => c / total) } : null;
}

// ── hours ────────────────────────────────────────────────────────────────────

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekOf(value: unknown): [string, string][] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rows = Object.entries(value as Record<string, unknown>).filter(([, v]) => typeof v === "string") as [string, string][];
  if (!rows.length) return null;
  return rows.sort((a, b) => DAYS.indexOf(a[0]) - DAYS.indexOf(b[0]) || 0);
}

/** Today's line from the week, by the viewer's clock ("Friday", "9 am–6 pm"); null when the week has no such day. */
export function hoursToday(week: [string, string][], now: Date): { day: string; text: string } | null {
  const day = DAYS[now.getDay()];
  const hit = week.find(([d]) => d.toLowerCase() === day.toLowerCase());
  return hit ? { day, text: hit[1] } : null;
}

function minutes(token: string, fallbackMeridiem: string | null): { m: number; mer: string | null } | null {
  const t = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(token.trim());
  if (!t) return null;
  const mer = t[3]?.toLowerCase() ?? fallbackMeridiem;
  let h = Number(t[1]) % 12;
  if (mer === "pm") h += 12;
  else if (!mer && Number(t[1]) === 12) h = 12;
  return { m: h * 60 + Number(t[2] ?? 0), mer: t[3]?.toLowerCase() ?? null };
}

/**
 * Open now / Closed from a day's text ("9 am–6 pm", "9 am–12 pm, 2–6 pm", "Closed", "Open 24 hours").
 * null when the text is not a clean time range: we say nothing rather than guess.
 */
export function openNow(text: string, now: Date): boolean | null {
  const t = text.trim().toLowerCase();
  if (t === "closed") return false;
  if (/^open 24 hours?$/.test(t)) return true;
  const at = now.getHours() * 60 + now.getMinutes();
  let any = false;
  for (const part of t.split(",")) {
    const sides = part.split(/\s*(?:–|—|-|to)\s*/).map((s) => s.trim().replace(/[  ]/g, " "));
    if (sides.length !== 2) return null;
    const end = minutes(sides[1], null);
    if (!end) return null;
    let start = minutes(sides[0], end.mer);
    if (!start) return null;
    // "9–5 pm": 9 inherits pm (21:00) and lands after 5 pm, so it was am
    if (!/(am|pm)/.test(sides[0]) && start.m > end.m) start = minutes(sides[0], end.mer === "pm" ? "am" : "pm");
    if (!start) return null;
    const e = end.m <= start.m ? end.m + 1440 : end.m;
    if ((at >= start.m && at < e) || (at + 1440 >= start.m && at + 1440 < e)) any = true;
  }
  return any;
}

// ── contact, status, tags, reviews ───────────────────────────────────────────

export interface Contact { phone?: string; website?: string; booking?: string }
export function contactOf(value: unknown): Contact | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const pick = (k: string) => (typeof o[k] === "string" && o[k] ? (o[k] as string) : undefined);
  const c = { phone: pick("phone"), website: pick("website"), booking: pick("booking") };
  return c.phone || c.website || c.booking ? c : null;
}

export interface Status { closed: "permanently" | "temporarily" | null; claimed: boolean | null }
export function statusOf(value: unknown): Status | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  return {
    closed: o.closed === "permanently" || o.closed === "temporarily" ? o.closed : null,
    claimed: typeof o.claimed === "boolean" ? o.claimed : null,
  };
}

export function tagsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
}

/** Attribute names across every contender, in first-seen order, with who has each (the yes/no grid). */
export function attributeGrid(items: ComparedItem[], key: string): { name: string; has: boolean[] }[] {
  const sets = items.map((i) => new Set(tagsOf(i.values[key]?.value)));
  const names: string[] = [];
  for (const s of sets) for (const n of s) if (!names.includes(n)) names.push(n);
  return names.map((name) => ({ name, has: sets.map((s) => s.has(name)) }));
}

export interface ReviewSample { rating: number | null; text: string; date: string | null; by: string | null }
export interface ReviewSamples { top: ReviewSample[]; snippets: string[] }
export function reviewsOf(value: unknown): ReviewSamples | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const top = (Array.isArray(o.top) ? o.top : []).flatMap((r): ReviewSample[] => {
    const x = r as Record<string, unknown>;
    return typeof x?.text === "string" ? [{
      rating: typeof x.rating === "number" ? x.rating : null, text: x.text,
      date: typeof x.date === "string" ? x.date : null, by: typeof x.by === "string" ? x.by : null,
    }] : [];
  });
  const snippets = (Array.isArray(o.snippets) ? o.snippets : []).filter((s): s is string => typeof s === "string");
  return top.length || snippets.length ? { top, snippets } : null;
}

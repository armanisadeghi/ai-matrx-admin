/**
 * The plain-English reading of a comparison, computed from the result alone (pure, deterministic):
 * who leads, on how many of the fields that can be ranked, why each field went the way it did, and
 * how long each bar is. The result view and a later public page both read these — never the wire.
 */

import type { CompareField, ComparedItem, ComparisonResult } from "./contract";

const NUMERIC = new Set(["rating", "number", "int", "percent"]);

export function isRankable(f: CompareField): boolean {
  return NUMERIC.has(f.type) && f.direction !== "none";
}

export function isNumeric(f: CompareField): boolean {
  return NUMERIC.has(f.type);
}

export function numberOf(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Items that were compared (not failed, not waiting on a choice), in rank order. */
export function comparedItems(result: ComparisonResult): ComparedItem[] {
  return result.items.filter((i) => !i.error && !i.needs_choice);
}

/** Rankable fields at least one compared item has a number for. */
export function scoredFields(result: ComparisonResult): CompareField[] {
  const items = comparedItems(result);
  return result.fields.filter((f) => isRankable(f) && items.some((i) => numberOf(i.values[f.key]?.value) !== null));
}

export interface Verdict {
  leader: ComparedItem | null;
  /** Fields the leader is best on, of `total` fields with numbers. */
  leads: number;
  total: number;
  /** Two or more items share first place on the primary field. */
  tie: boolean;
}

export function verdictOf(result: ComparisonResult): Verdict {
  const items = comparedItems(result);
  const fields = scoredFields(result);
  const leader = items.find((i) => i.rank === 1) ?? null;
  const tie = items.filter((i) => i.rank === 1).length > 1;
  const leads = leader ? fields.filter((f) => leader.values[f.key]?.is_best).length : 0;
  return { leader, leads, total: fields.length, tie };
}

function names(list: ComparedItem[]): string {
  const n = list.map((i) => i.name);
  if (n.length <= 1) return n[0] ?? "";
  return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
}

/** One line on why a field went the way it did: "Beta leads at 4.6 — 0.5 ahead of Alpha". */
export function whyLine(field: CompareField, result: ComparisonResult): string {
  const items = comparedItems(result);
  const withNumber = items.filter((i) => numberOf(i.values[field.key]?.value) !== null);
  if (!isNumeric(field)) return "";
  if (withNumber.length === 0) return "No data from any source";
  if (!isRankable(field)) return "Shown, not ranked";
  const best = withNumber.filter((i) => i.values[field.key]?.is_best);
  const rest = withNumber.filter((i) => !i.values[field.key]?.is_best);
  const shown = best[0]?.values[field.key]?.display ?? "";
  if (best.length === withNumber.length && withNumber.length > 1) return `All tied at ${shown}`;
  if (best.length > 1) return `${names(best)} tie at ${shown}`;
  if (rest.length === 0) return `${names(best)} at ${shown}`;
  // the runner-up: the best of the rest, the right way round
  const sign = field.direction === "lower_better" ? 1 : -1;
  const runner = rest.slice().sort((a, b) =>
    sign * ((numberOf(a.values[field.key]?.value) ?? 0) - (numberOf(b.values[field.key]?.value) ?? 0)))[0];
  if (field.type === "percent") {
    return `${names(best)} leads · ${shown} to ${runner.values[field.key]?.display ?? "—"} for ${runner.name}`;
  }
  const gap = gapText(field, numberOf(best[0].values[field.key]?.value), numberOf(runner.values[field.key]?.value));
  return gap ? `${names(best)} leads · ${gap} ahead of ${runner.name}` : `${names(best)} leads at ${shown}`;
}

function gapText(field: CompareField, a: number | null, b: number | null): string {
  if (a === null || b === null) return "";
  const d = Math.abs(a - b);
  if (field.type === "rating") return d.toFixed(1);
  if (field.type === "int") return Math.round(d).toLocaleString("en-US");
  return Number.isInteger(d) ? d.toLocaleString("en-US") : d.toFixed(1);
}

/** How full a bar is (0..1), on the field's own scale: stars out of 5, a share out of 100%, else the largest. */
export function barFraction(field: CompareField, value: unknown, result: ComparisonResult): number | null {
  const n = numberOf(value);
  if (n === null) return null;
  if (field.type === "rating") return clamp(n / 5);
  if (field.type === "percent") return clamp(n);
  const max = Math.max(...comparedItems(result).map((i) => numberOf(i.values[field.key]?.value) ?? 0), 0);
  return max > 0 ? clamp(n / max) : 0;
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** A readable name for a link when nothing better is known (never a raw URL on screen). */
export function nameFromLink(text: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    const review = u.pathname.match(/^\/review\/([^/?#]+)/);
    if (review) return review[1].replace(/^www\./, "");
    const place = u.pathname.match(/^\/maps\/place\/([^/]+)/);
    if (place) return decodeURIComponent(place[1]).replace(/\+/g, " ");
    return u.hostname.replace(/^www\./, "");
  } catch {
    return text;
  }
}

/**
 * The guaranteed path's rows — pure. One row per thing to compare: a name and where it is (and its
 * website when the person knows it). A row is resolved against the real source before anything is
 * compared; a row that does not resolve keeps its nearest real matches to pick from.
 */

import type { ComparisonItemInput, LookupItem, LookupMatch } from "./contract";
import type { ResolveCandidate, ResolveResult } from "./discovery";
import { parseInput, isLink, type KindKey } from "./parse-input";

export const MAX_ROWS = 5;

export type RowState = "idle" | "resolving" | "found" | "choose" | "not_found" | "error";

export interface CompareRow {
  key: string;
  name: string;
  city: string;
  website: string;
  /** The city came from the shared Near box (so a later Near edit may replace it). */
  cityFromNear: boolean;
  state: RowState;
  match: LookupMatch | null;
  category: string;
  candidates: ResolveCandidate[];
  message: string | null;
  /** Look it up as soon as it shows (filled from the one-line box). */
  autoFind?: boolean;
  /** Put the cursor in its name when it shows (a new or reopened card). */
  focus?: boolean;
}

let seq = 0;
export const newRow = (patch: Partial<CompareRow> = {}): CompareRow => ({
  key: `row${++seq}`, name: "", city: "", website: "", cityFromNear: false, state: "idle", match: null,
  category: "", candidates: [], message: null, ...patch,
});

/** Two empty rows: the shape of "compare A with B". */
export const startRows = (): CompareRow[] => [newRow(), newRow()];

/** Typing a field changes what the row names, so its earlier answer no longer holds. */
export function editRow(row: CompareRow, patch: Partial<Pick<CompareRow, "name" | "city" | "website">>): CompareRow {
  return {
    ...row, ...patch, cityFromNear: patch.city !== undefined ? false : row.cityFromNear,
    state: "idle", match: null, category: "", candidates: [], message: null,
  };
}

/** The shared Near fills every empty city (and the ones it filled before); a typed city is never replaced. */
export function applyNear(rows: CompareRow[], near: string): CompareRow[] {
  const n = near.trim();
  return rows.map((r) => {
    if ((r.city.trim() && !r.cityFromNear) || r.city === n) return r;
    return { ...editRow(r, { city: n }), cityFromNear: Boolean(n) };
  });
}

/** Rows that still need their search: a name, and no answer yet (or an answer that came back empty). */
export const needsSearch = (r: CompareRow): boolean =>
  (r.name.trim() !== "" || r.website.trim() !== "") && (r.state === "idle" || r.state === "not_found" || r.state === "error");

export const foundMatches = (rows: CompareRow[]): LookupMatch[] =>
  rows.filter((r) => r.state === "found" && r.match).map((r) => r.match as LookupMatch);

/** A map answer → the row's state. */
export function withResolve(row: CompareRow, res: ResolveResult): CompareRow {
  return {
    ...row, state: res.status, match: res.status === "found" ? res.match : null,
    category: res.status === "found" ? res.category : "", candidates: res.candidates, message: res.message,
  };
}

/** A company lookup answer → the row's state (the second line is the web address). */
export function withLookup(row: CompareRow, item: LookupItem | undefined): CompareRow {
  if (!item) return { ...row, state: "error", message: "We could not look that up. Try again." };
  const cands = item.candidates.map((m) => ({ match: m, category: "" }));
  if (item.status === "found" && item.match) {
    return { ...row, state: "found", match: item.match, category: "", candidates: cands, message: null };
  }
  if (item.status === "choose") {
    return { ...row, state: "choose", match: null, candidates: cands, message: "More than one fits. Pick yours." };
  }
  return { ...row, state: "not_found", match: null, candidates: [], message: item.message ?? "We could not find that." };
}

/** The person picked one of a row's candidates. */
export const pickCandidate = (row: CompareRow, c: ResolveCandidate): CompareRow =>
  ({ ...row, state: "found", match: c.match, category: c.category, message: null });

/**
 * One line of free text ("A vs B", "Sparrow Bakery, Bend OR vs Looney Bean in Bend") → rows the person
 * sees and confirms. Nothing is searched until they press Find.
 */
export function rowsFromText(text: string, kind: KindKey, near: string): CompareRow[] {
  const parsed = parseInput(text, kind, near);
  return parsed.items.slice(0, MAX_ROWS).map((i) => {
    if (isLink(i.text)) return newRow({ name: i.text });
    const inputs = (i.input.inputs ?? {}) as Record<string, unknown>;
    if (kind === "local_business" || kind === "list_items") {
      const name = typeof inputs.name === "string" ? inputs.name : i.text;
      const city = typeof inputs.city === "string" ? inputs.city : "";
      return newRow({ name, city, cityFromNear: Boolean(city) && city === near.trim() });
    }
    return newRow({ name: i.input.label ?? i.text });
  });
}

/** A row is empty when the person typed nothing into it yet. */
export const isEmptyRow = (r: CompareRow): boolean => !r.name.trim() && !r.website.trim();

/**
 * A real thing the person picked from a found list (a map search's place, a review-site company) goes
 * into the first empty row, already matched — it IS the real entity. A full lineup gains a row up to
 * MAX_ROWS; past that nothing changes (the caller says so).
 */
export function placePick(rows: CompareRow[], match: LookupMatch, category: string): CompareRow[] {
  const filled = newRow({ name: match.name, state: "found", match, category });
  const at = rows.findIndex(isEmptyRow);
  if (at >= 0) return rows.map((r, i) => (i === at ? { ...filled, key: r.key } : r));
  return rows.length < MAX_ROWS ? [...rows, filled] : rows;
}

/** Whether a found-list entity is already in the lineup (same listing or page). */
export function inLineup(rows: CompareRow[], match: LookupMatch): boolean {
  const id = match.item.url ?? match.url ?? match.name;
  return rows.some((r) => r.match && (r.match.item.url ?? r.match.url ?? r.match.name) === id);
}

/**
 * What one non-place row sends to the lookup: a company's website is its identity (matched by that
 * domain first, the name only labels it); a link is that exact page; anything else is the typed words.
 */
export function rowItem(kind: KindKey, row: CompareRow): ComparisonItemInput {
  const name = row.name.trim();
  const website = row.website.trim();
  if (kind === "companies_reviews" && website) return { label: name || website, website };
  if (kind === "list_items" && !isLink(name)) {
    const city = row.city.trim();
    return { label: name, inputs: { name, ...(city ? { city } : {}) } };
  }
  const parsed = parseInput(name, kind).items[0];
  return parsed?.input ?? { label: name };
}

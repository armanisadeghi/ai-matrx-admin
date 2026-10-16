/**
 * Where a model shows on the Models page (page, shelf, shelf title): the choices and the words.
 * Pages come from data: the pages already in use plus the spec's pages (the server answers those).
 */
import type { Placement } from "./api";

export function pageChoices(inUse: readonly Placement[], specPages: readonly string[]): string[] {
  return [...new Set([...specPages, ...inUse.map((p) => p.page)])].filter(Boolean);
}

/** Shelves already used on a page, as {shelf, title}, so a shelf is picked rather than guessed. */
export function shelvesOnPage(inUse: readonly Placement[], page: string): Placement[] {
  return inUse.filter((p) => p.page === page);
}

export function placementWords(p: Placement): string {
  return `Shown on the ${p.page} page, on the shelf “${p.shelf_title}”.`;
}

export function samePlacement(a: Placement, b: Placement): boolean {
  return a.page === b.page && a.shelf === b.shelf && a.shelf_title === b.shelf_title;
}

/**
 * The placement after the admin picks another page: the automatic choice when it is on that page,
 * otherwise the first shelf already on that page, otherwise an empty shelf to name. Never the old
 * page's shelf id carried over.
 */
export function placementForPage(
  inUse: readonly Placement[],
  automatic: Placement | null,
  page: string,
): Placement {
  if (automatic && automatic.page === page) return automatic;
  const first = shelvesOnPage(inUse, page)[0];
  return first ? { page, shelf: first.shelf, shelf_title: first.shelf_title } : { page, shelf: "", shelf_title: "" };
}

/** What the candidate list says before it has rows: loading is never worded as empty. */
export function listNotice(candidates: readonly unknown[] | null, loadError: string | null): string | null {
  if (candidates === null) return loadError ? null : "Loading candidates\u2026";
  return candidates.length === 0 ? "No candidates yet" : null;
}

/** The detail panel's identity: the candidate only. A refreshed row (new updated_at) must not remount the form. */
export function detailKey(c: { id: string }): string {
  return c.id;
}

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

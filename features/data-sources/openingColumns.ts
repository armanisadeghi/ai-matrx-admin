/**
 * WHICH COLUMNS A FETCHED TABLE OPENS ON. A table made by "Get data" has every field the source
 * returned — dozens, several of them developer plumbing. It opens on the source's telling fields
 * (the catalog's `output_fields`, telling-first via `orderTellingFields`, capped), and every other
 * column stays one click away in the table's own column control. Nothing is deleted: this only
 * produces the list of field keys the grid's ordinary "hidden columns" look starts with.
 */

import { fieldWords, orderTellingFields } from "./library/catalog";

/** How many columns a fetched table opens on. */
export const OPENING_COLUMN_CAP = 8;

interface FieldLike {
  key: string;
  label?: string | null;
  name?: string | null;
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * The field keys to start hidden: every field that is not one of the source's first `cap` telling
 * output fields present in the table. Null when there is nothing to do (the table already fits,
 * or too few of its fields are recognized to say which ones tell).
 */
export function openingHiddenFields(
  fields: readonly FieldLike[],
  outputFields: readonly string[],
  cap: number = OPENING_COLUMN_CAP,
): string[] | null {
  if (fields.length <= cap) return null;
  const shown: string[] = [];
  for (const out of orderTellingFields(outputFields)) {
    const wanted = new Set([norm(out), norm(fieldWords(out))]);
    const hit = fields.find((f) => !shown.includes(f.key) && [f.key, f.name, f.label].some((x) => x && wanted.has(norm(x))));
    if (hit) shown.push(hit.key);
    if (shown.length >= cap) break;
  }
  if (shown.length < 2) return null;
  const hidden = fields.filter((f) => !shown.includes(f.key)).map((f) => f.key);
  return hidden.length > 0 ? hidden : null;
}

/** Whether the person (or a view's author) has already chosen which columns show: then we never override it. */
export function hasChosenColumns(
  address: { hidden?: readonly string[] } | null | undefined,
  views: readonly { presentation?: { hiddenFields?: readonly string[] } | null }[],
  looks: Record<string, { presentation?: { hiddenFields?: readonly string[] } | null } | undefined> | null | undefined,
): boolean {
  if ((address?.hidden?.length ?? 0) > 0) return true;
  if (views.some((v) => (v.presentation?.hiddenFields?.length ?? 0) > 0)) return true;
  return Object.values(looks ?? {}).some((l) => (l?.presentation?.hiddenFields?.length ?? 0) > 0);
}

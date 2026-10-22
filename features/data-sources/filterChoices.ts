/**
 * The filters a data source's search can take — pure. The SERVER decides which (`DataSource.search_filters`,
 * per organization, from the provider that is on); this file only says how each one reads and what it
 * sends. A filter the server did not list is never shown (a control that does nothing is a lie), and a
 * value the person cleared is never sent.
 */

import type { DataSource } from "./contract";

export type FilterName = "status" | "home_type" | "price_min" | "price_max" | "beds_min" | "baths_min";

export interface FilterChoice {
  value: string;
  label: string;
}

export const ANY = "any";

export const STATUS_CHOICES: FilterChoice[] = [
  { value: "for_sale", label: "For sale" },
  { value: "for_rent", label: "For rent" },
  { value: "sold", label: "Sold" },
];

const HOME_TYPES: FilterChoice[] = [
  { value: ANY, label: "Any" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "condo", label: "Condo" },
  { value: "apartment", label: "Apartment" },
  { value: "multi_family", label: "Multi-family" },
  { value: "land", label: "Land" },
];
/** What a rental search can be (the provider's own list); sale and sold take all of them. */
const RENT_TYPES = new Set(["house", "townhouse", "condo", "apartment"]);

/** Home types for the chosen status. */
export function homeTypeChoices(status: string | undefined): FilterChoice[] {
  return status === "for_rent" ? HOME_TYPES.filter((c) => c.value === ANY || RENT_TYPES.has(c.value)) : HOME_TYPES;
}

export const BEDS_CHOICES: FilterChoice[] = [
  { value: ANY, label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

export const BATHS_CHOICES: FilterChoice[] = [
  { value: ANY, label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
];

/** The filters this source's search shows, in reading order; none unless the server listed them. */
export function shownFilters(source: Pick<DataSource, "search_filters">): Set<FilterName> {
  return new Set((source.search_filters ?? []).filter((f): f is FilterName => FILTER_NAMES.includes(f as FilterName)));
}
const FILTER_NAMES: FilterName[] = ["status", "home_type", "price_min", "price_max", "beds_min", "baths_min"];

/** The beds segment's value for the form's values: "3" (3 or more), "=3" (exactly 3, from "3-bed"), or "any". */
export function bedsValue(values: Record<string, string>): string {
  const n = values.beds_min?.trim();
  if (!n) return ANY;
  return values.beds_exact === "true" ? `=${n}` : n;
}

/** The values after the person picks a beds segment (exact is kept only for the "N only" segment). */
export function withBeds(values: Record<string, string>, picked: string): Record<string, string> {
  const { beds_min: _a, beds_exact: _b, ...rest } = values;
  if (picked === ANY) return rest;
  return picked.startsWith("=") ? { ...rest, beds_min: picked.slice(1), beds_exact: "true" } : { ...rest, beds_min: picked };
}

/** One value of a simple choice filter after a pick ("any" clears it). */
export function withChoice(values: Record<string, string>, name: FilterName, picked: string): Record<string, string> {
  const { [name]: _drop, ...rest } = values;
  const next = picked === ANY ? rest : { ...rest, [name]: picked };
  // A rental cannot be land or multi-family: switching to rent drops a home type it cannot take.
  if (name === "status" && picked === "for_rent" && next.home_type && !RENT_TYPES.has(next.home_type)) {
    const { home_type: _t, ...clean } = next;
    return clean;
  }
  return next;
}

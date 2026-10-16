/**
 * What makes two business facts the SAME fact, and where a fact was found (MKT-172).
 *
 * Values that differ only in formatting are one fact: phones compare as E.164 (US numbers when no country
 * is given), emails lower-cased, everything else with whitespace collapsed and lower-cased. Create writes
 * each fact once, and every row carries the mandate key that found it — never the workflow node's name.
 */

import { parsePhoneNumberFromString } from "libphonenumber-js";

/** The mandate behind the facts agent's findings (keptFacts.ts re-exports the same key). */
export const EARLY_FACTS_MANDATE = "brand_intake.early_facts";
/** The mandate behind the first read of the site, search listing and the address itself. */
export const FIRST_DATA_MANDATE = "brand_intake.first_data";
/** A value the person typed themselves has no mandate. */
export const TYPED_BY_PERSON = "typed_by_person";

/** E.164 when the number parses (US by default), else its digits, else the trimmed text. */
export function normalizePhone(value: string): string {
  const text = value.trim();
  const parsed = parsePhoneNumberFromString(text, "US");
  if (parsed?.number) return parsed.number;
  const digits = text.replace(/\D/g, "");
  return digits ? `+${digits.length === 10 ? "1" : ""}${digits}` : text.toLowerCase();
}

export function normalizeFactValue(kind: string, value: string): string {
  const v = value.replace(/\s+/g, " ").trim();
  if (kind === "phone") return normalizePhone(v);
  if (kind === "email") return v.toLowerCase();
  return v.toLowerCase();
}

/** `kind|normalized value`: the one identity a fact is deduplicated by. */
export function factIdentity(kind: string, value: string): string {
  return `${kind}|${normalizeFactValue(kind, value)}`;
}

/** The mandate key for a finding made by a workflow node (the node's own name is never stored). */
export function foundByForSource(node: string, kind: string): string {
  if (kind === "typed") return TYPED_BY_PERSON;
  return node === "facts" ? EARLY_FACTS_MANDATE : FIRST_DATA_MANDATE;
}

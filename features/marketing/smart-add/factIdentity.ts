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
/** The mandate behind a person's facts, and behind what the what's-new agent reads from a new source. */
export const PERSON_FACTS_MANDATE = "brand_intake.person_facts";
export const WHATS_NEW_MANDATE = "brand_intake.whats_new";
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

/**
 * An address compares without scheme, `www.`, fragment or trailing slash; an account address (`social_profile`)
 * also without its query. `https://www.facebook.com/snowpeak/` and `http://facebook.com/snowpeak` are one account.
 */
export function normalizeAddress(kind: string, value: string): string {
  let v = value.split("#", 1)[0];
  if (kind === "social_profile") v = v.split("?", 1)[0];
  return v.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "").toLowerCase();
}

export function normalizeFactValue(kind: string, value: string): string {
  const v = value.replace(/\s+/g, " ").trim();
  if (kind === "phone") return normalizePhone(v);
  if (kind === "email") return v.toLowerCase();
  if (/^https?:\/\//i.test(v)) return normalizeAddress(kind, v);
  return v.toLowerCase();
}

/** `kind|normalized value`: the one identity a fact is deduplicated by. */
export function factIdentity(kind: string, value: string): string {
  return `${kind}|${normalizeFactValue(kind, value)}`;
}

/** The mandate key for a finding made by a workflow node (the node's own name is never stored). */
export function foundByForSource(node: string, kind: string, mandate?: string): string {
  if (kind === "typed") return TYPED_BY_PERSON;
  // A finding that names the agent which really produced it keeps that mandate (MKT-180): a fact the what's-new agent
  // read is never credited to the facts agent, which may have returned nothing.
  if (mandate) return mandate;
  return node === "facts" ? EARLY_FACTS_MANDATE : FIRST_DATA_MANDATE;
}

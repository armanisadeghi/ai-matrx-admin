/**
 * Staff are KEY PEOPLE, never the brand (Arman, 2026-10-14). A business's site links its team's
 * person-only profiles (LinkedIn /in/); looking one up yields that person's name, photo and bio, which
 * used to land as brand-name candidates ("Gaston Wilder") and logos (their LinkedIn photo). For a
 * business, a person-only profile is a key person: its account row moves to the Key people slot
 * (Yes there = the key_person relationship, saved as a person associated to the brand), and the
 * name / photo / About it yielded never reach the brand's own slots or candidates.
 * A personal brand is the opposite: their /in/ profile IS them, so nothing is filtered.
 */

import type { EvidenceItem } from "./evidence";

/** Profile address forms that only ever name a person (never a company page). */
const PERSON_ONLY = [/linkedin\.com\/in\//i, /linkedin\.com\/pub\//i];

export function isPersonOnlyProfile(url: string | null | undefined): boolean {
  return Boolean(url) && PERSON_ONLY.some((re) => re.test(url as string));
}

/** A business's account row that is a person-only profile: a key person. */
export function isStaffAccount(item: EvidenceItem, person: boolean): boolean {
  return !person && item.field === "social" && isPersonOnlyProfile(item.url ?? item.value);
}

/** A name, photo or About fact read off a person-only profile (a business's staff): not the brand's. */
export function isStaffFact(item: EvidenceItem, person: boolean): boolean {
  return !person && item.field !== "social" && item.source.kind === "social_profile" && isPersonOnlyProfile(item.source.url);
}

/** The findings without the staff facts (a business only). */
export function withoutStaffFacts<T extends EvidenceItem>(items: Iterable<T>, person: boolean): T[] {
  return [...items].filter((i) => !isStaffFact(i, person));
}

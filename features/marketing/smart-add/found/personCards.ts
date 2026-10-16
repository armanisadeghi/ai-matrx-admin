/**
 * The found-first door's PERSON variant (sign-up welcome, SIGNUP-WELCOME.md step 5; smart-add VISION Parts 23, 29).
 * Pure. The same certainty rule as foundCards.ts, which it wraps: two independent hosts (each source counted once),
 * the person's typed or confirmed answers certain at once. A person's grid shows: "Welcome, <first name>" with one
 * line of bio, their site, each certain account, where they are based, and the tools their site uses. Never a
 * category (a page title is never one) and never a competitor: those belong to a business.
 */

import { cleanLine } from "../welcome/peopleGroups";
import { firstNameOf } from "../welcome/firstName";
import { websiteHost, type Decision, type EvidenceItem } from "../evidence";
import { foundAnswers, foundCards, type FoundAccount, type FoundCards, type FoundFact, type FoundInput } from "./foundCards";

export interface PersonPhotoRef {
  url: string;
  /** The stored social profile (its avatar door), when the photo is an account's. */
  profileId: string | null;
}

export interface PersonFoundCards {
  /** The person's name, as they gave or confirmed it. */
  name: EvidenceItem | null;
  firstName: string;
  /** Their login picture, else the lead certain account's. Shown raw. */
  photo: PersonPhotoRef | null;
  /** One line: their site's own description, else a certain account's own bio. */
  bio: { text: string; item: EvidenceItem | null } | null;
  website: EvidenceItem | null;
  accounts: FoundAccount[];
  location: FoundFact | null;
  tools: FoundFact | null;
}

export interface PersonFoundInput extends FoundInput {
  /** The name the login gave (or the person typed). */
  name: string;
  /** The login's own picture (Google, GitHub), when it has one. */
  avatarUrl?: string | null;
}

const isOurs = (d: Decision | undefined) => d === "preferred" || d === "yes" || d === "alias";
/** At most this long, one line. */
export const BIO_MAX = 90;

const sameUrl = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b) && websiteHost(a as string) === websiteHost(b as string) &&
  (a as string).toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "") ===
    (b as string).toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");

function oneLine(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, " ").replace(/(…|\.{3})\s*$/, "").trim();
  if (!s) return null;
  if (s.length <= BIO_MAX) return s;
  const cut = s.slice(0, BIO_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > BIO_MAX / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:|·-]+$/, "")}…`;
}

/** The greeting's name (welcome/firstName.ts): the first word, or the full name when that word is an initial. */
export { firstNameOf };

/** A certain account's own words about the person: its description row (read from that profile) or its bio line. */
function accountBio(accounts: FoundAccount[], items: readonly EvidenceItem[], decisions: Record<string, Decision>): { text: string; item: EvidenceItem | null } | null {
  for (const a of accounts) {
    const url = a.item.url ?? a.item.value;
    const row = items.find((i) => i.field === "description" && decisions[i.key] !== "no" && sameUrl(i.source.url, url));
    const text = oneLine(row?.value) ?? oneLine(a.item.anchor?.bio_line);
    if (text && cleanLine(text)) return { text, item: row ?? null };
  }
  return null;
}

export function personCards(input: PersonFoundInput): PersonFoundCards {
  const base = foundCards(input);
  const name =
    input.items.find((i) => i.field === "name" && isOurs(input.decisions[i.key]) && i.value.trim().toLowerCase() === input.name.trim().toLowerCase()) ??
    input.items.find((i) => i.field === "name" && isOurs(input.decisions[i.key])) ??
    null;
  const siteBio = base.description ? oneLine(base.description.value) : null;
  const bio = siteBio ? { text: siteBio, item: base.description } : accountBio(base.accounts, input.items, input.decisions);
  const lead = base.accounts.find((a) => a.item.image_url);
  const photo = input.avatarUrl
    ? { url: input.avatarUrl, profileId: null }
    : lead?.item.image_url
      ? { url: lead.item.image_url, profileId: lead.item.profile_id }
      : null;
  return {
    name,
    firstName: firstNameOf(name?.value ?? input.name),
    photo,
    bio,
    website: base.website,
    accounts: base.accounts,
    location: base.location,
    tools: base.tools,
  };
}

/** A person grid reached its core: a certain site or account, so "Looks right" has something to confirm. */
export function personCoreReady(cards: PersonFoundCards): boolean {
  return Boolean(cards.name && (cards.website || cards.accounts.length));
}

/**
 * "Looks right" on the person grid: an answer for EVERY card it shows, and only those (foundCards' own answer path,
 * with the business-only cards absent).
 */
export function personAnswers(cards: PersonFoundCards, decisions: Record<string, Decision>): { key: string; decision: Decision }[] {
  const shown: FoundCards = {
    name: cards.name,
    description: cards.bio?.item ?? null,
    logo: null,
    website: cards.website,
    location: cards.location,
    accounts: cards.accounts,
    category: null,
    tools: cards.tools,
    competitor: null,
  };
  return foundAnswers(shown, decisions);
}

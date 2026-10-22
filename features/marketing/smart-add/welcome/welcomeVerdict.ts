/**
 * Sign-up welcome — what the found rules would show, from the evidence alone. Pure; the ONE place the welcome door
 * (SmartAddBrand door="welcome") and the background found search (foundSearchBackground.ts) decide it.
 *
 * - The login's website candidate is "Your site" only when the run shows it is theirs (siteTheirs.ts); until then a
 *   matching website card is dropped.
 * - "Which one is you?" candidates: person-anchor rows not answered no and not a namesake, grouped by peopleGroups.
 * - `onlyTyped`: the only certain cards are the person's own words (their name, a typed city): nothing was found.
 */

import { websiteHost, type Decision, type EvidenceItem } from "../evidence";
import type { Witnesses } from "../found/foundCards";
import { personCards, type PersonFoundCards } from "../found/personCards";
import type { BrandFact } from "../validate/queue";
import { websiteCandidate, type LoginSeed } from "./loginSeed";
import { cardFacts, MAX_PEOPLE, peopleGroups, type PeopleGroups } from "./peopleGroups";
import { accountSites, siteIsTheirs } from "./siteTheirs";

export interface WelcomeVerdictInput {
  /** The evidence as the screen shows it (SmartAddBrand `visible`). */
  items: readonly EvidenceItem[];
  witnesses: Witnesses;
  facts: readonly BrandFact[];
  decisions: Record<string, Decision>;
  seed: LoginSeed | null;
  /** The person's name ("" when there is none yet). */
  name: string;
  /** Anchor rows answered "Namesake". */
  namesakes?: ReadonlySet<string>;
  /** The candidates' photo groups (usePersonPhotoGroups): the same photo is one person. */
  photoGroups?: ReadonlyMap<string, string>;
  /** What the picked card showed, as recorded at the press (typedNameStore readPickedCard); else redrawn. */
  pickedCard?: { place: string | null; company: string | null } | null;
}

export interface WelcomeVerdict {
  candidate: string | null;
  siteTheirs: boolean;
  cards: PersonFoundCards;
  people: PeopleGroups;
  /** A person card was already answered as theirs. */
  picked: boolean;
  /** A proven anchor (GitHub login, their site) or a certain site / account. */
  anchored: boolean;
  /** Nothing beyond their own words. */
  onlyTyped: boolean;
  /** What the picked card showed, now their answer: its place and the company its line named (null: none). */
  pickedFacts: { place: string | null; company: string | null };
  /** Websites their own accounts link to that are not answered yet: theirs, to be answered yes (accountSites). */
  sitesToConfirm: EvidenceItem[];
}

const isOurs = (d: Decision | undefined) => d === "preferred" || d === "yes" || d === "alias";

/**
 * The picked card's facts, recomputed from the accounts answered "me" (taken as one person: they said so) by the same
 * rules that drew the card, so a reload gives the same answer: its place and the company its line named.
 */
export function pickedCardFacts(items: readonly EvidenceItem[], decisions: Record<string, Decision>, name: string): { place: string | null; company: string | null } {
  const mine = items.filter((i) => i.anchor && isOurs(decisions[i.key]));
  if (!name || !mine.length) return { place: null, company: null };
  const { place, company } = cardFacts(mine, name);
  return { place, company };
}

export function welcomeVerdict({ items, witnesses, facts, decisions, seed, name, namesakes, photoGroups, pickedCard }: WelcomeVerdictInput): WelcomeVerdict {
  const candidate = seed ? websiteCandidate(seed) : null;
  const picked = items.some((i) => i.anchor && (decisions[i.key] === "yes" || decisions[i.key] === "preferred"));
  const pickedFacts = picked && pickedCard ? pickedCard : pickedCardFacts(items, decisions, name);
  const siteTheirs = Boolean(candidate && name && siteIsTheirs({ host: candidate, name, items, facts, decisions }));
  const found = personCards({
    items,
    witnesses,
    facts,
    decisions,
    typedWebsiteKey: siteTheirs && candidate ? `website:${websiteHost(candidate)}` : null,
    name,
    avatarUrl: seed?.avatarUrl ?? null,
    work: pickedFacts.company,
  });
  const cards =
    candidate && !siteTheirs && found.website && websiteHost(found.website.url ?? found.website.value) === websiteHost(candidate)
      ? { ...found, website: null }
      : found;
  const candidates = items.filter((i) => i.anchor && decisions[i.key] !== "no" && !namesakes?.has(i.key));
  const people = name ? peopleGroups(candidates, name, MAX_PEOPLE, photoGroups) : { people: [], more: 0 };
  const anchored = Boolean(seed?.githubLogin) || siteTheirs || picked || Boolean(cards.website) || cards.accounts.length > 0;
  const onlyTyped =
    !cards.website &&
    cards.accounts.length === 0 &&
    !cards.bio &&
    !cards.tools &&
    (!cards.location || (cards.location.facts.length === 0 && cards.location.item?.source.kind === "typed"));
  const sitesToConfirm = accountSites(items, decisions).filter((i) => decisions[i.key] === undefined);
  return { candidate, siteTheirs, cards, people, picked, anchored, onlyTyped, pickedFacts, sitesToConfirm };
}

/**
 * Something worth telling the person: the door would show the found grid (a certain card beyond what they typed), or
 * "Which one is you?" has at least one person. Exactly the door's own "nothing found" frame, inverted.
 */
export function welcomeFoundSomething(v: WelcomeVerdict): boolean {
  return !v.onlyTyped || v.people.people.length > 0;
}

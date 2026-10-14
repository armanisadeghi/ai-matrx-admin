/**
 * Smart Add · Compare — which slots compete, and in what order (pure; the dialog only renders it).
 *
 * Arman, 2026-10-14:
 *  - SETTLED ITEMS NEVER APPEAR. A candidate already answered on the page (Yes, No, Other or skipped),
 *    or resolved without asking (a business's staff /in/ profiles go to Key people; the website the
 *    person typed — the site we read — is theirs), is never in a comparison. A slot appears only while 2+ unsettled
 *    candidates remain. Candidates answered INSIDE the compare stay on screen (`kept`) so the person
 *    sees their answer before it moves on.
 *  - THE KNOWN ONE COMES FIRST. Cards are ordered by how sure we are it is theirs: linked from their
 *    site › links back to their site › same handle as a site-linked account › a company page › "we
 *    think" ours › followers. The first card only glows (DecisionControl `suggested`), never answers.
 */
import { compareRows, isOurs, websiteHost, type Candidate, type Decision, type EvidenceItem, type Relation } from "../evidence";
import { isStaffAccount } from "../staff";
import { parseSuggestion } from "../validate/queue";

export interface CompareState {
  decisions: Record<string, Decision>;
  relations: Record<string, Relation>;
  skipped: ReadonlySet<string>;
  /** A personal brand: their /in/ profile is them (nothing is staff). */
  person: boolean;
  /** Sites the person typed or started from: theirs, never compared. */
  ownSites: string[];
}

export interface CompareSlot {
  platform: string;
  candidates: Candidate[];
}

/** The candidate has an answer (Yes / No / a relationship / Skip for now). */
export function isAnswered(c: Candidate, s: Pick<CompareState, "decisions" | "relations" | "skipped">): boolean {
  return Boolean(s.decisions[c.anchor.key] || s.relations[c.id] || s.skipped.has(c.id));
}

const normHandle = (h: string | null | undefined) => (h ?? "").replace(/^@/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const SITE_KINDS = new Set(["website", "link_in_bio"]);
const OURS_CHOICES = new Set(["ours", "preferred", "alias"]);

/** Every key this candidate answers for (its anchor, the bare links that are the same account). */
function keysOf(c: Candidate): Set<string> {
  return new Set([c.anchor.key, ...c.ownKeys, ...(c.anchor.same_as ?? [])]);
}

/** How sure we are a candidate is the brand's (higher first). Weights are lexicographic: one signal beats all below it. */
export function certaintyScore(
  c: Candidate,
  ctx: { siteLinked: ReadonlySet<string>; siteLinkedHandles: ReadonlySet<string>; ownHosts: ReadonlySet<string> },
): number {
  let score = 0;
  const keys = keysOf(c);
  if ([...keys].some((k) => ctx.siteLinked.has(k))) score += 32;
  const linksBack = c.items.some((i) => i.field === "website" && i.key !== c.anchor.key && ctx.ownHosts.has(websiteHost(i.url ?? i.value)));
  if (c.platform !== "website" && linksBack) score += 16;
  if (c.platform !== "website" && ctx.siteLinkedHandles.has(normHandle(c.handle)) && normHandle(c.handle)) score += 8;
  if (/linkedin\.com\/company\//i.test(c.url ?? c.anchor.value)) score += 4;
  const weThink = parseSuggestion(c.anchor.suggestion);
  if (weThink && OURS_CHOICES.has(weThink.choice)) score += 2;
  return score;
}

/**
 * The comparisons to show, in page order: each platform's candidates minus the settled ones (except those
 * `kept` because they were answered here), ranked likeliest first; only slots with 2+ candidates.
 */
export function compareSlots(
  items: EvidenceItem[],
  s: CompareState,
  kept: ReadonlySet<string> = new Set(),
  /** The answers the order is judged by (the dialog passes those it opened with, so cards never jump). */
  rankDecisions: Record<string, Decision> = s.decisions,
): CompareSlot[] {
  const ownHosts = new Set(s.ownSites.filter(Boolean).map((u) => websiteHost(u)));
  // A site we read findings off was a seed: the one the person typed (or one they already confirmed).
  for (const i of items) if (i.source.kind === "website" && i.source.url) ownHosts.add(websiteHost(i.source.url));
  for (const i of items) if (i.field === "website" && isOurs(rankDecisions[i.key])) ownHosts.add(websiteHost(i.url ?? i.value));
  // Accounts the brand's own site (or its link-in-bio page) links to.
  const siteLinkedItems = items.filter((i) => i.field === "social" && SITE_KINDS.has(i.source.kind));
  const siteLinked = new Set(siteLinkedItems.map((i) => i.key));
  const siteLinkedHandles = new Set(siteLinkedItems.map((i) => normHandle(i.handle)).filter(Boolean));
  const ctx = { siteLinked, siteLinkedHandles, ownHosts };

  return compareRows(items)
    .map((row) => ({
      platform: row.platform,
      candidates: row.candidates
        // Resolved without asking: never shown, answered here or not.
        .filter((c) => !isStaffAccount(c.anchor, s.person))
        .filter((c) => !(c.platform === "website" && c.url && ownHosts.has(websiteHost(c.url)) && !kept.has(c.id)))
        .filter((c) => kept.has(c.id) || !isAnswered(c, s))
        .map((c, n) => ({ c, n, score: certaintyScore(c, ctx) }))
        .sort((a, b) => b.score - a.score || a.n - b.n)
        .map((x) => x.c),
    }))
    .filter((row) => row.candidates.length >= 2);
}

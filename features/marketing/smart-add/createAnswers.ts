/**
 * Create's Yes is a person's answer. Every account and website the person said is theirs before Create is recorded on
 * `web.discovered_item` through the validation page's ONE confirm path (`validate/persist.ts` `persistAnswer` with
 * `created`), naming the property / site Create made: status confirmed, relation `ours`, `reviewed_by` the signed-in
 * person, `resolved_property_id` for an account, the site in `context.answer.homes` (and its `caused` edge) for a
 * website. That row is the person evidence research reads (aidream `research/verified_identity.py`
 * `person_validated_properties`, readiness condition 1 "we know which brand is theirs"); before 2026-10-22 Create wrote
 * the property and site with none, so every brand made through Smart Add failed condition 1 although its owner said Yes.
 */

import { websiteHost, type EvidenceItem } from "./evidence";
import type { SuggestContext } from "./webKinds";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { extractErrorMessage } from "@/utils/errors";
import { persistAnswer, type PersistContext } from "./validate/persist";
import { focusFromEvidence } from "./validate/queue";
import { webSiteRoot } from "./relations";

export interface CreatedAnswer {
  item: EvidenceItem;
  created: { propertyId?: string; siteId?: string };
}

/**
 * Pure: which Yes answers Create made a home for. An account → the property made for it; a website the person said
 * Yes to → the site claimed for its host; a web result answered "Ours" that is a site's own root page → the site
 * claimed for it (the caller keeps these out of `routeWebChoices`, so the answer is one row naming the site).
 */
export function createdAnswers(input: {
  accounts: { item: EvidenceItem; propertyId: string }[];
  sites: { url: string; siteId: string }[];
  websites: EvidenceItem[];
  /** Web results the person answered "Ours" (relation kind routing to brand_property). */
  webOurs?: EvidenceItem[];
}): CreatedAnswer[] {
  const out: CreatedAnswer[] = input.accounts.map((a) => ({ item: a.item, created: { propertyId: a.propertyId } }));
  const siteOf = new Map(input.sites.map((s) => [websiteHost(s.url), s.siteId]));
  const seen = new Set<string>();
  // ONE answer names a site (REVIEW5 I1): a website Yes and a web "Ours" on the same host would each record a
  // `caused` edge to it, and undoing either took the site away under the other. The website answer wins; a web
  // result whose site is already named stays with `routeWebChoices` (a row that names no site).
  const named = new Set<string>();
  for (const w of input.websites) {
    const host = websiteHost(w.url ?? w.value);
    const siteId = siteOf.get(host);
    if (!siteId || seen.has(w.key) || named.has(siteId)) continue;
    seen.add(w.key);
    named.add(siteId);
    out.push({ item: w, created: { siteId } });
  }
  for (const w of input.webOurs ?? []) {
    const root = webSiteRoot(w);
    const siteId = root ? siteOf.get(websiteHost(root)) : undefined;
    if (!siteId || seen.has(w.key) || named.has(siteId)) continue;
    seen.add(w.key);
    named.add(siteId);
    out.push({ item: w, created: { siteId } });
  }
  return out;
}

/** The web results this plan records (each kept out of `routeWebChoices`, which would write a second row with no site). */
export function recordedWebKeys(plan: CreatedAnswer[], webOurs: EvidenceItem[]): Set<string> {
  const web = new Set(webOurs.map((w) => w.key));
  return new Set(plan.filter((a) => web.has(a.item.key)).map((a) => a.item.key));
}

/** Record every Create Yes as the person's answer; a failure is returned as a note (said on the page), never silent. */
export async function recordCreateAnswers(
  ctx: PersistContext,
  answers: CreatedAnswer[],
  kinds: BrandRelationKind[],
  suggest: SuggestContext,
): Promise<string[]> {
  const problems: string[] = [];
  for (const a of answers) {
    const focus = focusFromEvidence(a.item, kinds, suggest);
    if (!focus) {
      problems.push(`${a.item.value}: your Yes could not be recorded (no card kind for ${a.item.field})`);
      continue;
    }
    try {
      await persistAnswer(ctx, focus, "ours", { created: a.created });
    } catch (error) {
      problems.push(`${a.item.label ?? a.item.value}: your Yes was not recorded: ${extractErrorMessage(error)}`);
    }
  }
  return problems;
}

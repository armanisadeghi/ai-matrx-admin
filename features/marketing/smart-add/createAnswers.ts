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

export interface CreatedAnswer {
  item: EvidenceItem;
  created: { propertyId?: string; siteId?: string };
}

/**
 * Pure: which Yes answers Create made a home for. An account → the property made for it; a website the person said
 * Yes to → the site claimed for its host. A site from a web result answered "Ours" has no website finding here (its
 * answer is kept by `routeWebChoices`), so it is not listed.
 */
export function createdAnswers(input: {
  accounts: { item: EvidenceItem; propertyId: string }[];
  sites: { url: string; siteId: string }[];
  websites: EvidenceItem[];
}): CreatedAnswer[] {
  const out: CreatedAnswer[] = input.accounts.map((a) => ({ item: a.item, created: { propertyId: a.propertyId } }));
  const siteOf = new Map(input.sites.map((s) => [websiteHost(s.url), s.siteId]));
  const seen = new Set<string>();
  for (const w of input.websites) {
    const host = websiteHost(w.url ?? w.value);
    const siteId = siteOf.get(host);
    if (!siteId || seen.has(w.key)) continue;
    seen.add(w.key);
    out.push({ item: w, created: { siteId } });
  }
  return out;
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

/**
 * Smart Add teaches the known-domain registry (lib/web-domains): every web result the person answered with
 * a kind that names exactly ONE known-domain category (Review site → review_site, Our press release →
 * press_release…) is recorded as a `person_answer` observation. The database learns on that write —
 * agreeing answers from independent sources add the host for everyone; disagreements go to an admin.
 *
 * Fire and forget: the answer itself is already saved by routeWebChoices; a failed observation is logged.
 */

import type { BrandRelationKind } from "@/features/marketing/data/service";
import { recordDomainObservation } from "@/lib/web-domains/service";
import type { EvidenceItem } from "./evidence";
import type { WebChoice } from "./webKinds";

/** The observations one save makes (pure): url + category for each answer whose kind names one category. */
export function webAnswerObservations(
  items: readonly EvidenceItem[],
  choices: Record<string, WebChoice>,
  kinds: readonly BrandRelationKind[],
): { url: string; category: string }[] {
  const byKey = new Map(kinds.map((k) => [k.key, k]));
  const out: { url: string; category: string }[] = [];
  for (const item of items) {
    const kind = byKey.get(choices[item.key]?.kind ?? "");
    const url = item.url ?? item.value;
    if (!kind || kind.match.categories.length !== 1 || !url || !/[a-z0-9-]\.[a-z]{2,}/i.test(url)) continue;
    out.push({ url, category: kind.match.categories[0] as string });
  }
  return out;
}

export function recordWebAnswers(
  organizationId: string,
  items: readonly EvidenceItem[],
  choices: Record<string, WebChoice>,
  kinds: readonly BrandRelationKind[],
): void {
  for (const o of webAnswerObservations(items, choices, kinds)) {
    void recordDomainObservation(organizationId, o.url, o.category, "person_answer", "smart_add");
  }
}

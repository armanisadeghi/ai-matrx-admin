/**
 * The evidence as the Smart Add screen shows it: own-account rows and staff facts set aside, ordered, non-contact
 * mailboxes and repeated text dropped, each finding carrying its suggestion. Pure; SmartAddBrand's `visible` and the
 * background found search (welcome/foundSearchBackground.ts) both read it here.
 */

import { categoriesFor, liveKnownDomainRules } from "@/lib/web-domains/registry";
import { orderedEvidence, withoutNonContactEmails, withoutRepeatedText, type Decision, type EvidenceItem } from "./evidence";
import { withoutOwnAccountRows } from "./ownAccountRows";
import { withoutStaffFacts } from "./staff";
import { withSuggestions, type WeThinkSuggestion } from "./weThink";

export function visibleEvidence(
  items: Iterable<EvidenceItem>,
  decisions: Record<string, Decision>,
  person: boolean,
  suggestions: Record<string, WeThinkSuggestion>,
): EvidenceItem[] {
  // Staff profiles' names, photos and bios never reach a business's own slots (they are key people).
  return withSuggestions(
    withoutRepeatedText(
      withoutNonContactEmails(orderedEvidence(withoutStaffFacts(withoutOwnAccountRows(items, decisions), person)), (host) =>
        categoriesFor(host, liveKnownDomainRules() ?? []).includes("non_contact_mail"),
      ),
      decisions,
    ),
    suggestions,
  );
}

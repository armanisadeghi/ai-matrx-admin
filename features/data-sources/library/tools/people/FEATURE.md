# FEATURE.md — Tools home: people & company lookups

Program: `../common-docs/projects/third-party-services/` (lane L12b). Parent: the Tools home (`/data/library`, `../ToolPage.tsx`). No second screen: these are pieces of the home and the Tool page.

## What it does

- **One box picks the Tool.** `planLookup` reads what was typed in the Tools search box: website → Company profile, email → Email check, phone → Phone check, "Ari Weinzweig at zingermans.com" → Work email. `LookupSuggestion` offers it above the list with the Tool's own price; nothing runs until the press (`?tool=<job key>&with=<inputs>&run=1`).
- **Next steps, one visible press at a time.** `nextSteps` (company → find emails / check its phone; work email → check it) renders `NextSteps` buttons with each Tool's price; each opens a `FollowUpCard` under the answer that runs once and shows its own cost.
- **Found is not verified.** A finder's address reads "Found, not confirmed yet" (`AddressStatus`); only an Email check verdict of good (`email_verdict` v2 `deliverable: "yes"`) reads confirmed; the email kinds carry only our words (`role`, `shared_inbox`, `score`, `status`, `deliverable`, `reason`), never a source's own fields. `partyToKeep` never attaches an address to the CRM until a check confirmed that exact address; an unconfirmed one stays out of the person's contact points (features/crm/FEATURE.md: a candidate is never a contact). After a later check, "Add the confirmed email" attaches it to the same person.
- **Save to CRM** (`KeepInCrm`) goes through `resolveParty` (find-or-create, never doubles). Save to a table is the existing `ToolResultTableBar`.
- **CRM doors.** A phone or email contact point and a company's card link to the same Tools home with the box filled (`toolLookupHref`); a link never presses the button.
- Empty answers show "Nothing found. You weren't charged." (R-16: the server never charges them).

## Files

`lookupPlan.ts` (pure: plan, next steps, what to keep, `toolLookupHref`) · `LookupSuggestion.tsx` · `ToolFollowUps.tsx` · `KeepInCrm.tsx` · `../useToolCall.ts` (one durable call as the page lives it) · tests in `__tests__/`.

## Change log

- 2026-10-17 — built (L12b).

# FEATURE.md — `marketing/smart-add`

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-10-14`

---

## Purpose

Smart Add Brand: a person types a website, a social link or a name, Smart Add finds the brand (or person) and they confirm what it found. Product truth (vision, spec, paths): `../common-docs/systems/marketing/websites-and-brands/projects/smart-add-brand/` (SPEC.md, VISION.md, PATHS.md, ENRICH.md).

---

## Entry points

**Routes** (`app/(core)/marketing/brands/smart-add/`). The UI lives in `layout.tsx`, so one session survives moving between sibling routes. The pages only name the address.

- `/marketing/brands/smart-add` redirects to `/company` and keeps the query.
- `/marketing/brands/smart-add/company` is a business (the default).
- `/marketing/brands/smart-add/person` is a person.
- `/marketing/brands/smart-add/found` is the found-first door (VISION Part 23): the SAME company session (`SmartAddBrand door="found"`), whose first findings screen is a calm card grid of only the certain facts (`found/FoundStage.tsx`). "Looks right" gives the full review's answers for exactly what is shown (`foundAnswers`) and opens the full page in place; the way out ("Not quite": Fix something / Not this business / Start over) opens it unanswered or restarts. A session whose name and website are already confirmed skips the grid. Offered beside Smart Add in the Add brand dialog (`marketingRoutes.smartAddFound`).
- `/marketing/brands/smart-add/enrich/<brandId>` enriches one existing brand (`enrich/`).

**Components / hooks**
- `SmartAddBrandPage.tsx` — header + stage; picks enrich or `SmartAddBrand` from the address.
- `SmartAddBrand.tsx` — the session (rounds, evidence, decisions, create). Its optional `url` prop is the address binding; the lab and enrich run without one.
- `SmartAddHero.tsx` — the intake stage (way-in cards, fields, kind toggle).
- `useSmartAddAddress.ts` — reads and writes the address.
- `smartAddUrl.ts` — the address grammar: the ONE parser and builder (`parseSmartAddUrl`, `patchSmartAddSearch`, `smartAddHref`, `smartAddEnrichHref`). `marketingRoutes.smartAddBrand(link?)` / `.smartAddEnrich(id)` delegate to it; every link to Smart Add uses them.

---

## URLs

| Address | Meaning | History |
|---|---|---|
| `/smart-add/company`, `/smart-add/person` | the kind | switching kind is `router.push` (Back flips it back) |
| `/smart-add/found` | the company kind through the found-first door (`parseSmartAddDoor`, `smartAddFoundHref`; same query grammar, deep links auto-start the same way) | a link |
| `/smart-add/enrich/<brandId>` | enrich that brand | a link |
| `/smart-add/validate/<brandId>` | the validation stage from the brand's saved findings; Create (core settled) switches the address here (`toValidate`: replace, no navigation, the live session stays mounted via `validateAddressOwner`); a reload loads saved data and starts no round | replace after Create |
| `?via=website\|social\|name` | the open way-in card (when absent: implied by a prefill; `/person` opens the name fields) | pushed without navigating (Back closes the card) |
| `?website=ritualcoffee.com` | company prefill | typing replaces it, debounced 400 ms |
| `?social=@handle` or a profile URL (encoded) `&platform=instagram` | social prefill (`platform` only beside `social`) | replace |
| `?name=…&occupation=…&company=…&city=…` | person prefill (`name` + `city` also name a business) | replace |
| `?email=…` | an email typed on the name card (person or company); an email typed or pasted in ANY box (`emailInput.ts`) is read as one and starts the email round: aidream step `email` (domain → website unless a free mailbox host, name hints, free web/GitHub/Gravatar lookups). Developer/creator sites (GitHub, Hugging Face, Substack, Bluesky…) show as accounts through `social/profile-sites.ts` (label, tile, address); Create keeps them as `other` properties, never tracked accounts | replace |
| `?run=<uuid>[,<uuid>…]` (one param, comma list, oldest first; a repeated `run=` is still read) | the session's rounds | replaced as each round starts |
| `?view=compare` | the compare dialog (`compare/CompareDialog.tsx`; only slots with 2+ unsettled candidates, likeliest first) | push (Back closes it) |
| `?panels=smart_add_helper:<method>` | a helper window (linkedin, google, facebook, instagram, threads, tiktok, youtube, grok) | the window-panels URL sync |

Rules:
- Param names are lowercase. They are read case-insensitively and written lowercase in a fixed order.
- An invalid value is dropped and never causes an error. That covers an unknown via, platform or view, a non-uuid run, text over 300 characters, and an enrich segment that is not one safe path segment.
- Writes go through `@/lib/url-state/addressWithoutNavigating`, so they make no RSC fetch and cause no remount. A write keeps every key it does not own, such as `panels`.
- 🚨 **Auto-start spends points.** A link that carries a prefill (`website`, `social`, or `name`) starts searching on open, as if Go was pressed. That is the purpose of the link. It happens once per address per tab (sessionStorage `smart-add:auto-started`). A reload, Back/Forward or a duplicate tab never starts a second run. A person link with no occupation or company stops at the one "job or company" ask.
- **First data:** the name, logo and description rows fill from the web step's own-site listing the moment it lands (`firstData.ts`), even when the site blocks a direct read; the facts agent's brand name, phone, email and category merge into the same rows later under the server's keys, so nothing on screen resets.
- **Resume:** an address with `run=` rebuilds those rounds from the server (`SmartAddRound` → `useWorkflowRun`) and starts nothing. The typed fields come back from the address. Every answer given on screen before Create (Preferred / Ours / Not us / Related, web kinds, typed values, Skip for now, Tagline moves, the web review's Ask me later / Ignore) is saved as they are given in the person's own `users.user_surface_state` row (feature `smart_add`, surface_key = the first run id; `runMemory.ts`; never in preferences, which ride every page load) and restored with the run; `ANSWER_KINDS` in `runMemory.ts` lists every kind and `runMemory.test.ts` fails when a new one is not saved. A name moved to Tagline leaves the name list and is undone from its About item. After Create they live in `web.discovered_item`.
- **Back / Edit / Start over:** starting a search pushes one history entry (`markSearch`), so browser Back returns to the entry with what was typed and stops the search. The pencil on the input pill and the answer's Edit stop the runs, reset the session and reopen the field; "Start over" (stage "Still working…" row and the findings page's working line) also clears the address. Either asks first (canonical `confirm`) only when findings or answers would be lost, naming the points spent.
- Nothing personal goes in the address beyond what the person typed into these fields. The active organization is never in it.

---

## Honest endings (`entryOutcome.ts`)

Every typed entry ends in one answer. The server's first-data point carries `entry_outcome` (aidream `services/brand_intake/entry_outcome.py`); a not-confirmed entry skips every agent. The client reads it (`RoundView.entry`), or infers it from the step notes of a finished run whose only "finding" is the facts agent's guess. A failed entry never morphs into the findings page and never offers Create.

| Input | Outcome | Stage |
|---|---|---|
| handle not found / private / empty / unsupported platform / out of points | `not_found` · `private` · `empty` · `unsupported` · `usage_limit` | title + one line; Edit · Try another · Search by name |
| lookup service failed | `provider_failed` | + Try again |
| domain does not resolve / times out / refuses us / errors / parked | `no_such_site` · `timed_out` · `blocked` · `site_error` · `parked` | same (Try again on the transient ones); a dead domain is never searched |
| malformed URL or a handle with characters the platform forbids | never starts | inline line under the field, Go disabled |
| run quiet past knob `marketing.smart_add_quiet_seconds` (40) | still running | "Still working…" · Stop · Start over |
| run failed / errored | failed | "The lookup didn't finish" + three quick answers |

Tests: `__tests__/entryOutcome.test.ts` (state machine, inference, copy budgets, up-front checks).

## You already have this brand (`brandMatch.ts`)

Checked while the entry is typed (before any search is paid for; Go holds until the person answers) and again from the round's confirmed site, accounts and name. A brand the person can see in any organization matches on the same site domain, the same account (platform + handle), or the same normalized name with a shared city or domain name; a name of only common words never matches. One notice (`ExistingBrandNotice`, laid over the space under the entry row and above the Create bar, never moving the page): Open it, Add what's new to it (enrich, carrying the typed or confirmed website and account in `?website=&social=&platform=`), Create a separate brand. Create asks once with the canonical confirm when a match is unanswered. Reads: `brandMatchLive.ts` (four narrow queries under row security, then one for the matched brands).

Each listed brand carries a detail line (organization, site, account count, created date) so same-name brands read apart. The rules are feature knobs `smart_add.brand_match.generic_words`, `.shared_hosts`, `.name_min_length`, `.candidate_limit` (organization-overridable; a missing knob raises, no fallback list). The Create step is `createGate.ts`.

## Weak names (`nameStrength.ts`, `FullNameAsk.tsx`)

The server (aidream `services/brand_intake/name_strength.py`) scores every confirmed name and never searches a weak
one ("Sarah") alone. The screen sends the anchors (`confirmed.handles`, `confirmed.links`, via `nameAnchors`), reads
each name search step's `name_strength` (`SmartAddRound` → `onNameStrength`), offers the inline "Full name?" field
under the Name slot only when `full_name_asked`, and sends the typed value as `confirmed.full_name` /
`person.full_name` (a fact apart from the display name). Builder › Decisions shows the verdict and every keyword sent.

## Found first: what "certain" means (`found/foundCards.ts`)

A card needs two independent HOSTS. Each finding's witness is the host it was read from, once however it arrived: the brand's own site (every page, a web result on it, a fact citing it) is one; facebook.com is one; the web tier counts only results its rules call `certain`. The facts agent is never a witness itself: a `confirmed`/`likely` fact adds the hosts it cites. Typed or confirmed = certain; a website the person typed or confirmed is vouched for, so what that site says about itself (name, logo, description, address) is certain from that one host, while a site we found still needs a second host; Not us removes a card; a category equal to a name the site gives itself (title, og:site_name) is never shown. The tally rides `onEvidence` (`addWitnesses`, found door only). "Looks right" answers every card: evidence rows through their slot, facts behind a card (a city, tools, a competitor) as Yes under the fact's own key, which Create reads (`decisions[fact.key]`) and the validation queue treats as answered. The grid's shape is fixed from the first frame; a slot that settles without a certain value stays as a quiet "Not sure" box. Guard: `__tests__/foundCards.test.ts` (fullspecstaff round; nlpkak title-as-category case).

## Every answer names the person (single-source plan § 2.2)

Create's Yes is a person's answer (`createAnswers.ts`): every account and website said Yes to before Create is recorded on `web.discovered_item` through the validation page's ONE confirm path (`persistAnswer` with `created`: confirmed, relation `ours`, `reviewed_by` the person, `resolved_property_id` / the site in `context.answer.homes` with its `caused` edge, `from: smart_add.create`), naming the home Create made and writing no second one. A web result answered "Ours" whose own root page became one of the brand's sites goes the same way (`createdAnswers` `webOurs`, naming that site), and is kept out of `routeWebChoices`, whose row names no site. That row is what research reads as "a person said this is theirs" (aidream `research/verified_identity.py` `person_validated_properties`, readiness condition 1). Guard: `__tests__/createAnswersEvidence.test.ts`.

The brand's OWN accounts and websites no person confirmed (`validate/unconfirmed.ts`; a brand made before Create recorded its Yes, a seat's Create, an import) are asked on the validation page as ordinary cards (Yes = ours / Not us, "On your brand"), although the brand already knows them: `fromSaved.ts` returns them as `unconfirmed`, and `foldQueue` `unconfirmed` keeps them past the known filter. "Confirmed" mirrors the server's `person_validated_properties` (an account named by a person-confirmed `ours`-family answer; a host named by a person-confirmed link / identity answer); a test seat's review cannot be told apart in the browser, so it counts. Each card is answered through `persistAnswer` with the existing home as `created` and `existing: true`: Yes writes the same person-evidence row Create writes (`from: smart_add.validate`, `context.answer.kept` = the homes that predate it); its Undo, now or on a later visit (`savedAnswers.ts`), takes back only the answer, never the home. Not us withdraws the home through `web.decision_retraction` (root site and/or property, Not us off: the answer adds its own NO LIST entry), keeps the summaries in `context.answer.before.retractions`, and Undo restores exactly them (`restoreRetraction`). Guard: `__tests__/confirmExistingHomes.test.ts`.

Taking back a website an answer made (the in-session Undo in `validate/persist.ts` `addSite`, and an earlier answer through `validate/savedAnswers.ts` — the brand page's table, a reopened Enrich) goes through `web.decision_retraction` AS THAT ANSWER (root `decision`, apply on, Not us off; `data/retraction.ts` `withdrawSite(siteId, decisionId)`), never a bare site delete: the site's crawl and ingest are cancelled, its pages and `site_id` findings follow it, and every still-pending finding and every UNCONFIRMED fact read only from its host is withdrawn. Nothing a person confirmed, typed or answered is withdrawn or rewritten: a fact with `confirmed_by`, a `manual` fact, or one a live answer resolves to is kept (`facts_kept`), and a site another live answer still names stays (`site_kept`) with that other answer untouched. Root `site` (a typed gap website, the brand page) acts on a decision only when exactly ONE live answer names the site. One site is named by one Create answer (`createdAnswers` dedupes by site). Guards: `__tests__/undoWithdrawsSiteFindings.test.ts`, `select * from web.__decision_retraction_selftest()` (all ok). Guard: `__tests__/undoWithdrawsSiteFindings.test.ts`.

A site's removal (any path: Undo, retraction, a bare delete) withdraws only its PENDING `site_id` findings: the database trigger `web._site_removal_keeps_answers` (BEFORE update of `deleted_at` on `web.site`) first detaches every non-pending finding (`site_id` null, `context.site_removed`), so the platform cascade never takes an answer; restoring the site re-attaches them (AFTER trigger `_site_restore_reattaches_answers`, same function). Guard: `select web.__site_removal_keeps_answers_selftest()` (ok true). Offering findings carry the site their url was read from, none for an account (aidream `brand_offerings/run.py` `site_for_url`).

The Answered tray (`validate/savedAnswers.ts` `loadSavedAnswers`) lists answers given on the validate page AND at Create (`ANSWERED_FROM`: `context.answer.from` `smart_add.validate` / `smart_add.create`); a Create answer's Undo is the same `undoSaved` path (Create's property / site taken back, finding to pending). Guard: `__tests__/answeredTrayCreateAnswers.test.ts`.

Every write that sets `reviewed_at` (`web.discovered_item`) or `confirmed_at` (`web.business_fact`, `web.brand_asset`) also sets `reviewed_by` / `confirmed_by` to the signed-in person (`signedInPersonId`, `utils/supabase/webDb.ts`): Create (`keptFacts.ts`), every validation answer and its undo (`validate/persist.ts`, `validate/savedAnswers.ts`), and the shared writers in `data/service.ts`. A pending answer (other than "later") names nobody. The database refuses a confirmation by an agent or job, or one naming someone else (`web._fact_person_confirms`, `web._finding_person_reviews`); server relays go through aidream `brand_profile/confirm_door.py`. Guard: `features/marketing/__tests__/confirmWritersNamePerson.test.ts`.

## One card asks about ONE thing (Arman, 2026-10-22)

The validation page (`validate/fold.ts`) folds findings only when they are copies of the SAME thing: one phone in two spellings, one street with and without its city, one account at two addresses, one person under two spellings, one picture at two image addresses (`img:` key) or the server's near-identical-image group (`foldQueue` `samePicture`, filled by `SmartAddValidate.tsx` from `useLogoGroups`), the About lines (MKT-044), and web results on one site (the answer is about the site). Different things are always different cards: no key covers a whole kind (the generic `logo` key that folded every logo into one "Logos · N" card is gone), and there are no set cards (services, categories, locations, licenses, metrics were answered at once with switches; each value is now its own card). A logo card shows its one picture; the tray reads "Logo". A near-identical copy of an answered picture is not asked again (its group's images join `known.images`). The brand session deck reads the same `foldQueue`, so it gets one finding per card too. Guard: `__tests__/validateFold.test.ts`.

## Change Log

- 2026-10-22 (g) — Yes on a validate NAME card is "alias" once the brand has a real name (`queue.ts` `yesNoFor`); "preferred" (rename) only while it has none or names the same name — P / Other still pick Preferred. Live: Four Barrel Coffee (fresh Smart Add brand) was renamed to its LinkedIn display name "FOURBARREL COFFEE" by one Yes. Guard `__tests__/nameYesIsAlias.test.ts` (red with the old rule, green now).
- 2026-10-22 (f) — One card asks about one thing: each logo picture and each multi-value fact (service, category, location, license, metric) is its own card; only copies of the same thing fold (same image address or server image group). Set cards and their switches are removed. Guard: `validateFold.test.ts`.
- 2026-10-22 (e) — The brand's own accounts and websites no person confirmed are asked on the validation page (Yes = ours / Not us), answered through `persistAnswer` naming the existing home (`existing`); before, the known filter hid them and there was no place to confirm them, so research condition 1 could never pass for 70 of 71 Smart Add brands. Guard: `confirmExistingHomes.test.ts`.
- 2026-10-22 (d) — REVIEW5: Undo of a website never deletes a person's fact (`web.decision_retraction` keeps confirmed, typed and answered facts) and acts as exactly the answer undone (root decision; a site another live answer names stays, that answer untouched). Create names a site with ONE answer. Restoring a site re-attaches the answers its removal detached. Before: a dry run on Bare Chiropractic's site would have deleted 4 confirmed facts (none were actually lost: the commit was not yet released).
- 2026-10-22 (c) — The Answered tray lists Create's answers too, with Undo (`ANSWERED_FROM`). A site's removal never withdraws an answered finding (DB trigger `web._site_removal_keeps_answers`, self-test `web.__site_removal_keeps_answers_selftest`). Offering findings carry the site their url was read from (aidream `site_for_url`); live repair: 250 pending offering rows re-filed (122 to the right site, 128 to none), Bare Chiropractic's 7 account-read offerings restored to pending. Stale tests fixed: compact count voice `12.4k`; OutboundLink renders the plain href (referral added when followed).
- 2026-10-22 (b) — A web result answered "Ours" at Create that became a site is recorded through `persistAnswer` naming that site (before: only `routeWebChoices`' row, no site named, so the site was not person-validated). Undoing an "Ours" website withdraws it through `web.decision_retraction` (`withdrawSite`) so what its crawl found goes with it (before: a bare `deleteSite` left its crawl running and its pending findings asked). Guards: `createAnswersEvidence.test.ts`, `undoWithdrawsSiteFindings.test.ts`.

- 2026-10-22 — `runMemory.ts` reads and writes its `users.user_surface_state` row through the shared door `lib/surface-state/userSurfaceState.ts` (also the question desk's answer drafts); a refused read now says so in a toast.

- 2026-10-22 — Every Smart Add and validation answer records who gave it (`reviewed_by` / `confirmed_by`), guarded in code and in the database (single-source plan step 1).

- 2026-10-22 — Create records each Yes (website, accounts) as the person's confirmed answer through `persistAnswer` (`createAnswers.ts`); before, a brand made through Smart Add had no person evidence and failed research condition 1. Undo on an earlier answer (the Answered list after a reload) puts the card back even when the brand, read on load, already knows the site or account that answer wrote (`foldQueue` `reopened`); before, it vanished. Guards: `createAnswersEvidence.test.ts`, `validateFold.test.ts`.
- 2026-10-17 — Enrich web answers are saved the moment they are given (`webDecisions.ts` `WebDecisionSaver` → `validate/persist.ts` → promotion; `enrich/useEnrichWebDecisions.ts`), restored on a reopened Enrich, flushed at Apply and counted on "Changes to your brand"; the brand page's On the web tab (`components/brands/BrandWebDecisionsSection.tsx`) lists every web answer by relationship and changes one in place. Before this, Enrich kept them only in memory and Apply wrote none (40+ answers lost on 2026-10-17). A re-answer after Undo revives its soft-deleted row (the dedup index is not partial). Guard: `__tests__/enrichWebDecisions.test.ts`.
- 2026-10-17 (b) — Changing or clearing a web answer takes back what it created, on this visit and on a later one: the promotion's created ids (competitor, person link, listing, location, keyword, backlink, offering) are kept on the answer's row (`context.answer.promoted`, `validate/persist.ts` `recordPromoted`; promotions run one at a time per brand so ids belong to the right answer) and `validate/savedAnswers.ts` `retractSavedAnswer` removes exactly them (the brand page table and a reopened Enrich both use it). A website the brand already tracked is never recorded as the answer's home, so it is never deleted. Ask me later / Ignore on a web result are saved (`recordMark`: later = pending + answer "later"; ignore = dismissed), shown again on reopen and listed in the On the web tab. Guard: `__tests__/enrichWebDecisions.test.ts`.
- 2026-10-16 — Nothing dies: an enrich round is named on the brand as it starts (`registerBrandSmartAddRuns`), so the findings it makes later land and promote like Create's; the Discovery inbox starts every fact on its server-rule kind (never a dead Confirm), confirms a kept fact in place (no duplicate) and promotes after every confirm; products and services open the Offerings screen from the inbox.
- 2026-10-16 — Fact evidence addresses are only ever complete: a cut-off streamed address is dropped or replaced by the one that completes it (`completeUrls`, at parse and in `grownFact`). Guard: `__tests__/factEvidenceUrlsComplete.test.ts`.
- 2026-10-16 — Found-first door (`/smart-add/found`, VISION Part 23): card grid of certain facts, one "Looks right" with a way out, then the full review in place on the same session.

- 2026-10-16 — Promotion moved to the server, every census type: Create and every confirmed validation answer call aidream `POST /brand-intake/promote/{brandId}` (`promote.ts` is only its client + `undoPromotion`); the rules live once in aidream `services/brand_profile/promote.py` (competitor, person, location, listing, keyword, backlink, offering, industry, typed fact kinds; confirmed only, Not us / match-only / Maybe never). Create records `metadata.smart_add.runs`, so the round's facts step finishing after Create keeps the late facts on the brand and promotes them server-side (`brand.identify.land_late_findings`). Guards: `__tests__/promoteFindings.test.ts` (client holds no rule), aidream `brand_profile/tests/test_promote.py` (each type lands).
- 2026-10-16 — Promotion: what Create and the validation page keep on the brand reaches its real home through ONE reconcile, `promote.ts` (`promoteSmartAddFindings`, one promoter per type in `PROMOTERS`; idempotent, insert-if-missing). Competitors with a domain → `seo.competitor` on the brand's first site; name/handle-only rivals stay in `web.brand.profile.competitors`, which the Competitors page now lists (`listBrandCompetitors` step 6). Before, every Smart Add rival sat in the profile list the page never read. Guard: `__tests__/promoteFindings.test.ts`.
- 2026-10-16 — Validate answers survive background brand writes: brand writes rebase when only other fields moved (`updateBrand` `base`), profile edits merge on the current profile (`mergeBrandProfile`); a refused answer is filed (`unsaved-work`) and toasted (`validate/notSaved.ts`); an About confirmed at Create is never asked again (`KnownOnBrand.about`). Guards: `validateStaleBrand`, `validateAboutSettled`, `validateNotSaved` tests (MKT-151, MKT-175).
- 2026-10-15 — Weak names: anchors sent with every round, inline "Full name?" field, Decisions › Name strength.
- 2026-10-14 — Duplicate check: detail line per brand, rules moved to feature knobs, Create step extracted and tested.
- 2026-10-14 — Duplicate-brand detection: brandMatch, notice at entry and above Create, enrich carry.
- 2026-10-14 — Honest endings: entry outcomes (server + inferred), up-front URL/handle checks, quiet-time "Still working…" with Stop / Start over, Edit truly restarts, browser Back returns to the entry, Start over with a confirm when work would be lost.

- 2026-10-14 — Link-in-bio pages (Linktree, Stan, Beacons…) are "Link pages": their own spot (`SmartAddBioLinks.tsx`, `linkPages`), auto-kept as relation `link_in_bio_page` on Create, never a website candidate (`compareRows`) and never compared (`isSettledWithoutAsking` also settles typed items). One service list mirrors the server registry (`lib/link-in-bio.ts`); guard `__tests__/linkPages.test.ts`.
- 2026-10-14 — Smart Add gets real URLs: mode routes, deep links, `run=` resume, `via`/`view`, helper `?panels=`; `smartAddUrl.ts` + tests (`__tests__/smartAddUrl.test.ts`).
- 2026-10-14 — Run memory saves every answer kind (skips, tagline moves, web marks); the name row leaves the list on Tagline (Undo on About); mobile Yes/No/Other no longer pushed off the left edge beside an Open link; the run attach reads the row and the event log at once.

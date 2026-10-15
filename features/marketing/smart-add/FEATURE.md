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
| `/smart-add/enrich/<brandId>` | enrich that brand | a link |
| `/smart-add/validate/<brandId>` | the validation stage from the brand's saved findings; Create (core settled) switches the address here (`toValidate`: replace, no navigation, the live session stays mounted via `validateAddressOwner`); a reload loads saved data and starts no round | replace after Create |
| `?via=website\|social\|name` | the open way-in card (when absent: implied by a prefill; `/person` opens the name fields) | pushed without navigating (Back closes the card) |
| `?website=ritualcoffee.com` | company prefill | typing replaces it, debounced 400 ms |
| `?social=@handle` or a profile URL (encoded) `&platform=instagram` | social prefill (`platform` only beside `social`) | replace |
| `?name=…&occupation=…&company=…&city=…` | person prefill (`name` + `city` also name a business) | replace |
| `?run=<uuid>` (repeated, oldest first) | the session's rounds | replaced as each round starts |
| `?view=compare` | the compare dialog (`compare/CompareDialog.tsx`; only slots with 2+ unsettled candidates, likeliest first) | push (Back closes it) |
| `?panels=smart_add_helper:<method>` | a helper window (linkedin, google, facebook, instagram, threads, tiktok, youtube, grok) | the window-panels URL sync |

Rules:
- Param names are lowercase. They are read case-insensitively and written lowercase in a fixed order.
- An invalid value is dropped and never causes an error. That covers an unknown via, platform or view, a non-uuid run, text over 300 characters, and an enrich segment that is not one safe path segment.
- Writes go through `@/lib/url-state/addressWithoutNavigating`, so they make no RSC fetch and cause no remount. A write keeps every key it does not own, such as `panels`.
- 🚨 **Auto-start spends points.** A link that carries a prefill (`website`, `social`, or `name`) starts searching on open, as if Go was pressed. That is the purpose of the link. It happens once per address per tab (sessionStorage `smart-add:auto-started`). A reload, Back/Forward or a duplicate tab never starts a second run. A person link with no occupation or company stops at the one "job or company" ask.
- **First data:** the name, logo and description rows fill from the web step's own-site listing the moment it lands (`firstData.ts`), even when the site blocks a direct read; the facts agent's brand name, phone, email and category merge into the same rows later under the server's keys, so nothing on screen resets.
- **Resume:** an address with `run=` rebuilds those rounds from the server (`SmartAddRound` → `useWorkflowRun`) and starts nothing. The typed fields come back from the address. Every answer given on screen before Create (Preferred / Ours / Not us / Related, web kinds, typed values, Skip for now, Tagline moves, the web review's Ask me later / Ignore) is saved as they are given in the person's synced preferences (`smartAdd.runs`, keyed by the first run id; `runMemory.ts`) and restored with the run; `ANSWER_KINDS` in `runMemory.ts` lists every kind and `runMemory.test.ts` fails when a new one is not saved. A name moved to Tagline leaves the name list and is undone from its About item. After Create they live in `web.discovered_item`.
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

## Change Log

- 2026-10-15 — Weak names: anchors sent with every round, inline "Full name?" field, Decisions › Name strength.
- 2026-10-14 — Duplicate check: detail line per brand, rules moved to feature knobs, Create step extracted and tested.
- 2026-10-14 — Duplicate-brand detection: brandMatch, notice at entry and above Create, enrich carry.
- 2026-10-14 — Honest endings: entry outcomes (server + inferred), up-front URL/handle checks, quiet-time "Still working…" with Stop / Start over, Edit truly restarts, browser Back returns to the entry, Start over with a confirm when work would be lost.

- 2026-10-14 — Link-in-bio pages (Linktree, Stan, Beacons…) are "Link pages": their own spot (`SmartAddBioLinks.tsx`, `linkPages`), auto-kept as relation `link_in_bio_page` on Create, never a website candidate (`compareRows`) and never compared (`isSettledWithoutAsking` also settles typed items). One service list mirrors the server registry (`lib/link-in-bio.ts`); guard `__tests__/linkPages.test.ts`.
- 2026-10-14 — Smart Add gets real URLs: mode routes, deep links, `run=` resume, `via`/`view`, helper `?panels=`; `smartAddUrl.ts` + tests (`__tests__/smartAddUrl.test.ts`).
- 2026-10-14 — Run memory saves every answer kind (skips, tagline moves, web marks); the name row leaves the list on Tagline (Undo on About); mobile Yes/No/Other no longer pushed off the left edge beside an Open link; the run attach reads the row and the event log at once.

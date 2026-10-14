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
| `?via=website\|social\|name` | the open way-in card (when absent: implied by a prefill; `/person` opens the name fields) | pushed without navigating (Back closes the card) |
| `?website=ritualcoffee.com` | company prefill | typing replaces it, debounced 400 ms |
| `?social=@handle` or a profile URL (encoded) `&platform=instagram` | social prefill (`platform` only beside `social`) | replace |
| `?name=…&occupation=…&company=…&city=…` | person prefill (`name` + `city` also name a business) | replace |
| `?run=<uuid>` (repeated, oldest first) | the session's rounds | replaced as each round starts |
| `?view=compare` | the side-by-side findings view | replace |
| `?panels=smart_add_helper:<method>` | a helper window (linkedin, google, facebook, instagram, threads, tiktok, youtube, grok) | the window-panels URL sync |

Rules:
- Param names are lowercase. They are read case-insensitively and written lowercase in a fixed order.
- An invalid value is dropped and never causes an error. That covers an unknown via, platform or view, a non-uuid run, text over 300 characters, and an enrich segment that is not one safe path segment.
- Writes go through `@/lib/url-state/addressWithoutNavigating`, so they make no RSC fetch and cause no remount. A write keeps every key it does not own, such as `panels`.
- 🚨 **Auto-start spends points.** A link that carries a prefill (`website`, `social`, or `name`) starts searching on open, as if Go was pressed. That is the purpose of the link. It happens once per address per tab (sessionStorage `smart-add:auto-started`). A reload, Back/Forward or a duplicate tab never starts a second run. A person link with no occupation or company stops at the one "job or company" ask.
- **First data:** the name, logo and description rows fill from the web step's own-site listing the moment it lands (`firstData.ts`), even when the site blocks a direct read; the facts agent's brand name, phone, email and category merge into the same rows later under the server's keys, so nothing on screen resets.
- **Resume:** an address with `run=` rebuilds those rounds from the server (`SmartAddRound` → `useWorkflowRun`) and starts nothing. The typed fields come back from the address. Every answer given on screen before Create (Preferred / Ours / Not us / Related, web kinds, typed values, Skip for now, Tagline moves, the web review's Ask me later / Ignore) is saved as they are given in the person's synced preferences (`smartAdd.runs`, keyed by the first run id; `runMemory.ts`) and restored with the run; `ANSWER_KINDS` in `runMemory.ts` lists every kind and `runMemory.test.ts` fails when a new one is not saved. A name moved to Tagline leaves the name list and is undone from its About item. After Create they live in `web.discovered_item`.
- Nothing personal goes in the address beyond what the person typed into these fields. The active organization is never in it.

---

## Change Log

- 2026-10-14 — Smart Add gets real URLs: mode routes, deep links, `run=` resume, `via`/`view`, helper `?panels=`; `smartAddUrl.ts` + tests (`__tests__/smartAddUrl.test.ts`).
- 2026-10-14 — Run memory saves every answer kind (skips, tagline moves, web marks); the name row leaves the list on Tagline (Undo on About); mobile Yes/No/Other no longer pushed off the left edge beside an Open link; the run attach reads the row and the event log at once.

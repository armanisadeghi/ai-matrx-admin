# FEATURE.md — `search` (Matrx Search)

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-09-11`

---

## Purpose

The platform's public search engine at `/search`: one box, and the web comes
back as the `web_search_results` kind family rendered through its registered
kind components. It exists because Arman (2026-08-21), on seeing the Stage B
search-kinds demo, ruled _"I want to make this our official public search
engine that we can make available for now."_

**The rendering is not ours.** This feature owns the box, the URL contract, and
the waiting/empty/error states. Every result on screen is drawn by the
canonical kind components — the same ones a chat turn, a workflow node, or a
document uses. The Web Scraper's keyword-search result pane also delegates to
this exact renderer after adapting its flat transport rows into the registered
kind shape. Re-implementing any of it in either feature would be the defect
this whole program exists to prevent.

---

## Entry points

**Routes**

- `app/(core)/search/layout.tsx` — the auth branch. Guests get
  `SearchLanding` (marketing); signed-in visitors fall through to the engine.
  Also carries the route metadata.
- `app/(core)/search/page.tsx` — the shell header and `SearchPage`.
- `app/(core)/scraper/search/page.tsx` — the Search Lab: the same
  `SearchExperience` on the `matrx-user/scraper` surface.

**Components**

- `components/SearchPage.tsx` — `/search` for a signed-in person: `useSearchRoute`
  + the `matrx-user/search` surface around ONE `SearchExperience`.
- `components/SearchExperience.tsx` — the whole page: the pill, the tabs, the
  results. Twelve tabs: the nine engine tabs plus the three catalog tabs below.
- `components/SearchResultsSkeleton.tsx` — the waiting state, shaped like the
  answer.
- `tools/ToolSearchPanel.tsx` — the three catalog tabs (third-party services
  lane L12d): **Deep** (web search across the routed sources), **Reviews**
  (Google Maps · Trustpilot · App Store · Google Play) and **AI answers** (how a
  brand shows up when an AI assistant is asked). Each is a catalog Tool run
  through `/tools/calls` with the friendly one-box form (`SimpleBoxForm`) generated
  from the Tool's own declaration, drawn by its kind with the cost in points, and
  kept to a table by the Tools home's own `ToolResult`. `tools/searchToolPlan.ts`
  (pure) holds the tabs, the lanes (a lane's job may be served by two Tools while the
  catalog fills in: the first LIVE one answers), what each pasted link means and how
  it fills each Tool's input; `tools/useLaneFinder.ts` finds an app or business by
  name (a free Matrx search, never points) when a name stands where a link was wanted.

**Hooks**

- `useSearchRoute()` — the link read once, the keyword form, the box's actions;
  every search writes its inputs back to the address.

**Services**

- `service.ts` → `runKindSearch(...)` — the ONE client path to an engine search:
  `POST /search-kinds/search` on aidream via `useBackendApi`.

**Backend endpoint**

- `POST /search-kinds/search` (aidream) — `aidream/services/search_kinds/`.
  Auth-required, provider allow-listed, per-user rate limited (see that
  feature's `FEATURE.md` § The public door).

**Redux slice(s)**

- None. The URL is the state.

---

## Data model

**Database tables** — none. Searches are not persisted (deliberate: no search
history product decision has been made; adding one is Arman's call, not a
side effect of building the box).

**Key types**

- `SearchProvider`, `SearchOutcome`, `SearchPhase`, `SearchTranslationReport`
  (`types.ts`) — none of them re-declare the kind, which is owned by the
  registry.

**Surface**

- `matrx-user/search` (`features/surfaces/manifests/search.manifest.ts`),
  registered live with 19 values; emitter is `SearchPage` (`searchExperienceValues`).

---

## Key flows

**1. A search**
Trigger: submit in the pill, or a `/search?q=…` link, or back/forward.
`SearchPage` → `useSearchRoute` (reads the link once) → `SearchExperience` →
`form.handleSearch` → `runKindSearch` → `POST /search-kinds/search` → NDJSON → one
`search_kinds_result` event → the registered kind components per engine run.
Exit: results on screen. Every search writes its inputs back to the address.

**1b. A catalog tab** (Deep · Reviews · AI answers)
Trigger: pressing the tab (`?tab=deep|reviews|answers`). `ToolSearchPanel` →
`useToolRunForm(jobKey)` (`GET /tools/{job}/run-form`) → `SimpleBoxForm` → on submit
`useToolCall.run` → `POST /tools/calls` (a durable record; `?call=` reopens it) →
`ToolResult` (kind + cost in points + "Keep these rows"). A pasted store, map or
Trustpilot link picks its lane; a name where a link is wanted runs the free finder
and offers the exact matches; a lane whose first Tool is not live uses the next one,
and with none live says so in one line.

**2. A guest arrives (including on someone's shared search link)**
`layout.tsx` → `getServerAuth()` → not authenticated → `SearchLanding` inside
`MarketingPageShell`. No login wall, no error. The landing's sign-in link
carries `/search` as the destination, so signing in lands them on the search
they were sent.

**3. It fails**
Any throw in the stream (including the server's 429) becomes `phase: "error"`
with the server's `user_message`, plus one action: Try again, which re-runs the
same query through the `attempt` nonce.

---

## Invariants & gotchas

- **The URL is the state.** Any new option (provider, count, locale) becomes a
  param in `search-url.ts` and a reader beside it — never component state, or
  the link a user shares stops matching what they saw.
- **Never render a result by hand.** A section that looks wrong is fixed in its
  kind component (`components/mardown-display/blocks/search-kinds/`), where
  every other surface gets the fix too. Alternate search transports adapt
  their response once, then enter through `KindInstanceRender`; they do not
  own result cards.
- **Provenance rides the kind.** The collection component prints the service
  that answered. Do not add a second provider badge here.
- **Provider choice is a SERVER decision.** The client asks for `brave`; the
  `search.public_providers` knob is the authority. There is no provider picker
  on this surface on purpose — see the access model in
  `common-docs/operations/search-kinds-pilot.md`.
- **Compact search controls stay 44px tall on mobile and the icon-only submit
  button retains an accessible name.** Desktop returns to the 36px header density
  at `sm` and above.
- **A refused search does not clear the previous one** — `outcome` is cleared
  only when a new query starts, so the error state never blanks the page a user
  was reading.

---

## Related features

- Depends on: `features/content-ir` (the render route),
  `components/mardown-display/blocks/search-kinds` (the components),
  `features/surfaces` (the manifest + runtime provider),
  `features/auth/components/module-landing` (the landing shell).
- Cross-links: `aidream/services/search_kinds/FEATURE.md` ·
  `common-docs/systems/architecture/content-ir/FEATURE.md` §10c ·
  `common-docs/operations/search-kinds-pilot.md`.

---

## Doctrine compliance

**Primitives reused**

- Components: `KindInstanceRender`, `WebSearchResultsBlock` and the whole
  search-kind family, `Button`, `Input`, `Skeleton`, `PageHeader`,
  `MarketingPageShell`, `ModuleLanding`.
- Hooks: `useBackendApi`, `useRouter`/`useTransition`.
- Services: `consumeStream` (`lib/api/stream-parser`), `getServerAuth`,
  `createRouteMetadata`, `SurfaceRuntimeProvider`.

**Primitives introduced**

- `tools/ToolSearchPanel.tsx`, `tools/searchToolPlan.ts`, `tools/useLaneFinder.ts`
  — Why new: the search page had no way to run a catalog Tool. Reused instead of
  rebuilt: `SimpleBoxForm`, `useToolRunForm`, `useToolCall`, `ToolResult` (with
  "Keep these rows") from the Tools home, and `runKindSearch` for the finder.

---

## Change log

- `2026-10-17` — Third-party services lane L12d. `/search` now renders the one
  `SearchExperience` (the plan's F1 — the older Brave-only `SearchWorkspace`,
  `SearchBox` and `useKindSearch` are deleted). Three catalog tabs added: Deep,
  Reviews, AI answers (`tools/`), run through `/tools/calls` with the one-box
  form, cost in points, save to a table. The place card's inline Reviews door
  (`PlaceReviewsLoader`, the Google engine's own door) is unchanged and listed
  as the open convergence in the program register.

- `2026-10-13` — `runKindSearch` takes optional `options` (vertical, country,
  language, safe_search, time_range, page, location, device, ai_answer,
  include_raw; omitted = server default) and the outcome now carries `raw`,
  `ignoredOptions`, `request`, `elapsedMs` and the full translation (unknown +
  dropped). `SearchProvider` is `"brave" | "google"`; this page still sends
  Brave web only. Second consumer: the Search Lab at `/scraper/search`, which
  also retired the `/demos/search-kinds` proof page. New item kind
  `image_result` renders in an Images band (`image-blocks.tsx`).

- `2026-09-11` — Kept both compact search controls at the 44px mobile touch
  floor, named the icon-only submit button for assistive technology, and kept
  URL-driven draft synchronization within render instead of an effect.
- `2026-08-27` — The Web Scraper keyword-search result pane now adapts its
  standalone transport rows into `web_search_results` and delegates to this
  feature's canonical kind renderer. No second result-card or selected-result
  renderer remains in the scraper feature.
- `2026-08-23` — Claude Opus 5: Built the feature. Promoted the Stage B demo
  (`/demos/search-kinds`, retired 2026-10-13 into the Search Lab at `/scraper/search`) to the public
  `/search` surface: guest landing, `?q=` URL contract, shell-header box,
  shaped waiting state, honest empty/error states, `matrx-user/search`
  registered. Access model: signed-in users, Brave only, knob-driven per-user
  rate limits (filed for Arman in the pilot note).

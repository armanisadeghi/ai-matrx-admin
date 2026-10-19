# FEATURE.md — User Launchpad

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-10-19`

## Purpose

Two things live here, one feature:

1. **Launchpads** (project custom-experience, PLAN §5.2/§5.6): a person's own pages of widgets, many per
   person, each bookmarkable at `/launchpad/<key>`, linking to each other, built in a drag-and-drop grid
   editor, versioned with "Set active" restore, and tunable by an agent from chat. The Start page (`/start`)
   moved in as each person's `start` launchpad and its code was deleted.
2. **The launcher** at `/launchpad`: the calm, always-open command surface (start actions, favorites,
   searchable catalog, area cards; every destination opens in a new tab). It stays for everyone and now
   opens with the "Your launchpads" strip and "New launchpad".

## Entry points

- `app/(core)/launchpad/page.tsx` — the launcher (`UserLaunchpad`, with `YourLaunchpads` at the top).
- `app/(core)/launchpad/[key]/page.tsx` — one launchpad (`components/LaunchpadPage.tsx`).
- `app/(core)/start/page.tsx` — permanent redirect to `/launchpad/start`.
- `components/LaunchpadPage.tsx` — view / Edit / History / Chat; `RecordPageHeader` with the launchpads as
  record siblings (switcher), Actions menu Rename · Duplicate · Archive.
- `components/LaunchpadGrid.tsx` — a `LaunchpadDoc` on `GridCanvas` (`@ai-matrx/design-system`).
- `components/LaunchpadPanels.tsx` — Add (catalog by Board section), Set up (width, height, fields with
  pickers), History (preview in place, Set active).
- `components/YourLaunchpads.tsx` — the strip and the New launchpad template picker.
- `server/readLaunchpads.ts` — the person's own launchpads read on the server (same `listAppRows`, same
  `visibleLaunchpadRows` pick, 2.5 s deadline, announced on failure) so `/launchpad/<key>` has its saved layout in
  the first HTML and `/launchpad`'s strip streams in without waiting for the browser.
- `useLaunchpads.ts` — list / byKey / save (versioned) / archive, history + restore, and the one-time Start move.
- `doc.ts` — the pure verbs over `LaunchpadDoc` (parse, add, move, resize, configure, remove, apply grid
  placements, the version note, Start → launchpad conversion).
- `widgets/` — THE ONE WIDGET REGISTRY: `types.ts`, `catalog.ts` (pure specs), `registry.tsx` (bodies),
  `frame.tsx` (the widget frame and row list), `bodies/*`.
- `tools/` — the agent tools (`launchpad-tools.ts`, executed by `useLaunchpadAgentTools.ts` through `agentEdits.ts`).
- `templates.ts` — starting launchpads by role.
- `catalog.ts`, `components/UserLaunchpad.tsx`, `hooks/useVisibilityAwarePageRefresh.ts` — the launcher.
- Landing: sign-in's destination helper is `shellLandingHref` / `launchpadHref` in
  `features/shell/shell-layout/resolve.ts` (lane A's; this feature uses it, never a second one).

## Data model

- **`launchpad` typed table** (`launchpad.typed-table.ts`; slug `LAUNCHPAD_TABLE_SLUG`, kept_for
  `custom_experience`, organization scope, key `slot`). Fields: `slot` (unique: `org:<key>` or
  `person:<uuid>:<key>`), `key`, `title`, `owner` (`org` | `person:<uuid>`), `doc` (JSON `LaunchpadDoc` —
  the frozen contract in `features/shell/shell-layout/contract.ts`), `note`, `saved_at`. Every save is a
  record version (History). A person's launchpads are read across all their organizations (newest wins per
  key) plus the active organization's `org` launchpads; a key opens the person's own first. Every write names
  its organization: the row's own, else the active organization.
- **Start move**: on first visit (`/launchpad` or any `/launchpad/<key>`), `startMigration.ts` writes the
  person's newest `start_layout` doc as their `start` launchpad (s / m / l → 3 / 6 / 12 columns, same order),
  or today's first-visit layout plus their old start data page if they had none. Once per person (per-tab memo
  + Web Lock + fresh re-read, `seedOnce.ts`), announced with `console.info`. The `start_layout` / `start_page`
  rows stay in the store untouched; their definitions live in `start-move/` only for this read.
- The launcher owns no table; favorites go through `usePinned()`.

## The grid and the registry

- Placement: 12 columns × 24px rows on a desktop, 4 columns on a phone (container narrower than 640px). A
  widget without a saved phone placement reflows from the desktop grid; editing on a phone saves phone
  placements for every widget. Drag the header to move, the corner to resize, arrow keys to nudge (Shift
  resizes); overlaps push down and the grid compacts. One commit per gesture.
- **Add a widget type**: one entry in `widgets/catalog.ts` (type, label, lucide icon, Board section, grid
  sizes `defaultW/defaultH/minW/minH/maxW?/maxH?`, default config, fields, `describe`, optional `href` and
  `publishes` — the page-bus slot, unwired today) + one body in `widgets/registry.tsx` taking
  `{ config, editing, capacity }`. The registry test fails without both. A new field picker goes in
  `LaunchpadPanels.tsx`.
- Widgets today: counts, count, recent, tasks, today, favorites, pinned agents, data page, table (the Start
  nine), Applet (`AppletInPage`), launchpad link, app page (the Board's Page item body — any app address,
  which also covers a Space page).

## Agent

Surface `matrx-user/launchpad` (`features/surfaces/manifests/launchpad.manifest.ts`), role
`start_page_maintainer` holding mandate `start_page.maintainer`. Tool names stay `start_*` (the agent was
built on them); `size` s/m/l maps to 3/6/12 columns and `w`/`h` give exact grid units. One agent turn saves
as ONE version ("Agent for you" in History).

## Key flows

1. A signed-in user opens `/launchpad` from the shell. The shell link itself opens a new tab so their current workspace is preserved.
2. The page uses the canonical AppShell sidebar and header plus a compact, sticky search control.
3. With no query, the page shows the dashboard's real start actions, the user's real favorites, and compact top-level area cards.
4. Search ranks every discoverable registry destination plus start actions and matching favorites. Every result is a real new-tab anchor.
5. Area cards show at most three direct child destinations. Their `View all N destinations` control is a real count-door: it searches that area and reveals the complete matching set.
6. One one-shot timer becomes due after an hour. A hidden page waits until visible, and a focused form control gets a five-minute grace period before the page reloads.

## Invariants

- Every work destination opens in a new tab with `noopener noreferrer`.
- The catalog has no parallel route list. It derives from `primaryNavItems`, `settingsItem`, `QUICK_ACTIONS`, and live favorites.
- Shell action children and WindowPanel controls do not enter the static destination catalog; their fallback hrefs do not necessarily perform the named action.
- The Launchpad is authenticated and hidden from guests.
- `/dashboard` stays a hub. Do not move its metrics or rotating discovery content here.
- The default browse state stays compact. Full destination density appears only after a search or an explicit `View all` action.
- The route uses the canonical `(core)` AppShell sidebar and header. The page is a normal document in `.shell-main` — it does not become a second full-height scroller. The last cards sit above at least a quarter-viewport of empty space.
- Browse is two grids on one page: apps with no children in a uniform dense row, folders with children in a second grid sorted by size. Folder heights are one of four 32px steps. Descriptions stay on one line. The left shell sidebar stays visible.
- Area-card descriptions stay on one line. The catalog shortens long nav copy for the card; search still ranks the full nav description.

## Doctrine compliance

**Reused:** `primaryNavItems`, `settingsItem`, dashboard `QUICK_ACTIONS`,
`QuickActions`, `PinnedSection`, `usePinned`, `PinButton`, `SearchInput`,
`filterAndSortBySearch`, and `ShellIcon`.

**Extended:** `QuickActions` accepts an opt-in compact grid and new-tab mode,
while `PinnedSection` accepts an opt-in new-tab mode;
shell navigation items accept an opt-in `openInNewTab` contract; the Admin
Launchpad's visibility-aware hourly refresh became one shared hook.

**Created:** the pure Launchpad catalog and its compact/search result renderers.
No existing primitive combined the user navigation hierarchy, start actions,
and favorites into an always-open launcher.

## Change log

- `2026-10-19` — Lane J: "New launchpad" templates wait for the person's list (a key chosen against an empty list
  could reuse an existing key and overwrite that launchpad); a signed-out or thrown write now says so instead of
  doing nothing or sticking on "Creating…".
- `2026-10-19` — Lane I (custom-experience, cold load): a cold `/launchpad/start` took ~11–13 s to draw its saved
  layout live — ~4.6 MB / 230 chunks of shell JavaScript (the same set every `(core)` route loads; the launchpad
  adds 10) had to arrive before the browser even asked for the doc, then find-or-make and the list ran in
  sequence. Now: the route reads the person's own launchpad on the server (`server/readLaunchpads.ts`) and the
  grid with every widget box and its loading rows is in the first HTML; widget bodies draw after hydration
  (`LaunchpadGrid` `useHydrated`), so their reads start at hydration instead of after the list; `@ai-matrx/records`
  `useTypedTable` runs ensure and the list at once. While loading the header shows the saved title (else
  "Launchpad", never the raw key); the `/launchpad` strip shows the server's list, else design-system skeletons.
  Order of drawing: server copy › this device's paint cache › skeleton.

- `2026-10-19` — Lane H (custom-experience): the Agents widget reads which of its agents the person can open in ONE
  `agent.definition` select and asks the access gate (`access_denied_context`, one round trip per id) only about the
  rest — a launchpad load asked it 18 times (`idsNeedingAnAnswer`, `agentsFallback.test.ts`).
- `2026-10-19` — Lane F (custom-experience): local first — `paintCache.ts` keeps this device's last-drawn
  launchpad (`matrx:client:launchpad.last-drawn:<user>:<key>`, kind cache) and `LaunchpadPage` paints it while
  the cloud read runs (read in an effect, after hydration); no copy → a neutral `RegionSkeleton`, never the
  template. A hand-added widget lands at the first free spot from the widget last touched (else the top) and
  scrolls into view (`addWidget(…, fromRow)`). The find is one request across organizations
  (`@ai-matrx/records` `tableFindMany`).
- `2026-10-19` — Lane D (custom-experience): launchpads — the `launchpad` typed table, `/launchpad/<key>`, the
  GridCanvas editor, one widget registry (Start's widgets adapted + Applet, launchpad link, app page), role
  templates, History with Set active, agent tools repointed; the Start page moved in and `features/start`
  deleted (its FEATURE content folded into the sections above).

- `2026-09-19` — Cursor: split browse into a uniform app row and a size-sorted folder grid; restored the left shell sidebar; one-line folder descriptions; removed the unused browse helper sentence. The page scrolls in `.shell-main` with at least a quarter-viewport of empty space under the last cards.
- `2026-08-20` — Codex: created the authenticated user Launchpad, registry-backed search and browse cards, shared new-tab quick starts and favorites, the persistent shell door, unique route identity, and shared visibility-aware stale-page refresh.

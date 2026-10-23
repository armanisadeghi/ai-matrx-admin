# Shell — the application chrome (sidebar, header, user block, mobile)

> **New app frame in design (2026-10-20):** improving any shell chrome here (sidebar, menus, header, page tops, footer, side chat, Canvas, the ask-about-this-page input)? Keep going, and add one line to `common-docs/projects/app-frame/UPGRADES.md` so the new frame inherits it.

**Purpose:** the one frame around every authenticated route (`AppShell`, used
by `(core)` and `(admin)`; the `(dev)` layout mirrors it). Sub-features carry
their own docs: sidebar `components/sidebar/FEATURE.md`, route headers
`components/header/variants/USAGE.md` + the `core-route-headers` skill; custom
layouts (permanent nav ids, the placeable catalog, validator, resolver)
`shell-layout/FEATURE.md`. This file holds the two laws that span them.

**Canvas chrome** — a page that hosts `ChatCanvasWorkspace` flips this shell to
`data-shell-chrome="canvas"`: the shell header (by visibility) and
the phone dock step aside for the page's own header; the SIDEBAR, account rail and THE
CHAT (`ShellChatDock`, the one chat on every page but /chat and /code) stay, and the
sidebar's Chats side opens conversations in it: read
[`../canvas/workspace/FEATURE.md`](../canvas/workspace/FEATURE.md) before touching
`ShellChromeMode`, `canvas-chrome-routes.ts`, `in-place-chat-host.ts` or `shell.css` §13c.

## THE HEADER CONTROL SET (owner, 2026-09-19; re-ruled 2026-09-30)

> *"we need to create a consistent set of things for that top-right section so
> that desktop has a consistent feel and so does mobile. One critical part of
> consistency is never hiding things and only disabling when inactive."*

`components/header/HeaderControlSet.tsx` is the ONE copy, mounted by the shell
`Header` and by the canvas workspace's header (`/board`). Left to right:

```
[ route-injected actions (#shell-header-right) ] [ Search ] [ Intelligence ] [ Canvas ] [ Messages ] [ Notifications ]
```

| Control | File | Inactive state |
|---|---|---|
| Search | `features/knowledge/command-bar/OpenCommandBarButtons.tsx` | Guest → auth gate. |
| Intelligence | `../aidream/apps/shared/chat/src/surfaces/components/chrome/SurfaceAgentsHeaderButton.tsx` | Guest → auth gate. |
| Canvas | `features/canvas/core/CanvasHeaderToggle.tsx` | Never disabled: empty → opens the canvas HOME (`CanvasHomeSheet`: saved items + Board). The 44px slot never unmounts. |
| Messages | `features/messaging/components/shell/MessagesHeaderButton.tsx` | Guest → auth gate. Own unread-conversation count; toggles the Messages canvas tab. |
| Notifications | `features/notifications/components/InboxHeaderButton.tsx` | Guest → auth gate. Never counts DMs. |

Each is a 44px tap target with its spacing built in: **no gap, padding or
margin between or around them** (guard asserts it). Nothing else is built into
the header — a route adds controls through `#shell-header-right`.

**On a phone (below 768px) the five fold into ONE control** —
`components/header/HeaderPhoneOverflow.tsx`, a bottom sheet holding the same
five with the same states. The swap is CSS (`styles/shell.css`), so the
server-rendered row never shifts. Guard: `HeaderPhoneOverflow.test.tsx`.

Rules: a control is never unmounted on state (owner, 2026-09-16: *"causes a
shift in the top header buttons"*). Guards:
`features/shell/__tests__/header-right-set.test.ts` (source),
`features/canvas/__tests__/canvas-header-slot-reserved.test.tsx` (rendered),
`features/shell/layout-gate/canvas-one-presentation.spec.ts` (laid out).

## THE ACCOUNT RAIL — Settings, Organization, You, bottom-left (2026-09-30)

`components/user-block/ShellUserBlock.tsx` ends the sidebar with three
always-visible rows, top to bottom: **Settings** (`account-rail/ShellSettingsMenu`
— Settings page, Preferences, light/dark, Media, Trash), **Organization**
(`account-rail/ShellOrgSwitcher`), **You** (the avatar → `UserMenuPanel`).
Each row is a `.shell-nav-item.shell-nav-stable`, so its icon sits in the nav
rail's icon column (x = 12px) — collapsed = icon, expanded = icon + name.
`--shell-user-block-h` reserves the rail's height on the sidebar column.

- **`ShellOrgSwitcher` is THE organization control of the chrome.** It draws
  the active organization's logo or 2–3 letter abbreviation
  (`organizations/components/OrganizationMark`), never asks for one (the
  load ladder always picks one; a person in no organization sees a quiet
  "Create an organization" that opens /organizations), and lights a dot + a
  one-click "Switch to …" when the page's object lives in another of the
  person's organizations (`pageObjectOrganization.ts`). It reads/writes through
  `useActiveOrganizationPicker` → `chooseActiveOrganization` (cookie + sync
  engine unchanged) and opens the canonical `OrganizationPickerPanel`. Variants:
  `rail`, `drawer` (phone navigation drawer), `inline` (a compact row).
  Replaced: the header chip, the avatar menu's Organization group, the canvas
  nav's hand-built drop-up.
- **Mobile:** no rail; the navigation drawer ends in the same three
  (Settings and the organization as drawer rows, then `MobileDrawerUserRow`).
- **The avatar menu** is identity, Intelligence, quick access, feedback,
  admin, copy short link, sign out. Open state is the shell root's
  `#shell-user-menu` checkbox; items sit in `MenuItemCloseLabel`.

## FLOATING THINGS NEVER MOVE THE PAGE (Arman, 2026-10-20)

Pills, assists, badges, alarms, notices, toasts, the chat dock and the window tray float OVER the page. They never change the size or position of anything on it. When one would cover something, it moves itself; the page never makes room.

- How chrome moves: the assists pill lifts, docks into the pager or header, or yields (`features/assists/assistClearance.ts`); the admin error badge uses the same lift (`floatingLiftFor` → `features/admin/error-inspector/useFloatingLift.ts`); the chat dock and pills rest above a page's own bars (`--matrx-page-foot-h`, and `--page-bottom-dock-h`, which a list publishes for its pager and a page publishes for its phone dock). Pages publish facts about their own bars; chrome reads them. Never the other way round.
- What chrome may change: only the empty scroll room after a scroller's last line (the trailing `::after` runway below), which moves nothing on screen.
- What it may never do: publish its size for a page to pad, shrink, re-centre or cap itself by, or write padding/margin/height onto page elements. Retired 2026-10-20 after 10+ sightings (the "1 error" badge lifting the Agent Studio composer): `--shell-fixed-corner-clearance` (badge → Studio, Question Desk), `--shell-fixed-alert-clearance` (alarm → shell padding), `--matrx-floating-fixed-measured` (chat dock → list page foot), the assists scroller inset, and three pages sizing by `--matrx-floating-clearance`.
- The phone nav dock (`.shell-dock`) is not a pill: a route that shows it has it from the first paint, a fixed bar, and the list page end reserves its constant height.
- Guard: `pnpm check:overlays-never-move-page` (`--strict`, `--self-test`; run by `styles/__tests__/overlays-never-move-page.test.ts`). Red on the 2026-10-20 tree (41 findings), green after.

## THE FLOATING CLEARANCE — every scrolling page ends clear of what floats (owner, 2026-10-04)

- `FloatingClearanceSync` (mounted once by `AppShell`) measures every visible bottom-anchored element matching `FLOATING_BOTTOM_SELECTOR` (`lib/layout/floating-chrome.ts`: `[data-matrx-floating-bottom]`, `.ambient-assistant-dock`, `.shell-dock`) and publishes `--matrx-floating-measured` on `<html>`; `styles/shell.css` derives `--matrx-floating-clearance` (measured or safe area, + 1.5rem).
- The runway is a final `::after` flow item, by DEFAULT, on `.shell-main` (natural-height routes), a scrolling `h-full` route body directly under it, and any `<main>` / `[data-matrx-page-scroll]` scroll owner. It adds to page spacing; `.scroll-page-end-space` (education's generous runway) is never shorter than it.
- Scrollers inside a floating window take their runway from the same measure, per scroller: `FloatingClearanceSync` writes `--matrx-window-scroller-runway` + `data-matrx-window-runway` on every `.overflow-y-auto` / `.overflow-auto` / `[data-matrx-page-scroll]` under `[data-window-panel]` whose end reaches under ANY floating box (assists pill, dock, a minimized tile), and `shell.css` adds the `::after` spacer. A window never hand-pads for floating chrome (MKT-081).
- New floating chrome carries `data-matrx-floating-bottom`. A page opts out only with `data-floating-clearance="off"` + `// ui-exception:`. Never hand-write `pb-safe` / big `pb-*` on a page scroller.
- Guards: `useFloatingClearanceGuard` (dev; `[floating-clearance]` console error + dashed outline when content is still in the floating band at scroll end; `window.__matrxFloatingClearanceProbe()` runs it on demand) and `pnpm check:floating-clearance` (`--self-test`).

## THE PAGE RUNWAY — every scrolling page scrolls its last line to about half the screen (owner, 2026-10-19)

- Supersedes "the page end = the gutter" below for every page that SCROLLS. One value: `--matrx-page-runway` = `max(50dvh, safe area + page end)` (`styles/shell.css`) — a constant since 2026-10-20: pages read it as padding, so it never follows what floats. Every shell runway `::after`, `.scroll-page-end-space`, education's boundary, and the full-page notes editor (all four modes) read it; nothing hand-writes `pb-[85dvh]`/`40dvh`. A non-scrolling list surface (`data-matrx-page-end`) keeps its small foot.
- A pane inside an app viewport that is a page (the notes editor) marks its root `data-matrx-page-runway` and pads by `var(--matrx-page-runway)`; a `ProTextarea` host passes `--matrx-textarea-end` so the control-row reserve (44px) is a floor, never a ceiling.
- Nothing may SHRINK it; the assists pill no longer insets any scroller (removed 2026-10-20 — FLOATING THINGS NEVER MOVE THE PAGE).
- A page's own bottom bar (a status bar flush with the floor — the notes metadata bar) carries `data-matrx-page-foot`; `FloatingClearanceSync` publishes its height as `--matrx-page-foot-h` and the page assistant dock rests above it, never on it.
- A page's own PHONE DOCK (a bar it floats over its content below `md`: the notes editor dock, `MobileActionBar`) carries `data-matrx-page-dock` (`PAGE_DOCK_ATTR`, `lib/layout/floating-chrome.ts`) and is the last child of its flex column. In a frame (`<html data-board-embed>`: a launchpad App page widget, a board Page tile — narrow, so the page draws its phone layout on a desktop) `styles/shell.css` §13d lays it in flow as the column's last row: the page ends above it and every control stays reachable — and, being in flow, it is SOLID (glass only floats): the same rule re-declares every `--matrx-glass-*` leaf token opaque, so every glass surface inside the dock turns solid with no call-site change. Guard: `lib/layout/framed-page-docks.test.ts` (every `md:hidden fixed|absolute bottom-0` dock carries the attribute).
- Guards: `lib/layout/page-runway.test.ts` (token, readers, verdicts, foot lift), the dev `[page-runway]` scream (`useFloatingClearanceGuard`: a scrolling page or `[data-matrx-page-runway]` pane ending short; textareas measured by their padding), and the browser walk `node scripts/page-runway-walk.mjs` (RUNWAY_ORIGIN = your preview host; every listed route × 1280/375, notes × Write/Split/Plain/Read; exit 1 on any finding).

## PAGE RHYTHM — one spacing scale for page structure, the bottom once (owner, 2026-10-05)

- Tokens on `:root` (`styles/shell.css`), numbers + rules in `lib/layout/page-rhythm.ts`, pinned by `lib/layout/page-rhythm.test.ts`: `--matrx-page-gutter` 12/16px, `--matrx-page-top` 16/24, `--matrx-page-block-gap` 24/32 (between BIG blocks only; control sets keep their dense gaps), `--matrx-page-end` = the gutter (phone / ≥640px).
- The runway is the page end ONCE: `--matrx-floating-clearance` = what floats + page end, and a scroller that takes the runway loses its own bottom padding. A non-scrolling page surface (`data-matrx-page-end`: the `EntityListPage` body) gets no runway; its foot is the page end + safe area, a constant (plus the phone nav dock's fixed height on a route that shows it). The chat dock and pills rest above its pager via `--page-bottom-dock-h`; the pager never moves for them (2026-10-20).
- Guard: the same dev hook screams `[page-rhythm]` (amber outline) when a page ends with more than page end + 4px under its last element; `window.__matrxPageRhythmProbe()` runs it. Walk + screenshots: `scripts/page-rhythm-walk.mjs`.

## PAGE-TOP TEMPLATES — every page top is one of four (owner, 2026-10-05)

A page picks a template; it never hand-builds its top. Named options only — a need a template lacks is added to the template as a named option (`common-docs/policies/one-ui-system.md`).

| Template | Component | For | Options |
|---|---|---|---|
| Marketing | `PublicHeader` + `ModuleLanding` (`features/auth/components/module-landing/`) | signed-out pitch / front door | see `module-landing-pages` skill |
| Module home (list) | `EntityListPage` (`lib/entity-list/`) | "all" pages: lanes, org filter, search, New | see `lib/entity-list/FEATURE.md` |
| Internal record page | `RecordPageHeader` (`components/header/templates/RecordPageHeader.tsx`) | a record or sub-page | `backHref?` (omit on a top-level page), `parents?: Crumb[]` (DEPRECATED — derived, see the 2026-10-21 entry), `record: { name?, siblings? }`, `status?: { label, tone }`, `modes?`, `activeModeHref?`, `onModeSelect?`, `actions?: { label, icon, href/onPress, primary/destructive/warning, showLabel, newTab, pinnedOnPhone, phoneOnly }[]` |
| Full-bleed | the workspace header (`data-page-header-target="workspace"`, ChatCanvasWorkspace) + glass only on a bar floating over the canvas | canvas | (not yet a single component — open) |
| Document editor (full-bleed) | `EditorDocumentHeader` (`components/header/templates/EditorDocumentHeader.tsx`) — Google Docs/Sheets top: product icon (= back to the list), title edited in place + marks, menu bar, right actions (Share last), toolbar row; canvas chrome | workbook + document editors | `backHref`, `backLabel`, `productIcon`, `productTone`, `title`, `titleMarks`, `menuBar`, `actions`, `toolbar`, `ribbon` (the Microsoft 365 look: centered title + `EditorRibbon` over the same command map, drawn when the person's Office look setting is Microsoft 365; one tree, so a switch never remounts the canvas); the parts are `components/editor-chrome/` (`EditorMenuBar`, `EditorToolbar` + Menus search, `EditorTitleField`, `EditorSaveStatus`, the `editor-menu-model` command tree) |

**Internal record page is ONE line**: back chevron, parents, the record as the last crumb, modes centered, actions right. No second line of text, no sentence under it. Phone: back + record name + one `…` (modes and actions). Built on `EntityModeHeader` (its new `trail`), which is built on `RouteHeader` → `PageHeader`. Only `features/shell/components/header/**` may render `<PageHeader>` directly.

**Specimens render the real template.** `<HeaderSpecimen>` (`templates/HeaderSpecimen.tsx`) is a stand-in shell band: inside it `PageHeaderPortal` renders in place and the phone ⋮ host reads as absent (`header-specimen-context.ts`). The system page (`/demos/ui-unification/system`, Navigation) uses it — never a mock.

**Guard:** `pnpm check:page-top` (findings row `page-top`, `--self-test`): `raw-page-header` (a file outside the header module importing `PageHeader`) and `sentence-under-title` (the interface-text `page-description` scanner). Baseline `scripts/page-top/baseline.json` only shrinks (`--shrink`).

## EVERY CRUMB IS A DOOR; "…" HOLDS EVERY ACTION OF ITS LEVEL (Arman, 2026-10-22)

THE HOME of this rule (Arman verbatim: `common-docs/projects/app-frame/VISION.md` § 2026-10-22 — every crumb is a door). The trail is `[product icon ▾] › Level ▾ › Record ▾ ★ …`, continuing deeper the same way (`[icon] › Brands ▾ › Some Brand ▾ › Socials ▾ › Instagram`). Enforced on every route unless Arman exempts one in writing.

1. **Every crumb above the page is a real link to a real page** ("I don't want fake things!!"). A level with no page of its own (`…/smart-add/validate`) is no crumb (`deriveTrail` reads `breadcrumbs/pageless-levels.generated.ts`, written from the route manifest by `pnpm route-manifest:generate`); a level `next.config.js` redirects on to a page (`/marketing/brands/smart-add` → `…/company`) is a real door and stays a link (`breadcrumbs/redirect-levels.ts`). A header kept in a LAYOUT links back to its own level (`useOwnAddress`; the frame adds the levels above and below it — `resolvePageTrail`). A declared level with no `href` borrows the derived one or is not drawn.
2. **Every level is a door** (`frame/CrumbDoor.tsx`, contract `FrameCrumbDoor` in `frame/types.ts`): the product icon opens every product (new tab, the app grid's rule; the current product goes home here) + a search over every page (the Go-to index, lazy); the first level opens the product's first-tier places (its sidebar rows) + the same search; a record opens its sibling records (`record.siblings` / `entityOptions` from the list's own data source, capped, or `loadOptions`), searchable; a page that is a LEVEL, not a record (a list, queue or place with no id), says so — `RecordPageHeader level={{ name }}` — and its crumb opens the other places at its level (the derived trail's siblings). The crumb's text stays a link. The classic `CrumbTrailHeader` draws the same `CrumbDoor` (siblings kind) — one component.
3. **"…" holds every action of its level.** A page declares its actions ONCE (the template's `actions`, a record's `menu.items`); the line draws them as buttons and the frame's "…" lists all of them (`useDeclareFrameActions`). A header button passed through `right=` / `rightEnd=` / `PageHeaderRightPortal` bypasses that list — move it into `actions`.
4. **URLs follow the hierarchy** (`/marketing/brands/<brand>/…`, never `/marketing/brands/<brand>`); a moved page keeps its old URL as a permanent redirect (the 301 law).

**Guards:** `pnpm check:crumb-doors` (`--self-test`, shrink-only census `scripts/crumb-doors/baseline.json`: `no-declared-trail`, `dead-crumb`, `record-without-siblings`, `button-outside-actions`; exempt only with `// crumb-doors-exempt: Arman <date> <quote>`; a page whose body is only a server redirect renders nothing and is skipped, never exempted) and `breadcrumbs/__tests__/every-crumb-is-a-door.test.ts` (every manifest route's derived trail: no crumb without a real page).

## RECORD HOST CHROME — a host that names a record, the record drops its own name (2026-10-22)

One primitive, `features/shell/host-chrome/RecordHostChrome.tsx`. A host (Board tile today; window, peek) declares the record it holds (`{ token, id }` — for a tile, its type's `comments(source)`), that its bar NAMES it, that it OFFERS Open, and a title slot. A record's header for THAT record (matched by token + id, never by depth, so a task inside a hosted chat keeps its name) reads it:

- `useHostNamesRecord(ref)` / `useHostOpensRecord(ref)` / `useHostChromeFor(ref)` — drop the name / the Open door.
- `<HostTitle record>` — the record's rename field moves into the host's title slot (the tile header), drawn in place otherwise.
- `<HostedRecordBar record name|titleField open actions>{modes, status}</HostedRecordBar>` — the ONE in-body record row (replaced the board's `TileBar` and CRM's `EmbeddedRecordHeader`); empty → no row.
- `RecordPageHeader` (with `record.token` + `record.id`) and `EditorDocumentHeader` (with `record`) read it: in a host holding that record they draw one compact row of modes/menus/actions, the title in the host slot.

Hosts today: `BoardTile` (every tile), `AdminMeetingDetail` (`host="frame"`). The hosted `RecordPageHeader` overflow is `components/official/RecordActionsMenu` (the same menu the meeting and sandbox bars use).

Baseline of a record header: its modes, its own verbs, its status. Not baseline (the host owns it when present): its name, Open-in-page, back/crumbs, close/focus. Guard: `features/board/__tests__/host-chrome-contract.test.tsx`.

## A ROUTE CAN OWN CMD+K / CMD+P (2026-10-05)

Cmd/Ctrl+K opens the shell's global search (`CommandBarHotkey`); a route with its own quick-find claims the key
instead of racing it: `useClaimSearchKeys(["k", "p"], (key, e) => { ...open my palette... })` from
`features/shell/hooks/useClaimSearchKeys.ts`. While the route is mounted the global bar stays closed and the
browser's print dialog (Cmd+P) is suppressed; return `false` from the handler to decline a press (it then falls
through to the global handler). Claims are counted (`searchKeyClaim.ts`), released on unmount. Test:
`features/shell/hooks/__tests__/searchKeyClaim.test.tsx`.

## THE CHAT COLUMN CAN START CLOSED PER ROUTE (2026-10-05)

The shell chat opens by default at >= 1440px. A route whose own layout needs the width is listed in
`SHELL_CHAT_CLOSED_BY_DEFAULT_PAGES` (`../aidream/apps/shared/chat/src/canvas/workspace/shell-chat-route.ts`; `/spaces` is on it):
the chat starts closed, the person opens it by hand (the rail's Chat row on a desktop, the header toggle at 768–1023px, the ⋮ row on a phone, Cmd+\), and a remembered choice still wins.

## CUSTOM LAYOUTS — the menu, header and dock a person or organization saved (2026-10-19)

The Sidebar rows, phone drawer, Dock and the header control set render from ONE resolved layout
(`shell-layout/useResolvedShellLayout`), picked on the server from `iam.core_boot_seed().shell` (null for
everyone who never customized — the default renders the nav-data arrays themselves, byte-identical) and
seeded into the store, so the first frame is already theirs and a save re-renders live. Cookies:
`matrx_shell=1` (this browser holds a layout → a late seed reserves the nav column) and
`matrx_shell_view=standard` (Standard view, Settings menu). Storage, boot path and the editor door:
[`shell-layout/FEATURE.md`](./shell-layout/FEATURE.md).

## Change log

- `2026-10-22` — claude: **Crumb doors, wave 6.** A level `next.config.js` redirects on is a real door (`breadcrumbs/redirect-levels.ts` feeds the pageless generator and the every-crumb test): "Smart Add" on `/marketing/brands/smart-add/*` stays a link. `RecordPageHeader record.loadSiblings` — a record whose list read needs the page's context (HR employer scope, a seat, a records client) builds its door there, read when it opens; `HrRecordPageHeader` / `useHrSiblingsLoader` (cases, HR requests, time-off policies, cycles, reviews), `Review360RecordHeader`. Loaders: `app`, `memory_trial`, `tool_battle`, `esign_envelope`, `billing_spend_alarm`; inline doors on held runs, spend approvals (the page's own rows), admin/org people, e-sign editor, studio runs, agent builds, launchpad loading. `/o/<id>`, `/d/<id>`, the 360 respond link are places (`level=`). Content plan's scope chip moved from `right=` to `entityStatus`. `check:crumb-doors` reads shorthand `{ siblings }`/`loadSiblings` (self-test red→green).
- `2026-10-22` — claude: **Crumb doors, wave 5.** The 107 pages the stricter scan un-hid now declare a trail, fixed where they share a wrapper: module layouts draw `DerivedCrumbTrailHeader fallback` (work, crm, cms, schedules, projects, user-settings, organizations, artifacts, tasks, surfaces, pdf, maps, esign, context-items, features, `/agents/[id]` — its `AgentHeader` comes from the chat package — and nine single-page layouts); `ImagesListHeader`, `AgentConnectionsHeaderControls` and `ScraperHubHeader` draw `DerivedBreadcrumb` in place of a hand-drawn title. **A layout names its level** (`breadcrumbs/trailLevels.ts`, `useDeclareTrailLevel(href, { label, token, options })`): `useDerivedTrail` reads it below a page's own record, so on deep brand pages the brand crumb reads the brand's name (was its humanized key, "1 Omaha Movers 2") and opens the other brands (`MarketingBrandCrumb` declares it). Brand "…" gains **Copy or export** (`openAlchemySession` on the brand's stored record). PDF record crumb opens the other PDFs (`pdf/workspace/pdfSiblings.ts`, the picker's own list). 24 `EntityListPage` callers moved their verbs from `headerActions` to `actions` (header + "…" + empty-state door); `headerActions` keeps read-outs and list-bound tools only, and `check:crumb-doors` now flags a button or link there (`button-outside-actions`, self-test red→green). Census 331 → 319, NEW 108 → 0. Tests: `breadcrumbs/__tests__/a-layout-names-its-level.test.tsx`, `pdf/workspace/__tests__/pdf-crumb-opens-the-other-pdfs.test.ts`.
- `2026-10-22` — claude: **Crumb doors, wave 4.** A list page's verbs are one list: `EntityListPage actions` (`lib/entity-list/components/ListPageActions.tsx`) draws each on the list header AND declares it to the frame's "…" — /marketing/brands/all "…" now holds Add brand + Smart Add (it held only Copy link / Open in new tab). `RecordPageHeader indicator` = a live status beside the name (classic line, frame, host bar); /research/topics/<id> moved onto the template with `IntelligenceIndicator` there and a `research_topic` sibling loader (IntentBadge deleted). Marketing's Sites tab removed (repeated Brands; a website belongs to a brand). 20 marketing place headers `record=` → `level=`. `check:crumb-doors` follows three hops and counts a template only where it is rendered or called (a name in a comment or type no longer clears a page); that un-hid 107 pages the old scan cleared falsely — they print as NEW, not baselined. Baseline 418 → 331.
- `2026-10-22` — claude: **Crumb doors, wave 3.** `check:crumb-doors` skips a redirect-only page (`redirect(`/`permanentRedirect(` and no JSX — no UI, no header; self-test fixtures prove a guarded page with a body is still flagged). Mandate record: status is the badge (`entityStatus`), its changes (`useMandateStatusActions`), Share (`useMandateShareAction`), Copy or export (hidden-trigger Alchemy session, `MandateRecordChrome.openExport`) and Promote (`usePromoteToSystemMandate`, menu-placed, refusal printed under the header) are one action list; `PromoteToSystemMandateButton`/`MandateVisibilityControl` gone. A page adds actions to the organization layout's one header with `useOrgHeaderActions` (`scopes/components/pages/orgHeaderActions.tsx`; shortcuts Refresh). Invitation accept pages are levels (`RecordPageHeader level=`). Sibling loaders: `crm-sending-identity` (mailbox named by its address), `pc_show`, `visual-map-sample`; `siblingHref` matches and writes encoded ids. Layout fallbacks: podcast studio, flashcards, masterwork record. Census 516 → 419.
- `2026-10-22` — claude: **Crumb doors, wave 2.** Agent record: the app's `AgentOptionsMenu` slot (what `@ai-matrx/chat`'s `AgentHeader` renders — no package change) declares its whole list to the frame's "…" and draws no second "…" there. The host lists each action id once (`uniqueActions`; a header mounted twice declared twice). Notes exemplar: `NotesView` declares `[Notes] › <note ▾>` (siblings from the store's list) and its page tools as one list (`NotesHeaderTools` + "…"); the active `NoteTabItem` declares THE note action list (`noteActions`); Versions page's record is the note. `record-siblings`: `note`, `crm-outreach-list`. Classic `CrumbTrailHeader` uses `CrumbDoor`; `isPlainClick` moved to `frame/plainClick.ts` so the door carries no sidebar code.
- `2026-10-22` — claude: **Menu-placed actions; battle + create-agent trails.** `EntityHeaderAction.placement: "menu"` on a page = not a button on the line: the line's one Actions menu (classic desktop), the frame's "…", the ⋮ sheet — so a secondary-verb menu is never a `right=` control (Meetings moved onto it). Sandbox status → `entityStatus`, its Copy / Copy for AI → actions; Projects' copy buttons → actions (`copyProjectForAi`). Every Agent Battle runtime declares the trail (`useBattleTrail`), `BattleHeader` names a saved battle (declared record) and declares its action list to "…"; `/agents/new/*` layout draws `DerivedCrumbTrailHeader fallback`. Census 552 → 516. Tests: `page-crumbs-in-frame.test.tsx` (menu-placed classic + frame).
- `2026-10-22` — claude: **A page is a LEVEL or a RECORD.** `RecordPageHeader level={{ name }}` declares a list, queue or place with no id of its own (`/crm/deals`); its crumb's door is the derived trail's siblings for that level (menu rows, else the route tree on first open) — `EntityModeHeader entityLoadOptions`, frame and classic. The classic entity name's private "Switch" dropdown is gone: it draws `CrumbOptions` (the frame's `CrumbDoor`, one component). 92 level pages moved from `record=` to `level=` (census 644 → 552). Test: `frame-host/__tests__/page-crumbs-in-frame.test.tsx` (level: classic door, frame door, a record never borrows). Phone ⋮ agents row is "Agents for this page" again (the desktop button's name; defect 95 / Q-05 test landed without its code half).
- `2026-10-22` — claude: **Every crumb is a door; "…" holds every action** (section above). Dead crumbs fixed as a class: pageless levels dropped from derived trails (115 manifest trails linked a folder with no page), a template in a layout links back to its level (Smart Add brand on `/marketing/brands/smart-add/validate/<id>` was text), four declared org crumbs got their address. `CrumbDoor` (products / places / siblings, searchable); `EntityModeHeader` declares every action to the frame's "…". Guard `check:crumb-doors` (census 649).
- `2026-10-22` — claude: **Host chrome round 2.** A hosted title field is text-sized (`host-chrome/SizedTitleInput`, same mirror technique as `NoteTitleField`/`EditorTitleField`; Task, Map and the Document tile use it) so the rest of a tile header still drags; the Map's save state rides beside its name (no bar row). Scope tile keeps its Context items door. ONE record menu: `components/official/RecordActionsMenu` now takes `hint`/`group`/`id` and a text trigger, and `RecordPageHeader` uses it (its private dropdown is gone). Meeting/Sandbox bars choose buttons by the action's `placement: "bar"` + `barTone` (never label text). `EditorDocumentHeader` hosted + Microsoft look draws the ribbon only. `BoardTile` passes a stable `onTitleClaim`. Guard extended in `host-chrome-contract.test.tsx`.
- `2026-10-22` — claude: **Record host chrome** (section above): one primitive for "the host already names this record"; BoardTile provides it for every tile, `RecordPageHeader` and `EditorDocumentHeader` read it, `DesktopAction` exported from `EntityModeHeader` for its bar.

- `2026-10-22` — claude: **One name for the Side Chat's door.** The 768–1023px header button (`ShellChatToggle`) and the phone ⋮ row read "Side Chat" with the rail's square bubble (`MessageSquareText`), so nothing but the navigation says "Chat". On domain-panel pages the rail's Side Chat row has its own grid row under the toggle (the sidebar grid is now brand · Side Chat · icons · footer). The server reads an empty or unreadable chat cookie as closed (`parseCanvasChatCookie(…, false)`).

- `2026-10-21` — claude (CLOSE-PERF, CD-PERF-01): **the header decides its fold before the first paint.** At 768px /data/<table> painted the shell's five controls, then folded them into the ⋮ once the table page's header mounted (CLS 0.003, admin and member). Four pieces: (1) `HEADER_CROWDING_PREPAINT` installs the crowding guard while the HTML parses (from `HeaderCrowdingGuard`, now the header's last child); it measures the route header's ghost as well as the center, the ghost script asks it to decide in the frame it draws, and hydration adopts it; an empty center between two route headers keeps the decision; (2) AppShell holds the first paint with `<link rel="expect" href="#shell-first-frame" blocking="render">` until the marker after `<main>` is parsed, so the shell never paints before the route's first frame; (3) a slot's ghost layer draws only the newest clone of a kind (loading.tsx and the streamed page both draw a header); (4) RouteHeader reserves its first-visit cluster from the server's HTML, and the table route's skeleton draws its header (`DataRouteFallbackHeader`). Guard: `layout-gate/header-folds-before-first-paint.spec.ts` (red without each piece).
- `2026-10-20` — claude: **floating things never move the page** (Arman). Removed every make-room path (corner clearance, alarm clearance, the fixed floating measure, the assists inset, three pages sizing by what floats); the error badge lifts off controls; the chat dock rests above a list pager; guard `check:overlays-never-move-page`. Section above.
- `2026-10-20` — claude (Lane P): **an in-flow framed dock is solid.** 5dcee07f6 put the dock in flow but it still drew glass; §13d now re-declares the glass tokens opaque on it. Section above.
- `2026-10-20` — claude (Lane O): **a framed page's phone docks are its last row.** In a launchpad App page widget /notes drew its phone dock (undo, formatting, Home/Copy/Tags/More) over the note's text behind glass; `data-matrx-page-dock` + shell.css §13d put it in the page's flow inside a frame. Section above.
- `2026-10-19` — claude (custom-experience lane A): **every nav node has a permanent id** (`ShellNavItem.id` / `ShellNavChild.id`, guard `__tests__/nav-ids.test.ts`) and `shell-layout/` gains the catalog, validator and resolver for custom layouts — read `shell-layout/FEATURE.md`. Renderers unchanged.

- `2026-10-15` — claude: **The chat's door is the rail's first row** (`sidebar/SidebarChatToggle.tsx`, `.shell-nav-chat`, pressed while docked open). The header's `ShellChatToggle` shows only at 768–1023px (no rail there); the header, the dock's top row and the canvas header no longer reserve room for a fixed button — a closed chat's button sat where every page puts its back chevron.

- `2026-10-08` — claude (lane AF): **Shell eager set shrinks.** The chat package's preview hook slot is `useHtmlPreviewStateOnDemand` (loads the real hook — and `@ai-matrx/print/markdown` — when a preview first opens; it suspends into the overlay's loading state), and `lib/organizations/linkOrganizationSession.ts` dropped `"use client"` so `appContextSlice`'s `import()` of it is an on-demand chunk, not a client reference. KaTeX stays eager only through the `convertMarkdownToHtml` slot until `@ai-matrx/chat` 0.5.2 (awaits it) is served. Guard: `pnpm check:shell-eager-graph`.

- `2026-10-05` — claude: **One chat.** The shell chat (`ShellChatDock`) now shows on the Board, signed-in Education and the canvas demos too — they no longer draw their own chat column; it stands aside only on /chat and /code. The shell header hides by `visibility` in canvas chrome so `ShellChatToggle` stays at its pixel (the canvas header pads for it, `.canvas-workspace-header`); full screen hides the chat button. AppShell reads the chat cookie for the page's HOME (`shellChatHome`: each board, Education, else the family) and stamps `data-shell-chat-available` at SSR. Mechanics: `../aidream/apps/shared/chat/src/canvas/workspace/FEATURE.md`.

- `2026-10-21` — claude: **ONE derived breadcrumb (feature-pages rule 7).** `features/shell/breadcrumbs/`: `deriveTrail` (pure; address + menu `nav-data` + record names → crumbs with sibling menus), `useDerivedTrail`, `<DerivedBreadcrumb />` / `<DerivedCrumbTrailHeader />`, `trail-overrides.ts` (the ONE override list: a label or `null` to hide, `:param` patterns), `route-siblings.ts` (route-tree siblings loaded when a dropdown first opens). Labels: override → declared record → menu label → `All <module>` → uuid shown through `RecordId` → humanized segment. Record names: key/slug in the address, else the page's declared record (`useDeclareCurrentRecord`), else `public.entity_titles` (title_column) via `useEntityTitles`, else the id chip. `CrumbTrailHeader` gained `loadOptions`, `recordId`, `optionsAllHref`. `RecordPageHeader` derives its parents when `parents` is omitted. Guard `pnpm check:derived-breadcrumbs` (shrink-only baseline of hand-typed `parents=`/`trail={[`). Trial: `/agents/all`, `/agents/shortcuts`, `/agents/categories`, and the Scopes header (`ScopesRouteHeader` supplies only each level's name and siblings). Deleted dead `MatrxBreadcrumb`, `module-header/Breadcrumbs`, `providers/layout/Breadcrumbs`. Open: `/agents/[id]/*` header is `AgentHeader` in `@ai-matrx/chat` (needs a leading-crumb slot + publish); `AutoBreadcumbs*` (ModuleHeader) is another breadcrumb to fold in.
- `2026-10-05` — claude: **`RecordPageHeader` has a top-level form.** `backHref` is optional (and on `EntityModeHeader`): omit it on a module-home, queue or inbox page that has no parent and the line is just the name (no back chevron, `parents` empty). A trailing action is a declarative `actions` entry (`primary: true`, `href`), never a free-form slot — `CasesListClient`'s New case moved onto it. A page's `MandateDoorLink` icon variant renders nothing and only registers the door, so it sits beside the header, not inside. ~85 raw `PageHeader` page tops (commerce, CRM, marketing, notifications, boards, maps, reports, HR, dashboard, launchpad…) moved onto the template; `check:page-top` baseline 495 → 433. Still on a raw `PageHeader` and named gaps: `AdminModuleHeader` (admin route-tree crumbs + module menu + injected items), `ScopesRouteHeader` / `ScopeBreadcrumb` (org-level drawer, "see all" links, confirm-delete actions), the header-variant family (`HeaderToggle`, `HeaderTabs`, `StudyDeckHeader`), and header-with-live-control pages (`ShapesListHeader`).
- `2026-10-05` — claude: **Page-top templates.** `RecordPageHeader` (internal record page, ONE line: back + parents + record + modes + actions; named options only), `EntityModeHeader` gains `trail`, `CrumbNode` exported, `HeaderSpecimen` + specimen context so the system page shows the real template (the old mock drew two lines under a back chevron — owner: "busy and sloppy"). Guard `check:page-top` + shrink-only baseline (593 → 583 after wave 1: 10 raw `PageHeader` pages moved onto `RecordPageHeader`).

- `2026-10-19` — claude: **The page runway is half the screen.** /notes Plain mode ended 44px under its last line (ProTextarea's reserve replaced the editor's padding), Read mode 78px (the assists inset replaced its 85dvh), and the page assistant sat on the notes status bar, which read through it like a second input. One token `--matrx-page-runway`, assists inset only adds, ProTextarea reserve is a floor, `data-matrx-page-foot` lifts the dock; the page-rhythm guard no longer calls a runway "padded twice". Guards in the section above.
- `2026-10-04` — claude: **The floating clearance is a shell primitive.** The education-overview sample lost its bottom room and the chat dock sat on its last row; instead of a page fix, `FloatingClearanceSync` + the `::after` runway in `shell.css` give every page scroll owner a live-measured end runway, with a runtime guard and a static check (section above). Tagged floating chrome: assists dock (desktop pill + phone FAB), window tray, `MobileActionBar`, `UnifiedActionBar`.
- `2026-10-04` — claude: **The mobile dock has no reserve of its own.** A `[data-show-dock]` route padded `.shell-main` by the dock height (86px) and the floating runway (which measures `.shell-dock`) stacked on top: 222px of blank at 375px on /user-settings and /research. The per-route reservation is deleted; the floating clearance is the only source. Guard: `styles/__tests__/no-overlay-layout-reservation.test.ts`.
- `2026-10-05` — claude: **`MobilePanelShell` drawers are ONE sheet.** Picker and opened panel used to be two sibling `BottomSheet`s; tapping a panel closed the picker and opened the panel in the same tap, the closing sheet returned focus outside the new one, and the new one dismissed itself — so phone "Panels → X" showed nothing on every drawer route (found on `/transcripts/studio`). Now one sheet swaps picker ↔ panel content. A route with exactly one panel skips the picker: the trigger is named and drawn as that panel (e.g. "Sessions") unless the route passed `menuLabel`/`menuIcon`. Verified in the browser at 375px: ⋮ → Sessions → session list → pick opens the session.
- `2026-10-03` — claude: **The header is not glass; the shell owns the top boundary once** (owner ruling, 2026-10-03; reverses the direction of the 2026-10-02 "all glass" entry below and the same-day `EntityModeHeader` capsule). The header band is solid (`.shell-header::before`, now exactly the header's box — the 1rem fade tail it used to paint is gone), so by "glass only floats" every header control is `variant="transparent"`: the five-icon set (Search, Agents, Canvas, Messages, Notifications), hamburger, chat toggle, phone ⋮ trigger, `RouteHeader`'s overflow `…`, `MobilePanelShell`'s trigger, and the `CrumbTrailHeader` / `EntityModeHeader` back + trail/name (no glass capsule; the trail keeps its own 3px half-gap, `ps-[3px]`). No border under the header. The ONE boundary is `<div class="shell-header-fade">` rendered by `Header.tsx`: 8px (`--shell-header-fade-h: 0.5rem`) background→transparent, absolute at `top:100%`, pointer-events off, zero layout space — so `--shell-header-clearance` is now just `--shell-header-h`. Guard: `__tests__/header-top-boundary.test.ts` (6/8 red against the previous files, the other two red on planted `border-b` / `box-shadow`); the "is ALL GLASS" case in `header-right-set.test.ts` is removed. `RouteModeNav`'s track is now `bg-muted` (was a glass capsule), matching /chat's mode switch. Not changed yet: route-injected header buttons that still take the glass default (~370 files inject header content; a separate sweep).

- `2026-10-03` — claude: **`EntityModeHeader`: back and name in one glass capsule.** The template drew a glass back button beside a bare name, which the tap-target guard flags (placement rule 2: all glass or none) on every one of its ~50 consumers (`/artifacts/<id>` included). Back is now the group variant inside one `data-matrx-glass` capsule with the name (the `CrumbTrailHeader` shape).
- `2026-10-03` — claude: **A title never yields to a nav that cannot draw.** `RouteHeader` capped the title to leave the center nav its smallest trigger, clamped at the title floor — so when even a floored title left too little for the trigger, the center drew nothing and the title still sat at its floor (`/war-room/<id>` beside a 360px canvas: "Acme…" at 42px beside a blank 56px gap). `titleMaxWidth` returns no cap in that case. Test: `components/header/__tests__/title-max-width.test.ts` (red on the old clamp).
- `2026-10-03` — claude: **The header answers the MAIN COLUMN, not the window.** With the canvas open the header spans only the main column (1440px window + 640px canvas → ~516px header), but the header's responsive choices read the viewport, so `/chat/<id>` drew its Chat · Work · Advanced switch over Records / Attached / the page menu (seven overlapping pairs, OVERDRAWN logged). Four shared pieces: (1) `.shell-header-center` is a size container (`container: shell-header / inline-size`) — a route header splits by `@min-[…]/shell-header:`, never `lg:` (`AgentHeader` moved, 44rem); (2) `HeaderCrowdingGuard` gained a fold stage: when the route is left < 240px, or compacting words was not enough, the header sets `data-header-folded` and the right set folds into the one ⋮ exactly as on a phone; (3) `useCenterControlFit` — the measured form for any control in RouteHeader's center (centered slot → in-flow → nothing), which `ComposerModeSwitch` now uses instead of `sm:`; (4) last resort: `data-header-overdrawn` makes the route's row scroll under its own clip instead of painting under the right set. `ChatRunHeader` moved onto `RouteHeader` so its actions fold into "…". Guards: `layout-gate/header-never-overdraws-route-controls.spec.ts` (canvas-width cases, red without the guard), `components/header/__tests__/center-control-fit.test.ts`.

- `2026-10-02` — **The shell header is all glass, row by row** (tap-target placement rules, owner 2026-10-02). Measured: `.shell-header` is `position: sticky` and `.shell-main` is pulled up under it (`margin-top: -var(--shell-header-h)`), so the page scrolls behind the bar — a floating bar by the rule's own definition (the opaque `::before` band is the legibility scrim, not a solid bar). So every row in it is glass: `CrumbTrailHeader` puts the back button (group variant, 28px pill in a 32px box) and the trail in ONE glass capsule (`data-matrx-glass`), trail inset `ps-1` so pill-to-text is one 6px gap, end inset `pe-2` to match the glyph's start inset; `HeaderControlSet` passes `<CanvasToggle variant="glass" />` (`@ai-matrx/canvas` 0.2.2 added the prop; it defaults to transparent). Before: a glass back circle beside bare text 3px from its pill, and a plain canvas icon among four glass ones. Guard: `__tests__/header-right-set.test.ts` "is ALL GLASS" (red against the old set). Design-system 0.53.2 teaches the dev guard that a badge host around one glass button is glass.

- `2026-10-01` — claude (phone run PB-08 #2): **The app follows the device until the person picks a theme; the account rail is the top of the phone menu.** Settings → Theme is Light | Dark | Device (`ShellSettingsMenu` `ThemeRow`, 44px segments on a phone; Device = `theme.mode: "system"`, now the slice default — see `lib/sync/FEATURE.md`). The phone drawer renders the person, organization and Settings rows ABOVE the route menu (`renderAccountRail`), no longer below every admin section. Focus no longer stays inside an aria-hidden tree: the drawer blurs the `#shell-mobile-menu` checkbox on open and the Settings row blurs itself before its nested sheet. Guards: `mobile-sheet/MobileNavigationDrawer.account-row.test.ts`, `styles/themes/__tests__/themeSlice.followsDevice.test.ts`.

- `2026-10-01` — **One menu family; organization favorites.** Settings, Organization and the account menu share one panel (`USER_MENU_PANEL_CLASS`, 288px), one header (`account-rail/RailMenuHeader`: a 28px colored mark, title, subtitle, a door to its page) and one row (`MENU_ITEM_CLASS`). The organization picker (`@ai-matrx/design-system` 0.50.0) drops "Keep it at the top" and "Working in …": the active row is highlighted, every row has a favorite star (`useOrganizationFavorites` → `public.ues_set`/`ues_list`, entity_type `organization`; the old single star carries over once), and marks are colored (`OrganizationMark` / `organizationColor`, also used for the person's initial — `user-block/RailUserAvatar`).

- `2026-09-30` — **One sidebar on canvas pages.** /board, /education (signed in) and the canvas demos show the shell sidebar + account rail instead of their own canvas nav (deleted with `CanvasUserRow` and its cookie). Route-menu entries take `defaultView` (`routeMenuDefaultView`, honored by the desktop slot, the phone drawer and SSR); the canvas-workspace entry is the same `ChatSidebarMenu` with `defaultView: "main"`, hosted in the page's chat panel via `in-place-chat-host`. Guards: `route-menu-slot.test.ts`.

- `2026-09-30` — **The account rail + the header control set** (owner ruling): Settings, Organization and You are the sidebar's three bottom slots, aligned to the nav's icon column (the avatar was 32px and centered 4px left of it; footer icons were 2px right). `ShellOrgSwitcher` is the one org control; `HeaderChooseOrgButton`, `UserMenuOrgSection`, `CanvasOrgDropUp`, `ThemeToggleMenuItem` and the unused `GuestUserMenuPanel` family are deleted. Theme/Media/Preferences moved from the avatar menu into the Settings slot. The header is `HeaderControlSet` (Search, Intelligence, Canvas, Messages, Notifications), shared by the shell header and `/board`; Messages split from Notifications with its own count; Canvas is never disabled (empty opens `CanvasHomeSheet`). The scope tree's organization read now carries `logo_url`.

- `2026-09-27` — **A menu is never the phone primary**: keeping the last action in the row (c397bcf4a7) put a page's own "…" / record menu beside the shell's ⋮ — two overflow buttons. Below 768px `RouteHeader` now sends every MENU action to the ⋮ sheet and keeps the last NON-menu action as the primary (none when every action is a menu). Menus are known by what they declare, never DOM text — `isMenuAction` in `components/header/route-header-layout.tsx`: identity (`DropdownMenu`, `MoreHorizontalTapButton`), an overflow `icon` (lucide `Ellipsis` / `EllipsisVertical`, i.e. `MoreHorizontal` / `MoreVertical`), a single-child host wrapper around one of those, or the `routeHeaderMenu = true` static (`ItemMenu` carries it; a page's own menu component declares it the same way). Desktop is unchanged. Guard: `route-header-phone-actions.test.tsx` "a menu is never the primary" (3 of 3 red against c397bcf4a7).

- `2026-09-27` — **A page's primary action never leaves the phone header row**: below 768px `RouteHeader` moves only the SECONDARY actions into the ⋮ sheet (`phone-page-actions.ts`); the primary (last, per the RouteHeader contract) stays in the row, icon-only when it is a labeled tap button (caption kept as accessible name + tooltip). Fixes a93cd8029e burying "Submit all" (/agents/battle) and "New meeting" (/meetings) in the sheet. Guard: `components/header/route-header-phone-actions.test.tsx` (3 of 6 red against a93cd8029e).

- `2026-09-27` — **No nav item sits under the account block**: the `--shell-user-block-h` reservation moved from `.shell-sidebar-footer` (hidden on the settings route, so /user-settings' last item sat under the avatar) to the `.shell-sidebar` column at desktop widths. Landed in sweep commit `591d465ff0`. Guard: `__tests__/sidebar-reserves-the-account-block.test.ts` (2 of 2 red against the old CSS).

- **2026-09-27** — Chat beside a page is the canvas workspace (`../aidream/apps/shared/chat/src/canvas/workspace/`), not a shell column: the short-lived right-side chat dock and its header control were removed. Signed-in `/education` renders in canvas chrome (`SIGNED_IN_CANVAS_CHROME_ROUTES`, `data-signed-in`).
- `2026-09-27` — **The phone header keeps the title**: below 640px Search / Agents / Canvas / Inbox fold into `HeaderPhoneOverflow` (one button → bottom sheet with the same four). `AGENTS_AUTH_GATE`, `INBOX_AUTH_GATE`, `useOpenBarOrGate`, `useCanvasHeaderToggle`, `SurfaceAgentsPanelImpl` are exported so the sheet reuses each control's own copy and state.

- `2026-09-27` — **"Choose org" is a call to action, not an alarm** (page-pass shared defects): the header nudge, the avatar ring and the account menu's Organization icon move from red to primary. Guards: `HeaderChooseOrgButton.test.tsx`, `UserMenuOrgSection.test.tsx`.

- `2026-09-27` — **Menu items close the menu** (page-pass, Feedback window): `MenuItemCloseLabel` replaces the bare `<label htmlFor>` wrapper in every item; button items (Submit Feedback, Announcements, Approvals, Error Inspector, Copy short link…) used to leave the user menu open.
- `2026-09-27` — **Canvas chrome**: `ShellChromeMode` / `ShellChromeRouteSync`, `CANVAS_CHROME_ROUTES`, `shell.css` §13c, and `features/shell/canvas-chrome/` (the canvas nav + user row) for the chat-beside-a-canvas layout (`../canvas/workspace/FEATURE.md`).

- `2026-09-26` — **The layout gate now loads the CSS the app SHIPS.** `layout-gate/shipped-css-region-triggers.spec.ts` derives every `@ai-matrx/*` stylesheet the app imports (from the repo's own `import "…css"` / `@import` lines, resolved through Node, nested `@import`s inlined) plus `styles/shell.css`, and measures a sidebar row, the composer textarea, a message region and a nested `.matrx-tap-icon` with vs without `CONTEXT_REGION_TRIGGER_ATTRS`. RED on design-system 0.44.1 (`MATRX_LAYOUT_GATE_CSS_OVERRIDE=@ai-matrx/design-system=<dist dir>`: row 32px vs 240px, composer 32px vs 665px, icon 18px vs 14px), GREEN on 0.44.3. `pnpm check:shell-layout` (`scripts/check-shell-layout-gate.mjs`) runs the whole gate as a release after-phase SIGNAL row; missing Chromium is `[FAIL] UNMEASURED` with the install remedy.

- `2026-09-25` — Removed the retired top-right elevated profile menu from both shells and floating panels; `ShellUserBlock` remains the profile control.

- **2026-09-21** — The account menu's collapsed groups are now HIDDEN, not just
  clipped. `MenuGroup`'s `grid-rows-[0fr]` disclosure kept every collapsed row
  in the hit-test tree and the tab order, so a group low in the panel parked
  live buttons below the panel and below the window: cold walk 16's defect E
  measured the theme row at `top 878, bottom 906` in a 900px window, answering
  `elementFromPoint` with `LABEL.shell-user-menu-backdrop`, unscrollable (a
  clipped child adds nothing to `scrollHeight`) and unclickable (three real
  mouse clicks timed out). Fixed with `invisible peer-checked:visible` on the
  disclosure; `.shell-user-menu-panel` subtracts the safe-area insets from its
  viewport bound. Gate:
  `features/shell/layout-gate/user-menu-reachability.spec.ts`, which runs at
  1280x720, **1440x900** (added to `config/playwright/playwright.shell-layout.config.ts` for
  this defect) and 390x844.

- **2026-09-19** — Created with the header right set and the bottom-left user
  block. Deleted: `CanvasPaneHeaderChrome.tsx`, `CanvasReopenChip.tsx`,
  `ElevatedShellUserMenu.tsx` + store, the canvas/elevated menu CSS, the
  `:root[data-canvas-open]` avatar hide, `NotificationsMenuItem.tsx`,
  `MessagesMenuItem.tsx`, `ApprovalsMenuItem.tsx`.

- **2026-10-07** — The header ghost's clone no longer carries
  `data-page-header-portal` (it wears `data-page-header-ghost-portal`; the
  fallback-hide rule in `styles/shell.css` covers both). A page had two
  `[data-page-header-portal]` nodes from first paint to hydration (~1-2s) — the
  real one plus the ghost's clone. Guard: `page-header-ssr.test.tsx` counts one.
- **2026-10-15** — The domain panel (chats list beside the icon strip) is user-resizable: a drag edge on
  the sidebar's right border (`DomainPanelResizeHandle`, double-click resets, arrows nudge; 192–480px)
  stored in localStorage and published as `--shell-domain-panel-w-user` before first paint
  (`domain-panel-width.ts`). The sidebar's right border now uses `hsl(var(--border))` — it was
  `rgba(255,255,255,0.2)`, invisible in light mode — and runs the full height. Panel padding 8px → 4px.

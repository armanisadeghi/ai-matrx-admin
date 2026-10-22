# FEATURE.md — `shell/frame` (the new app frame)

**Status:** `scaffolded` (playground only; the live AppShell is untouched)
**Tier:** `2`
**Last updated:** `2026-10-20`

---

## Every page has a home

`route-homes.tsv` gives every page in the app (core, transitional, public, portal, link, meet, kiosk, root) its node in the product tree (common-docs/projects/app-frame/TREE.md) and how a person finds it today. `__tests__/every-page-has-a-home.test.ts` fails on a page with no row, a blank home, a duplicate or a stale row (owner, 2026-10-20: nothing built is ever lost). Add a row with every new page.

## Purpose

The new app frame from the owner's model (2026-10-17): AI Matrx works like Google Workspace. Each
product has its own sidebar, and one app grid, header row, tabs row and footer hold the products
together. Linear is the visual reference. It is built beside the old shell and is host-agnostic
(props in; only `@ai-matrx/design-system`, `lucide-react` and `cn`), so moving it into
`@ai-matrx/shell` (`aidream/apps/shared/shell`) is a copy.

## Entry points

- **Playground:** `/lab/shell` (`app/(lab)/lab/shell/`). Static sample content for Chat, CRM and
  Docs, with a toolbar outside the frame for product, variant, theme, width
  (Fit = the real window, 2560 / 1920 / 1440 / 1280 / 1024 / 375), "Show what's ours" (frame
  regions dashed in the primary color, page regions in green) and a "loaded" readout fed by
  the sample loaders, so the lazy rule is visible. The sample side chat and canvas
  (`SampleCompanion.tsx`, `SampleCanvas.tsx`) arrive by dynamic import. A Docs document shows
  the ask bar. `?side_chat=open|closed` opens the page with the side chat in that state.
  "Hairline | Fade" switches the header's lower edge for the owner's comparison.
- `AppFrame.tsx`: the frame. Holds the forms, the variants, the drawer and the companion.
- `AppGrid.tsx`: the 9-dot product grid, Google-tight (owner, 2026-10-20): a 26rem popover that
  never scrolls at common heights (owner, 2026-10-22): 5 columns of 72px cells, 60px under a
  760px screen, 6 columns under 600px (`gridLayout`); the body may use all the room under the
  button, so only a very short screen scrolls. The favorites (up to 9) in a
  rounded card, then every other product ONCE in family order, with no heading rows; "Edit
  grid" sits under the grid. Grid A is the owner's pick (2026-10-21; B and C are gone). A
  search field tops the popover (focus on open): it filters tiles as you type by name,
  section and page, Enter opens the first match, ArrowDown enters the tiles, Esc clears then
  closes. A tile always opens its product in a new tab; the grid is one Tab stop and arrow
  keys move between tiles.
- `GoToSearch.tsx` + `GoToPalette.tsx` + `goToIndex.ts`: the "Go to" search (owner, 2026-10-21):
  an icon in the sidebar's top row (and beside the grid button when the sidebar is hidden) opens
  a palette that finds any product or page by name or synonym and goes there; results are
  grouped under the product's mark. Hotkey Cmd/Ctrl+Shift+K (Cmd+K is the knowledge bar's,
  Cmd+/ the classic menu search's). Enter goes (`onGoTo`, else the location), Cmd+Enter opens a
  new tab. The index covers every page with a home row: products and sidebar rows from
  `route-homes.generated.ts`, plus `go-to-pages.generated.ts` (every concrete page in
  `route-homes.tsv`, titled from its flow title or its last segment; account-menu pages under
  "App menu"; dynamic, plumbing and to-be-deleted pages left out). Both are built by
  `pnpm frame:route-homes`; the go-to file is imported only by the palette, so it and the index
  load on first open. The ranking is `searchEngine.ts`, shared with the classic "Search menu". Host
  menus merge in through `goToEntries`. The phone header has no icon of its own (its search
  tool is the host's); the drawer carries it.
- `FrameSidebar.tsx`: the product's own menu. Every row is a real link (`href`, defaulting to
  `<homeHref>/<id>`). A plain click calls `onSelectItem`; a modified click keeps the browser's
  link behaviour.
- `SheetHeader.tsx`: breadcrumbs (links), the star (only for items that can be favorited), the
  "…" menu (`defaultPageActions`) and the right-side slot. On phones the header shrinks to
  back or menu, the title and "…".
- `SheetFooter.tsx`: the status slot, Properties, history and help.
- `FrameModules.tsx`: the heavy-module machinery: `lazyModule` (one `React.lazy` per loader),
  `ModuleSlot` (Suspense with a row skeleton, and an honest failure), the labelled stand-ins,
  the side chat's resize handle and the ask bar.
- `flows/` (`index.ts` + one JSON per family, schema `flows/SCHEMA.md`): what every product
  holds and how its pages connect. The playground draws each sidebar from it (rows are the
  flow's sections, hover shows the real route; Intelligence's six parts are its sections) and,
  in "Body: Flow" (default), shows the product's Map, Journeys and Problems; "Big picture"
  shows every family, product and section on one screen (`app/(lab)/lab/shell/FlowView.tsx`).
- `ProductMark.tsx`: a product's mark, Google's way: the glyph itself in the product's color
  (the design system's chip ink for its hue, light and dark values), 40px in the grid's 48px
  cell (stroke 1.5), 18px beside the sidebar's product name (stroke 1.75). No tinted tile.
- `products.ts`: THE product list, following the owner's tree
  (`common-docs/projects/app-frame/TREE.md`): Yours, Memory, Build, Productivity, Business,
  Solutions, More; each sidebar mirrors the tree's second level. Memory's mark is Lucide
  `Infinity` (never Sparkles; `BrainCircuit` is Intelligence's).
- `frame.css`: the frame's tokens and its few structural rules.
- `geometry.ts`: the remembered geometry as COOKIES the host's server reads (sidebar width,
  side chat width, and the side chat's open/closed choice per page key in ONE bounded cookie,
  `FRAME_COMPANION_OPEN_KEEP` pages). The host passes the read as `initialGeometry`, so the
  first paint is right; without it the frame reads the cookies after mount. No localStorage.

## Chrome slots (ROLLOUT-PLAN blocking change #1)

The frame draws no app chrome of its own; the host fills four slots (data or nodes, never style):

| Slot | What the host passes | Phone |
|---|---|---|
| `headerTools` | its right-group components (node), drawn before the frame's side chat and canvas toggles | not drawn |
| `phoneTools` | the same tools as data (`FrameHeaderTool[]`) | `phone: "show"` stay, the rest are "…" items |
| `sidebarFooter` | settings, organization, the person (node), pinned under the menu | the drawer's foot |
| `appearance` | `{ look, accent }`, stamped as `data-shell-look` + `data-matrx-accent` and tokens | same |

The side chat and canvas toggles stay the frame's. matrx-frontend's host adapter is
`features/shell/frame-host/FrameChrome.tsx` (the live HeaderControlSet controls, ShellSettingsMenu,
ShellOrgSwitcher and UserMenuPanel in their `frame` variants, look/accent from the shell layout
selectors); `frame-host/frameGeometry.server.ts` reads `initialGeometry`. The lab playground
cannot show the real chrome: it has no `Providers` (redux store, signed-in session) and mounting
them would pull the app's client graph into the fast lab build; parity is proven by
`frame-host/__tests__/frame-chrome.test.tsx` until the (core) switch.

## The live (core) switch (ROLLOUT-PLAN P1)

- **Who:** `frame-host/frameMode.ts` — `FRAME_ROLLOUT = "admins"` (code constant). Guests and
  members are always classic. An admin opts in with `?frame=new` (remembered in the `matrx_frame`
  cookie, which ONLY `utils/supabase/middleware.ts` writes) and out with `?frame=classic`. The
  server reads the param from `x-search-params`. Kill switch for everyone: knob
  `shell.new_frame_enabled` (read only when the answer would be "frame"). Toggling is a hard load.
- **Where:** `app/(core)/layout.tsx` picks `FrameShell` or `AppShell` at its one render.
  `FrameShell` (server) renders the providers both shells share (`FRAME_SHARED_SHELL_PARTS`,
  test `frame-shell-parity`), imports `frame.css` + `frame-host/legacy-contracts.css`, and mounts
  `FrameHostGate` — the ONE `dynamic()` into `FrameHostImpl` (AppFrame + FrameChrome + the route
  table). `check:shell-eager-graph` blocks all of them from every classic eager set.
- **Layer 0:** `route-homes.generated.ts` (built by `route-homes.build.ts`, `pnpm frame:route-homes`,
  drift test `route-homes-generated`) gives each product its entry and a sidebar of real links
  (from the flows; `[param]` links filled from the current page) and maps every route to its
  product and row (`routeHomeLookup.ts`). The flows, the TSV and `route-flow.json` never reach
  the browser.
- **Layer 2:** the header carries `#frame-header-center` / `#frame-header-right`, first in
  `HEADER_SLOT_TARGETS`; the derived crumbs are the center's `fallback` and hide when a page's
  own header content lands (legacy-contracts.css).
- **Layer 1 (page crumbs):** a page-top template (`EntityModeHeader` / `RecordPageHeader`,
  `CrumbTrailHeader`, `DerivedBreadcrumb`) declares its real trail through
  `frame-host/framePageHeader.ts` (`useDeclareFrameCrumbs`; FrameHostImpl provides the host) and
  draws only its status, modes and actions in the slot; the frame's crumbs become the page's
  (product icon first, repeated levels dropped), else the route table's. No host = classic,
  unchanged. Test `frame-host/__tests__/page-crumbs-in-frame.test.tsx`.
- **Page contract:** the body is a `.shell-main` scroller (runway rules apply as written);
  `--shell-header-h: 0`, `--header-height` = the frame's chrome. Side chat and canvas show as
  disabled toggles ("comes … in the next step") until P3.

## Product sidebars (owner, 2026-10-22: one sidebar column, the product's own navigation)

`AppFrameProps.sidebarContent` fills the sidebar body in place of the route table's rows (top row,
Pinned, big items and footer stay; the frame's width and resize govern it). The live host picks it
in `frame-host/frameProductSidebar.tsx`, most specific first:

1. **A page's own sidebar** (kind B): the page wraps its column's content in `<FrameSidebarContent>`
   and drops its own column chrome when `useFrameSidebarSlot()` is true (`frame-host/frameSidebarSlot.tsx`,
   tiny and eager; FrameHostImpl provides the slot around the page body only, so windows never
   claim it). In the frame the content is portalled into the column; in classic it renders in place.
   Users: Notes (route instance, `config.frameSidebar`), Files `PageShell`, Messages, Agent connections,
   Spaces (`SpacesWorkspace`; Cmd+\ stays the frame's), org project settings, HR (`HrFrameSidebar`,
   mounted by the /hr layout: HR's whole module list with the current section's tabs under it; the
   header switcher draws only in classic). Every such route is
   declared ONCE in `FRAME_PAGE_SIDEBAR_ROUTES` (frameSidebarSlot.tsx, with its owner file; a test
   holds the two in step): there the frame reserves its sidebar body with a quiet `RegionSkeleton`
   until the page claims it, so the route rows never flash first. The reserve ends on the first claim
   or after `PAGE_SIDEBAR_RESERVE_MS` (4 s) without one (Notes' narrow list/note switch never claims).
2. **A Large Route's registered menu** (kind A, `constants/route-menu-registry.ts`, `defaultView`
   `"route"` only): the same component the classic sidebar flips into, through the registry's own
   loader and `ModuleSlot` (row skeleton, honest failure), always `expanded`. legacy-contracts.css
   shows its `.shell-nav-label`s.
3. Otherwise the route table's rows.

**The top of every product sidebar** (Arman, 2026-10-22: "This is a very important missing thing
that we have to establish or our system will fail."): under the top row, above the body, the frame
draws `ProductSidebarTop` (`@ai-matrx/design-system/item`, the conversation sidebar's top extracted —
one shape, one component): Search, the chosen **related places** (`›`; a place that is another product
opens a flyout of that product's pages, the product first), then **More** (every other place, the
product's own pages under its name when the body is a module menu or a page sidebar, "Edit sidebar…").
The places are DATA: `relatedPlaces.ts` declares one ordered list per product (another product's id, or
a shared page `page:agents|workflows|scheduled|research|tasks|notes|files`); the first
`DEFAULT_PLACES_ABOVE_MORE` (3) sit above More by default. Which ones is the layered knob
`shell.sidebar.places` (one json map, product id → place ids; system `{}` → organization → person);
"Edit sidebar…" writes the person's own entry for that product only (`setUserKnobMapEntry`). Search
finds the places and the product's own pages; Enter opens the first. Host half:
`frame-host/FrameProductTop.tsx`. A registered menu marked `ownsSidebarTop` (the /chat menu, and the
conversation sidebar that replaces it) draws its own top: the frame draws none (one top per sidebar).
This replaced the "product rows" strip (2026-10-22 round 2): nothing it reached is lost — those pages
are now in More, or are the body itself on route-row products. HR's whole-menu page sidebar keeps its
pages out of More (`productRows` false).

Inventory and open list: `common-docs/projects/app-frame/SIDEBARS.md`. Tests:
`frame-host/__tests__/product-sidebar-in-frame.test.tsx`, `frame-host/__tests__/product-sidebar-top-in-frame.test.tsx`.

## Ours and the page's (owner, 2026-10-20)

A page hands the frame DATA; the frame owns every region's geometry and look. `AppFrameProps`
has no `className` or `style`, and a test fails if any exported frame props type gains one.
Every region carries `data-mf-owner="frame"|"page"` (and `data-mf-region`).

| Region | Owner | What the page supplies |
|---|---|---|
| Sidebar shell, drawer | frame | the product's menu items, the active item |
| App grid | frame | the product list and favorites |
| Header row (44px), its lower edge, breadcrumb rendering, star slot, "…" button | frame | crumbs (and which are switchable), whether the page can be favorited, the "…" items |
| Right tools group | frame | the tools (search, notifications…); the side chat and canvas doors are the frame's own |
| Tabs row geometry | frame | the tabs |
| Body | page | the content (`children`), properties content |
| Ask bar slot | frame | on or off (`askBar`) |
| Footer | frame | the status text |
| Side chat, canvas | frame | the loaders (`loadCompanion`, `loadCanvas`), `companionOpen` / `canvasOpen` (controlled) |
| Widths, breakpoints, motion | frame | nothing |

## The frame's heavy modules

- **Side chat** ("an agent who can help you anywhere"): `loadCompanion` is called only after
  the person first opens it, never on render, and rendered through `React.lazy` in Suspense.
  Once loaded it stays mounted (inert while closed). Resizable 340 to 768px (default 350) by
  dragging its left edge or with the arrow keys; dragging 80px past the minimum snaps it shut;
  the width is remembered per browser (cookie `matrx-frame:side-chat-width`). OPEN / CLOSED is not
  the frame's: `companionOpen` + `onCompanionOpenChange` are controlled by the host (uncontrolled:
  local state, closed). The live host (`frame-host/FrameHostImpl.tsx`) uses the Side Chat's ONE
  rule and cookie — `useSideChatOpen` from `@ai-matrx/chat/canvas/workspace/side-chat-state`: per
  home (the classic dock's `canvas-workspace:<home>:chat` cookie, read on the server by FrameShell),
  closed by default, the visit's `side_chat*` link wins until the person acts — plus
  `useSideChatToggleKeys` (⌘\, the header toggle event). Its `loadCompanion` is
  `import("./FrameSideChat")`: the package's `SideChatSession` (the same session the classic dock
  renders) in its plain `SideChatPanel`, controlled by the host. ZERO WEIGHT: nothing of the
  side chat is on a page until it is opened, and it arrives as one chunk; a test fails if any
  frame or playground file imports `@ai-matrx/chat` statically, and the live host's only eager chat import is the light `side-chat-state` (`frame-host/__tests__/frame-side-chat-and-canvas.test.tsx`). ONE door: the header's right
  group (`SIDE_CHAT_DOOR`), the canvas toggle beside it; on a phone it is a "…" item.
- **Canvas**: `loadCanvas`, the same lazy rule, then stays mounted (its state survives close
  and reopen). `canvasOpen` / `onCanvasOpenChange` are controllable: the live host binds them to
  the canvas store (`selectCanvasIsOpen`, `canvas.show()` / `hide()`) and presents the canvas
  window while mounted, so `openCanvasItem(...)` from any page opens the frame's canvas; its
  `loadCanvas` is `import("./FrameCanvas")` → `features/canvas/host/ShellCanvasBody` (surface scope,
  write handlers, the package column with `placement="fill"`) — the classic column's geometry stays
  in `ShellCanvasColumn`. Its toggle is the last tool in the header's right group (Lucide `Shapes`). From
  the desktop form it is a full-height column at the sheet's right, header band included, so
  it never fights for space; its title row is the frame's, with full screen (the whole sheet,
  the sidebar stays) and close. On medium and phone it covers the sheet.
- **Ask bar** (`askBar`, e.g. the notes page): a plain input with mic and send, nothing else.
  No chat module loads until the person sends; then the frame opens the side chat and passes the
  text as `companionSeed` (`dictate: true` from the mic). It sits in flow under the body, so it
  never covers the page's last line.

## Breadcrumbs

Crumbs are data (`FrameCrumb`); the frame renders them.
- Every level is included by default. A product may omit its top level when its sidebar
  already covers it (Chat has no "Chat" crumb).
- The top level may show as its icon alone (`iconOnly`), like the Organizations home.
- A level with `options` is switchable: a down chevron beside it lists its siblings, the
  current one checked (`CRM-icon › People & Companies › Marisol ▾`). This is the org/scopes
  breadcrumb's pattern (`features/scopes/components/pages/ScopeBreadcrumb.tsx`, same option
  shape); the crumb's text still goes to the level.
- Chevrons appear nowhere else: the right-side icons ("…", the grid, notifications, account,
  side chat, canvas) carry none.

## Layout contract

- **Variants** (`record` | `list` | `workspace` | `light`) change only the body. The header
  (44px), tabs row (40px) and footer (32px) are identical in every variant.
- **Top edge** (owner, 2026-10-20; tightened 2026-10-21; `headerEdge`, default `fade`): the
  last top band (the header, or the tabs row) ends in a hairline, or in an 8px fade laid over
  the top of each scroll area. The fade takes no layout height and shows only once the area
  scrolls, so the first line sits right under the header at rest.
- **Defaults** (owner, 2026-10-21): Flush, Same sidebar color, Fade; the switches stay.
- **Forms**, measured from the frame's own width (`formFor`):
  - `wide` (1600px and wider): inline sidebar; properties, the side chat and the canvas inline
    together, as far as they fit.
  - `desktop` (1280 to 1599px): inline sidebar; properties and the side chat inline; the
    canvas and the side chat take turns (the one opened last wins; the other's door brings it
    back).
  - `medium` (640 to 1279px): the sidebar is a drawer; properties, the side chat and the canvas
    take turns; the canvas covers the sheet.
  - `phone` (under 640px): a drawer, the compressed header, no footer and a 16px gutter.
  - The record column never drops below `--matrx-frame-body-min-w` (360px).
- **Width rules** (numbers in `AppFrame.tsx`, THE WIDTH RULES; nothing is capped at the
  window — a 2560 screen gets 2560):
  - `record` and `light`: the reading column is centred at `max-w-3xl` (768px) and the extra
    width goes to the side panels; properties 288px; side chat 340 to 768px; canvas 34% of the
    sheet (440 to 960px).
  - `list` and `workspace`: the body fills edge to edge, whatever is open beside it.
  - What fits is computed, not guessed: Properties shows only while the record column keeps
    360px beside the open panels; otherwise it yields first, and the footer's Properties toggle
    brings it back by closing the canvas (then the side chat, if still needed).
- **Drawer:** while open, the sheet is inert and Tab stays inside the drawer. Esc closes it from
  anywhere, unless a popover is open, and focus returns to the control that opened it.
- **Sidebar width** (owner, 2026-10-21): drag its right edge (a hover-only 2px line on an 8px
  grab strip) or use the arrow keys; 200 to 400px, 244 by default, remembered per device
  (`matrx-frame:sidebar-width`); dragging 80px past the minimum snaps it shut.
- **Space around / sidebar color** (owner's comparisons, playground switches until he picks):
  `space` `inset` (the gap around the sheet) or `flush` (no outer gap, square outer edges);
  `sidebarColor` `contrast` (darker app background) or `same` (one color, one hairline). Both
  work together and in dark mode.
- **Motion:** panels slide on `--matrx-motion-duration-panel` / `--matrx-motion-ease-panel`.

## The color proposal (frame-only until approved)

Every value is scoped to `[data-matrx-frame]`, so nothing outside the frame changes. Inside it,
the app's own tokens are re-pointed, so controls follow without classes of their own.
`--text-sm` becomes the 13px control label, so package menus match the frame.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--matrx-frame-canvas` | `240 5% 96.5%` | `240 5% 6.5%` | app background (sidebar sits on it) |
| `--matrx-frame-sheet` | `0 0% 100%` | `240 5% 9%` | the content sheet |
| `--matrx-frame-hairline` | `240 5% 90%` | `240 4% 17%` | sheet edge and every rule inside it |
| `--foreground` | `240 6% 10%` | `240 5% 94%` | content text (near-black, not black) |
| `--muted-foreground` | `240 4% 40%` | `240 4% 64%` | secondary text (readable mid grey) |

**Rule:** when the owner approves, these values move to the global tokens (`app/globals.css`) or
the `@ai-matrx/shell` package, and the frame-only overrides are deleted. They never get a third
copy.

## Route link graph

`pnpm route-flow` writes `features/shell/frame/route-flow.json` (deterministic, sorted): every page as a node (route, file, group, tree node, menu labels, title, `inbound`/`outbound`, `inboundPages`/`inboundSynthetic`/`inboundAdminMap`, `hostedBy`, `reachableFromMenu`, `reachableOnlyViaAdminMap`), `summaryBySegment` (per top route segment: pages, reachable, reachableOnlyViaAdminMap, stranded), the `synthetic` nodes and every edge.

- **Page edges** come from the page file and the components it renders (depth 4). An import is followed only when its binding is rendered (`<X`), is data-named (`FOO_TABS`, `*Items`, `*Routes`…), or is a dynamic import; barrels (`index.ts`) are resolved to the file that defines the named export. Kinds: `link`, `push`, `config`.
- **Shared navigation is never a page's link.** Menus are `menu:<product>` (kind `menu`); a shared sidebar, tab bar, shell or crumb (`features/shell/**`, files named `*Sidebar/*Tabs/*Shell/*Crumb/*Nav`) is `sidebar:<feature>/<Name>` (kind `sidebar`); a layout's links are `layout:<route>@<dir>` (kind `layout`); the agent mode bar is `tabs:agents/mode-bar*` (kind `tab`). Each synthetic node lists the pages that host it; a host page reached makes the node's targets reachable.
- **`admin-map`** edges are links from `/<feature>/admin` maps, `/administration/documentation/**` and feature-map registries. `reachableFromMenu` ignores them; `reachableOnlyViaAdminMap` is what they alone reach.
- **Route helpers are evaluated with the call site's literal arguments**: `marketingRoutes.*` and the HR module's `hr*Href` builders (call or bare reference), `const x = helper(...)` aliases used as `${x}/suffix`, and the agent mode bar from `@ai-matrx/chat`.

Blind spots: hrefs from other helpers, slug concatenation, in-page tab state (competitors, SEO backlinks/search-console sub-views), server `redirect()` targets, links in the database.

## Frame crawl

`scripts/frame-crawl/crawl.mjs` loads every signed-in app page on the LIVE site as `admin@admin.com` and
records how it behaves, so a shell change is judged against numbers. Read-only: page loads only.

- **Run:** `node scripts/frame-crawl/crawl.mjs [--mode classic|frame] [--only /prefix] [--retry-errors] [--report]`.
  Resumable (a recorded route+width is skipped). `--mode frame` appends `?frame=new` (not live yet).
- **Routes:** `route-flow.json` groups core + transitional, minus anything `route-homes.tsv` files under
  "Not in the app frame". Widths 1440x900 and 390x844, at most 4 browser sessions.
- **Dynamic segments:** one id per pattern, kept in `ids.json`. It comes from the parent list opened with
  `?scope=mine` (Mine tab selected) or from a list with no lane control; no record means a "skipped" row.
- **Per row:** final URL, status and redirects, console and red captured errors, 5xx responses, header
  portals and crumb trails (double header), horizontal overflow, last element under fixed bottom chrome,
  CLS, time to stable, screenshot (scratch folder, never git).
- **Output:** `baseline-classic.json` (rows + summary) is the pre-change baseline recorded before any shell
  edit; later phases write `baseline-frame.json` and are compared against it.

## Tests

`features/shell/frame/__tests__/app-frame.test.tsx` (`pnpm test features/shell/frame`) covers:
the one 44px header in every variant, the star only with `favorite`, "…" always, tabs only with
tabs, no footer on a phone, the drawer focus contract, the grid's single Tab stop and arrows, and
medium never showing properties and the side chat together, the lazy rule for the side chat,
the canvas and the ask bar, the per-page memory and the link, the forms and canvas widths,
ownership attributes, and no `className`/`style` on any exported props type.

Counting frame nodes in a browser: count under `[data-matrx-frame-host]`. A tab that never paints
(the agent Browser pane while hidden) leaves React's streamed HTML in `div[hidden][id^="S:"]`
— a static, never-hydrated copy of the frame whose star reads "Favorites loading" for ever. React
removes it on the first `requestAnimationFrame`; it is not a second mount.

## Change log

- 2026-10-22 (crawl class E, second left rail): `FrameSidebarColumn` (frameSidebarSlot.tsx) is the
  one-element door for a list-beside-detail page: the page writes its `<aside>` once; classic renders
  it as given, the frame on a desktop portals its children into the column (a phone keeps the page's
  own list/detail switch). Adopted by the library catalog, library curate, term lists and live
  sessions; `<FrameSidebarContent>` adopted by the Knowledge hub views rail, data stores, the
  /notifications rail (page only; the Inbox window keeps its rail) and the study-guide rail. All
  declared in `FRAME_PAGE_SIDEBAR_ROUTES`. (transitional) now picks the frame exactly as (core).
- 2026-10-22 (adversarial review of the live frame): footer History and Help draw only when the
  host passes a handler (the live host passes none — no page-history or help target exists in
  classic either; no shared save-status source exists, so the status slot stays empty). A loaded
  canvas brings its own pane header (tabs, Expand, Close on the canvas store), so the frame draws
  its canvas title row only around the lab placeholder — one close, one full screen. Pages add
  their own "…" items through the page-header channel (`useDeclareFrameActions`; host merges them
  before Copy link / Open in new tab): RecordPageHeader's Actions menu goes there, and on a phone
  EntityModeHeader's other modes and actions go there instead of a second "…". Phone: a
  product's home (or one of its sidebar rows) shows the menu button; Back only deeper
  (`phoneCanGoBack`). The header star favorites the RECORD when the page declared one through the
  current-record primitive (`kind:id`, the same favorite PinButton writes; no new declare
  channel), else the page; an unsaved `/new` address has no star. Side chat uses the Chat
  product's icon (`CHAT_PRODUCT_ICON`), never the reserved Agents glyph. The error fallback's
  classic link keeps the query (`classicLayoutHref`). The grid's button reads "Edit grid". Kill
  switch tested: knob `false` → classic; a read that does not answer keeps the person's choice
  (fail-open by design); the middleware's cookie write is `rememberFrameChoice`.

- 2026-10-22: Go to finds every page with a home row (`go-to-pages.generated.ts`, lazy): "timesheet"
  finds /hr/time/timesheets. ONE crumb derivation in the frame: a page without a declared trail
  gets the address-derived trail (`useDerivedTrail`, the same one page-top templates declare),
  drawn through `frameHostCrumbs` → `pageTrailCrumbs`; the route table's `derivedCrumbs` is gone
  (the route table now only picks the product and sidebar row). Classic keeps `deriveTrail`
  unchanged — it was already the source, so nothing in classic moved. App grid fits without
  scrolling (`gridLayout`). Big items are the person's own first six grid favorites
  (`bigItemProducts`; `BIG_ITEM_IDS` deleted); the default order of `DEFAULT_GRID_FAVORITES` puts
  the default big items first. `every-page-has-a-home` has its own advisory release-gate row.

- 2026-10-22: HR's one menu. In the frame HR's whole module list (`resolveHrNav`, via `useHrNav`)
  is the sidebar through the kind-B door, the current module's section tabs under it; no header
  switcher, no body tab strip, no product-rows strip (`wholeMenu`). Classic unchanged. Tests
  `features/hr/shared/__tests__/hr-menu-in-frame.test.tsx` + product-sidebar-in-frame.
- 2026-10-22: Pinned starts full, edits in place (owner). Pinned is a 3-per-row tile grid at the
  sidebar's foot (product mark + short name, `shortName` in products.ts; every tile opens a new tab),
  the ONE always-visible list: the big-items list (`bigItems`, `bigItemProducts`, `BIG_ITEM_COUNT`)
  is deleted. A person with no pins sees `DEFAULT_PINNED_PRODUCTS` (Chat, Intelligence, Memory /
  Workspace, Tools); the last spot is a dashed slot. The heading's pencil and the slot open
  `PinsEditor` (reorder, remove, add a product); `onPinsChange` saves through `usePinned` (the one
  favourites store; `savePinsTo` in `frame-host/useFramePins.ts`). Test: `__tests__/sidebar-pinned.test.tsx`.
- 2026-10-22: Product sidebar top. Every product sidebar opens with `ProductSidebarTop` (Search,
  chosen related places, More, Edit sidebar…) from `relatedPlaces.ts` + knob `shell.sidebar.places`;
  replaces the product-rows strip (its pages moved into More); /chat's menu owns its top.
- 2026-10-22: Product sidebars round 2. The product's other rows stay as a strip above a module
  menu or page sidebar; declared kind-B routes reserve the body with a skeleton (no row flash);
  Spaces and org project settings migrated; the Notes filter row is the `@container/list` its org
  filter queries (fits 244px).
- 2026-10-22: Product sidebars. The frame's one sidebar column shows the product's own navigation:
  `sidebarContent` slot, kind-A registered menus (Chat, Marketing, Code, Images, Your staff,
  research topic, agent runs, user settings) and the kind-B door `<FrameSidebarContent>` (Notes,
  Files, Messages, Agent connections). Classic unchanged.
- 2026-10-22: Investigated "a second hidden frame header": React 19.2's queued streaming reveal
  (`$RB`/`$RV`) waits for `requestAnimationFrame`, which a hidden Browser pane never fires, so the
  server segment stays in the DOM. A painting browser shows one frame, header, crumb trail, sidebar
  and footer at 1440 and 390, and the star enables. No code change; counting rule added under Tests.
- 2026-10-22: Header fixes. Tap boxes beside each other carry no gap (star/"…", tools and
  sidebar-restore wrappers). The star shows neutral and disabled ("Favorites loading") until the
  saved preferences load (`FrameFavorite.known`). The classic derived trail drops a level that
  repeats the next ("Brands > Brands"), as the frame does. `HrShell` hands its trail to the frame
  (`useDeclareFrameCrumbs`) and draws no body strip there.
- 2026-10-22 (Layer 1): page-top templates hand their trail to the frame (title once, real
  crumbs); classic untouched. The star is the pin (`useFramePins`, on `usePinned`).

- 2026-10-22: Sidebar. (1) A resize drag always ends: window listeners plus pointer capture, and
  pointerup, pointercancel, lostpointercapture, window blur, Escape, the handle unmounting and a new
  pointerdown all call one idempotent stop that releases the drag cursor (the old handle left the cursor
  held when a release was missed). (2) Big items (`bigItems`: off | top | bottom, default bottom;
  `BIG_ITEM_IDS` in products.ts): the big products as one-line rows, each opening a new tab, the current
  one highlighted. (3) Pinned (`pins`, `onSelectPin`): the person's pins; empty shows a hint. The host
  maps the platform's one favourites store (`usePinned`) in `frame-host/useFramePins.ts`; the header
  star IS the pin.

- 2026-10-21 (P1 live switch): admins opt in with `?frame=new`; FrameShell, FrameHostGate,
  FrameHostImpl, the generated route table, header slots, legacy page contract.

- 2026-10-21 (frame crawl): `scripts/frame-crawl/` records the classic-shell baseline (P0).

- 2026-10-21 (round 11): defaults Flush + Same + Fade; the fade is 8px, takes no height and
  appears only on scroll.

- 2026-10-21 (chrome parity): `headerTools` is a node slot (+ `phoneTools` data), new
  `sidebarFooter` and `appearance` slots, geometry moves from localStorage to server-readable
  cookies (`geometry.ts`, `initialGeometry`); host adapter `frame-host/FrameChrome.tsx`;
  `check:shell-eager-graph` blocks AppFrame, products and FrameChrome from the classic eager set.

- 2026-10-21 (round 10): the playground's sidebars come from the product flows; Flow view
  (Map, Journeys, Problems) and Big picture; tests tie every tile to a flow and back.

- 2026-10-21: route link graph de-noised (synthetic menu/sidebar/layout/tab nodes, rendered-only imports, barrels resolved, admin-map edges, helper evaluation).

- 2026-10-21 (round 9): the sidebar resizes (snap shut, remembered); Inset | Flush and
  Contrast | Same switches; the grid's favorites card gets its own `--matrx-frame-well` token.

- 2026-10-20 (round 8): the app grid rebuilt Google-tight (card, one grid, no headings, no
  repeats, 32px whole-pixel glyphs), with the A | B | C bake-off.

- 2026-10-20 (round 7): the lineup follows the owner's tree (Memory replaces Knowledge and
  sits first after Yours; Home, Productivity, E-Commerce, Other and More added).

- 2026-10-20 (round 6): product marks lose their tinted tile; the glyph carries the color and
  fills the cell (grid, favorites, sidebar).

- 2026-10-20 (round 5): no chevrons on right-side icons; switchable crumbs (down chevron,
  siblings) and icon-only top levels; the side chat's door moves to the header; the frame reads
  the `side_chat` link with no chat import (guard + parity test); the header edge A/B.

- 2026-10-20 (round 4):
  - The wide form (1600px and wider) and the width rules; playground widths Fit, 2560 and 1920.
  - The side chat and the canvas are the frame's, loaded on first engagement only; the side
    chat resizes (snap shut), is remembered per page and per device, and honours the
    `side_chat` link; the canvas takes the header band and has full screen.
  - The ask bar. Ours vs the page's: the table above, `data-mf-owner`, no `className`/`style`.
  - Headers lose their bottom rule; menu and popover triggers carry a right chevron.

- 2026-10-18 (round 3):
  - Header tools are data (`headerTools`, `placeholderHeaderTools`). On a phone, `phone: "show"`
    tools stay in the header and the rest move into "…".
  - Drawer rows are 44px on touch, and the drawer is inside `matrx-touch-targets`.
  - The phone companion is a dialog: the body behind it is inert, and `useModalPanel` gives it
    the drawer's focus contract.
  - Medium form adds a footer "Properties" toggle, so the panel is never removed silently.
  - Tests added.

- 2026-10-21: Grid A is the only grid (B, C removed); grid search; the "Go to" search palette (Cmd+Shift+K); the search engine moved to `searchEngine.ts`, shared with the classic menu search.
- 2026-10-21: App-grid favorites persist per person (`userPreferences.appGrid.favorites`, null = default nine
  `DEFAULT_GRID_FAVORITES`); the frame stays prop-driven, the host wires `useGridFavorites`. Edit mode reorders.
- 2026-10-18: Medium form (the drawer sidebar; the companion and properties take turns; body min width). Rows and
  crumbs are real links. Phone header controls get the 44px touch ring. The drawer is inert
  behind, traps focus, closes on Esc and returns focus. The grid uses a roving tabindex.
  Tokens are renamed `--matrx-frame-*`, menus sit at 13px through `--text-sm`, hand literals
  are removed, and the light variant keeps its sheet.
- 2026-10-17: First build. The frame, the grid, the sidebar, the header and footer, the
  variants, the phone form and the playground.

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
- `AppGrid.tsx`: the 9-dot product grid, Google-tight (owner, 2026-10-20): a 320px popover,
  3 columns of 80px cells (32px glyph, one-line 12px name), the favorites (up to 9) in a
  rounded card, then every other product ONCE in family order, with no heading rows; "Edit
  favorites" sits under the grid. Bake-off until the owner picks (`look`, playground "Grid
  A | B | C"): A plain; B a hairline with a 10px family name between families; C marks on a
  soft same-hue shape. A tile always opens its product in a new tab; the grid is one Tab stop
  and arrow keys move between tiles.
- `FrameSidebar.tsx`: the product's own menu. Every row is a real link (`href`, defaulting to
  `<homeHref>/<id>`). A plain click calls `onSelectItem`; a modified click keeps the browser's
  link behaviour.
- `SheetHeader.tsx`: breadcrumbs (links), the star (only for items that can be favorited), the
  "…" menu (`defaultPageActions`) and the right-side slot. On phones the header shrinks to
  back or menu, the title and "…".
- `SheetFooter.tsx`: the status slot, Properties, history and help.
- `sideChatAddress.ts`: the frame's small reading of the `side_chat*` link, so no chat code
  loads before the side chat opens (held to `@ai-matrx/chat`'s answers by
  `__tests__/side-chat-address.test.ts`).
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
| Side chat, canvas | frame | the loaders (`loadCompanion`, `loadCanvas`), the page key, the visit's link |
| Widths, breakpoints, motion | frame | nothing |

## The frame's heavy modules

- **Side chat** ("an agent who can help you anywhere"): `loadCompanion` is called only after
  the person first opens it, never on render, and rendered through `React.lazy` in Suspense.
  Once loaded it stays mounted (inert while closed). Resizable 340 to 768px (default 350) by
  dragging its left edge or with the arrow keys; dragging 80px past the minimum snaps it shut;
  the width is remembered per browser (cookie `matrx-frame:side-chat-width`). Closed by default; the
  person's open or closed choice is remembered per page (`pageKey`). A host reads the
  `side_chat` link with `@ai-matrx/chat`'s `readSideChatLink` and passes `companionLink`: the
  link wins until the person acts. The frame reads that link itself (`sideChatAddress.ts`, no
  chat import) and hands the new address to `onSideChatAddress`. ZERO WEIGHT: nothing of the
  side chat is on a page until it is opened, and it arrives as one chunk; a test fails if any
  frame or playground file imports `@ai-matrx/chat` statically. ONE door: the header's right
  group (`SIDE_CHAT_DOOR`), the canvas toggle beside it; on a phone it is a "…" item.
- **Canvas**: `loadCanvas`, the same lazy rule, then stays mounted (its state survives close
  and reopen). Its toggle is the last tool in the header's right group (Lucide `Shapes`). From
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

## Change log

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

- 2026-10-18: Medium form (the drawer sidebar; the companion and properties take turns; body min width). Rows and
  crumbs are real links. Phone header controls get the 44px touch ring. The drawer is inert
  behind, traps focus, closes on Esc and returns focus. The grid uses a roving tabindex.
  Tokens are renamed `--matrx-frame-*`, menus sit at 13px through `--text-sm`, hand literals
  are removed, and the light variant keeps its sheet.
- 2026-10-17: First build. The frame, the grid, the sidebar, the header and footer, the
  variants, the phone form and the playground.

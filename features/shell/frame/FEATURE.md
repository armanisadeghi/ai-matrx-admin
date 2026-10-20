# FEATURE.md — `shell/frame` (the new app frame)

**Status:** `scaffolded` (playground only; the live AppShell is untouched)
**Tier:** `2`
**Last updated:** `2026-10-20`

---

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
  regions dashed in the primary colour, page regions in green) and a "loaded" readout fed by
  the sample loaders, so the lazy rule is visible. The sample side chat and canvas
  (`SampleCompanion.tsx`, `SampleCanvas.tsx`) arrive by dynamic import. A Docs document shows
  the ask bar. `?side_chat=open|closed` opens the page with the side chat in that state.
- `AppFrame.tsx`: the frame. Holds the forms, the variants, the drawer and the companion.
- `AppGrid.tsx`: the 9-dot product grid. Tiles are grouped by family under an editable
  favorites group. A tile always opens its product in a new tab. The grid is one Tab stop,
  and arrow keys move between tiles.
- `FrameSidebar.tsx`: the product's own menu. Every row is a real link (`href`, defaulting to
  `<homeHref>/<id>`). A plain click calls `onSelectItem`; a modified click keeps the browser's
  link behaviour.
- `SheetHeader.tsx`: breadcrumbs (links), the star (only for items that can be favorited), the
  "…" menu (`defaultPageActions`) and the right-side slot. On phones the header shrinks to
  back or menu, the title and "…".
- `SheetFooter.tsx`: the status slot, the side chat's door ("Side chat"), Properties, history
  and help.
- `FrameModules.tsx`: the heavy-module machinery: `lazyModule` (one `React.lazy` per loader),
  `ModuleSlot` (Suspense with a row skeleton, and an honest failure), the labelled stand-ins,
  the side chat's resize handle and the ask bar.
- `products.ts`: THE product list (draft names; change them only there).
- `frame.css`: the frame's tokens and its few structural rules.

## Ours and the page's (owner, 2026-10-20)

A page hands the frame DATA; the frame owns every region's geometry and look. `AppFrameProps`
has no `className` or `style`, and a test fails if any exported frame props type gains one.
Every region carries `data-mf-owner="frame"|"page"` (and `data-mf-region`).

| Region | Owner | What the page supplies |
|---|---|---|
| Sidebar shell, drawer | frame | the product's menu items, the active item |
| App grid | frame | the product list and favorites |
| Header row (44px, no bottom rule), breadcrumb rendering, star slot, "…" button | frame | crumbs, whether the page can be favorited, the "…" items |
| Right tools group | frame | the tools (search, notifications…); the canvas toggle is the frame's own |
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
  the width is remembered per device (`matrx-frame:companion-width`). Closed by default; the
  person's open or closed choice is remembered per page (`pageKey`). A host reads the
  `side_chat` link with `@ai-matrx/chat`'s `readSideChatLink` and passes `companionLink`: the
  link wins until the person acts; `onCompanionOpenChange` lets the host rewrite the address
  with `sideChatAddress`. ONE door: `SIDE_CHAT_DOOR` in `AppFrame.tsx` (`footer` today, or
  `header`) moves it in one line; on a phone it is a "…" item.
- **Canvas**: `loadCanvas`, the same lazy rule, then stays mounted (its state survives close
  and reopen). Its toggle is the last tool in the header's right group (Lucide `Shapes`). From
  the desktop form it is a full-height column at the sheet's right, header band included, so
  it never fights for space; its title row is the frame's, with full screen (the whole sheet,
  the sidebar stays) and close. On medium and phone it covers the sheet.
- **Ask bar** (`askBar`, e.g. the notes page): a plain input with mic and send, nothing else.
  No chat module loads until the person sends; then the frame opens the side chat and passes the
  text as `companionSeed` (`dictate: true` from the mic). It sits in flow under the body, so it
  never covers the page's last line.

## Layout contract

- **Variants** (`record` | `list` | `workspace` | `light`) change only the body. The header
  (44px), tabs row (40px) and footer (32px) are identical in every variant. `light` keeps the
  sheet with a softer edge.
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
- **Motion:** panels slide on `--matrx-motion-duration-panel` / `--matrx-motion-ease-panel`.

## The colour proposal (frame-only until approved)

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

## Tests

`features/shell/frame/__tests__/app-frame.test.tsx` (`pnpm test features/shell/frame`) covers:
the one 44px header in every variant, the star only with `favorite`, "…" always, tabs only with
tabs, no footer on a phone, the drawer focus contract, the grid's single Tab stop and arrows, and
medium never showing properties and the side chat together, the lazy rule for the side chat,
the canvas and the ask bar, the per-page memory and the link, the forms and canvas widths,
ownership attributes, and no `className`/`style` on any exported props type.

## Change log

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

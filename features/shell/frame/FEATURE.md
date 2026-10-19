# FEATURE.md — `shell/frame` (the new app frame)

**Status:** `scaffolded` (playground only; the live AppShell is untouched)
**Tier:** `2`
**Last updated:** `2026-10-18`

---

## Purpose

The new app frame from the owner's model (2026-10-17): AI Matrx works like Google Workspace. Each
product has its own sidebar, and one app grid, header row, tabs row and footer hold the products
together. Linear is the visual reference. It is built beside the old shell and is host-agnostic
(props in; only `@ai-matrx/design-system`, `lucide-react` and `cn`), so moving it into
`@ai-matrx/shell` (`aidream/apps/shared/shell`) is a copy.

## Entry points

- **Playground:** `/lab/shell` (`app/(lab)/lab/shell/`). Static sample content for Chat, CRM and
  Docs, with a toolbar outside the frame for product, variant, theme and width
  (1440 / 1280 / 1024 / 375).
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
- `SheetFooter.tsx`: the status slot, the Agent companion toggle, history and help. It also
  holds `CompanionPlaceholder`, the labelled stand-in for the companion.
- `products.ts`: THE product list (draft names; change them only there).
- `frame.css`: the frame's tokens and its few structural rules.

## Layout contract

- **Variants** (`record` | `list` | `workspace` | `light`) change only the body. The header
  (44px), tabs row (40px) and footer (32px) are identical in every variant. `light` keeps the
  sheet with a softer edge.
- **Forms**, measured from the frame's own width:
  - `desktop` (1280px and wider): inline sidebar and inline companion.
  - `medium` (640 to 1279px): the sidebar is a drawer, and the companion and the properties
    panel take turns (opening the companion hides the panel).
  - `phone` (under 640px): a drawer, the compressed header, no footer and a 16px gutter.
  - The record column never drops below `--matrx-frame-body-min-w` (360px).
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
medium never showing properties and the companion together.

## Change log

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

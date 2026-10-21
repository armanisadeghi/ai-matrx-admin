---
name: window-panels
subject: platform/ui-shell
description: "WindowPanel (@ai-matrx/summon/window) and its window manager. Use when a window won't drag, resize, minimize or pop out, the tray or restore is wrong, rendering <WindowPanel> on a page, or editing features/window-panels/**. NOT for opening or registering overlays (use overlay-system)."
---

# Window Panels: `WindowPanel` from `@ai-matrx/summon/window`

<!-- rules:stamp -->
> Rules from `common-docs/systems/platform/ui-shell/FEATURE.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Delete means archive, everywhere.** A delete that does not archive is a defect.
2. **A menu regroup ships as a side-by-side demo page** with a what-goes-where list, never as a
   direct change.
3. **Every surface mounts the canonical menu.** Use `NonEditableContextMenu` or
   `EditableContextMenu` from `features/context-menu-v3/`. Never use a bespoke `DropdownMenu` or a
   raw `contextmenu` handler, and never keep both.
4. **A menu without a source is a defect.** A menu with no `contentSource`, `entity` or
   `surfaceName` opens with every verb dark. Fix these before unwired surfaces.
5. **Lists built on `EntityListPage` inherit the row menu** through `ItemContextMenu`. They need
   their own wiring only for surface-specific sections.
6. **A window or overlay mounts its own menu.** It never delegates to the page under it.
7. **Reuse the domain's action registry.** Never create a second one.
8. **Secret-bearing surfaces follow `VaultContextMenu`.** Pass `getApplicationScope`, force
   `selection: ""`, put names and field keys in the content (never values or notes), and pass no
   `entity`.
9. **Done means the menu opens clean.** The console shows no `INERT MENU` or
   `VALUE MAPPING GAP` scream.
10. **Chat is a universal agent host.** Never bind a page-agent roster to it.
11. **Anything with an id shows it through the one canonical id component** (display plus one-click copy).
12. **Flagship and first-run screens get a bespoke elevated stage**, not the 28px app-chrome controls.
13. **Before a link goes to Arman, every screen on its path passes the Steve Jobs bar** (walked and fixed by an Opus reviewer).
14. **Admin tables filter, search and sort on the server**, and people are picked by name or email, never by id.
15. **Wasted vertical space is the worst sin;** every status shown is backed by real state.
16. **A new output style or menu layout is a NEW function used only by the new path;** never thin a shared builder.
17. **A page fetches only what it shows, each thing once;** every removed fetch ships its on-engagement load.
18. **Floating things never move the page.** Pills, assists, badges, alarms, notices, toasts and the
   chat dock float over it; when one would cover something, it moves itself (lifts, rests above
   the bar, yields). No page pads, shrinks or re-centres for one. Only the empty scroll room after a
   page's last line may grow. Guard: `pnpm check:overlays-never-move-page` (matrx-frontend).
<!-- rules:stamp-end -->

`WindowPanel`, the window manager (`windowManager` slice), the tray, pop-out, the three phone presentations and window persistence are the **npm package `@ai-matrx/summon`** (source `../aidream/apps/shared/summon/src/window`, `src/core`, `src/persistence`; guides in the package `README.md` and `FEATURE.md`). This repo no longer contains that engine. What stays here: the **window components** (`features/window-panels/windows/**`), the **Tools grid**, **tray previews**, the **Detail primitive** host and the app's wiring. Deep reference for what stays: [`features/window-panels/FEATURE.md`](../../../features/window-panels/FEATURE.md).

**A package bug is fixed in the package, in the same session** (edit `../aidream/apps/shared/summon`, run its gates, publish, take `latest`). Never patch around it in a window component and never copy engine code back.

Opening, registering and closing an overlay is the [`overlay-system`](../overlay-system/SKILL.md) skill. This skill is what a window *is* once something renders it.

## Branches: read only the one your task reaches

- Drag, resize, traffic lights, snap, full screen, pop-out → [drag-resize-popout.md](drag-resize-popout.md)
- Tray, minimized cards, `windowManager` state, reveal, silent-render guard → [tray-and-window-manager.md](tray-and-window-manager.md)
- Save/restore, `window.preservation`, `onCollectData`, `ephemeral`, `?panels=` links → [persistence.md](persistence.md)
- Phone presentation (`window.mobile`) → [mobile-presentation.md](mobile-presentation.md)
- Creating or changing a window → `window-panel-authoring` skill; deleting one → `window-panel-authoring` skill (removing.md).

## Mental model

- **`WindowPanel` is a leaf component.** Rendered by a `*.render.tsx` (the overlay path) or dropped on a page with its own `onClose`. Either way, on mount it joins the window manager (z-order, minimize-all, tray, arrange, persistence, pop-out) because the manager lives in the app's single Redux store.
- **No registry renders windows.** `SummonHost` renders definitions; nothing iterates a list to mount a window. A window's static facts (id, mobile presentation, ephemeral, preservation, link, deprecated) are the `window` / `link` blocks on its definition in `features/overlays/definitions/<id>.overlay.ts(x)`. `windowRegistryMetadata.ts`, `windowRegistryTypes.ts`, `initUrlHydration.ts`, `WindowPersistenceManager`, `WindowTray` and `lazy-bundle-guard` are deleted.
- **The close binding is a type.** Exactly one of `overlayId` (close that overlay), `boundToOverlay` (close the enclosing `SummonHost` instance) or `onClose` (page-local). None compiles to an error; do not relax it. Window components in this repo extend `Omit<WindowPanelBaseProps, ...>` (exported from `@ai-matrx/summon/window`) and never `Omit<WindowPanelProps, ...>`.
- **Providers at the root, not per window.** `AppSummonProvider` mounts `SummonProvider`, `WindowsProvider` (selection surface `AppWindowSelectionSurface`, Escape yields to `[data-organization-gate], [data-overlay-escape-yield]`) and `WindowTraySync` from `@ai-matrx/summon/window-host`. A page-local `WindowPanel` therefore gets the same options as an overlay window. Do not mount another.

## The SLOTS contract: the heart of building a window

**The body is content only. Header, footer, sidebar and secondary panel are `WindowPanel` prop slots, never body JSX.** Reference consumers: [`windows/notes/NotesWindow.tsx`](../../../features/window-panels/windows/notes/NotesWindow.tsx), [`windows/FeedbackWindow.tsx`](../../../features/window-panels/windows/FeedbackWindow.tsx). Canonical body class: `bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"`.

| Slot | Props | Contract |
|---|---|---|
| Header | `title` / `titleNode` (wins), `actionsLeft`, `actionsRight` | Title is centered across the header; keep action clusters compact or they overlap it. Traffic lights and the sidebar toggle render automatically. `actions` is deprecated (= `actionsRight`). |
| Footer | `footer` or `footerLeft` / `footerCenter` / `footerRight`; `footerVariant` `"bar"` (default) / `"rich"` | `"bar"` applies compact metadata-bar styling that crushes a composer. Pass `footerVariant="rich"` for a multi-row input (`SmartAgentInput`); reference `windows/multi-file-smart-code-editor`. |
| Sidebar | `sidebar`, `sidebarDefaultSize`, `sidebarMinSize`, `defaultSidebarOpen`, `sidebarClassName` | Leave `sidebarExpandsWindow` `false`: it resizes the window on every toggle and fights drag/snap. |
| Secondary panel | `secondaryPanel`, `secondaryPanelOpen`, `secondaryPanelDefaultSize`, `secondaryPanelMinSize` | History / inspector pane that belongs to the window. Desktop only; handle phones yourself. |

## Composition-root pattern

A window component hoists shared state into one `use<Feature>` hook at its root (slots are siblings of the body, so state buried in the body cannot feed them), each unit takes an `id` and reads Redux, and the root maps units onto slots:

```tsx
"use client";
import { WindowPanel, type WindowPanelBaseProps } from "@ai-matrx/summon/window";

export function MyFeatureWindow({ id = "my-feature-window", onClose }: Props) {
  const state = useMyFeature();
  return (
    <WindowPanel id={id} overlayId="myFeatureWindow" title="My Feature" width={640} height={480}
      minWidth={380} minHeight={280} bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      actionsRight={<MyFeatureControls id={id} />} sidebar={<MyFeatureSidebar id={id} />}
      footer={<MyFeatureFooter state={state} />} onClose={onClose}>
      <MyFeatureBody id={id} />
    </WindowPanel>
  );
}
```

Units shared with plain pages drop INTO a slot as content and import no `WindowPanel`, so a route that renders them never pulls the window stack into its bundle.

## Bundle invariant

`@ai-matrx/summon/window` (the whole `WindowPanel` module) and every `windows/**/*Window.tsx` stay behind a lazy boundary: reached only from a `*.render.tsx` (loaded by its definition) or a `dynamic(..., { ssr: false })`. The app root and boot code import only the light entries: `@ai-matrx/summon`, `/react`, `/next`, `/window-host`, `/url`, `/persistence`. The old `[WINDOW-PANELS BUNDLE LEAK]` runtime guard is gone; the guards now are the ESLint `windowPanelsImportRestriction`, `scripts/check-bundle-size.ts` (+2 KB per route) and `app/__tests__/nothing-loads-until-engaged.test.tsx`. Read the [`code-splitting`](../code-splitting/SKILL.md) skill before importing a window-panel file. Never nest `ssr:false` boundaries down one render path.

## Common pitfalls

1. Hand-rolled chrome in the body. Use the slot.
2. State buried in the body that a footer or sidebar needs. Hoist it.
3. Static-importing a `*Window.tsx` or `@ai-matrx/summon/window` from a route, layout or provider. Bundle leak.
4. No close binding. Intentional compile error.
5. Mounting a second `WindowsProvider` or `WindowTraySync`. The root already has one.
6. A random `id` on `WindowPanel`. Geometry is keyed by it; use a stable string.
7. "Registry entry to render a window". Gone. Add a definition (overlay-system).
8. Fixing a package behavior inside the app. Fix `../aidream/apps/shared/summon`.

## Key files

| Path | Role |
|---|---|
| `@ai-matrx/summon/window` (package `src/window/WindowPanel.tsx`, `useWindowPanel.ts`) | The frame, body portal, presentations. |
| `features/overlays/host/AppSummonProvider.tsx`, `AppWindowSelectionSurface.tsx` | Root providers and the right-click selection surface. |
| `features/overlays/definitions/trayPreviews.ts`, `features/window-panels/registry/tray-previews.tsx` | App tray previews registered with `registerTrayPreview`. |
| `features/window-panels/windows/**` | The window components. |
| `features/window-panels/tools-grid/` | Tools grid tiles (`toolsGridTiles.ts`, `ToolsGrid.tsx`, `activateToolsGridTile.ts`). |
| `features/window-panels/detail/` | Detail primitive host (`DetailHost.tsx`, `shells/`, `canvas/`). |
| `features/window-panels/__tests__/everyWindowHasAnAddress.test.ts` + `registry/window-address-baseline.json` | The address census. |

## Checklist

- [ ] Body is content only; chrome is slots; `bodyClassName` is the canonical class.
- [ ] Shared state hoisted into a `use<Feature>` hook at the window root.
- [ ] Close binding declared; `sidebarExpandsWindow` left `false`.
- [ ] No static import of `@ai-matrx/summon/window` or a `*Window.tsx` outside a lazy boundary.
- [ ] `onCollectData`, if set, returns stable keys (the React Compiler memoizes it; no manual `useCallback`).
- [ ] `pnpm type-check` clean for `features/window-panels/**`.

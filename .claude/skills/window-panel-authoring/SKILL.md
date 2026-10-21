---
name: window-panel-authoring
subject: platform/ui-shell
description: "Recipe for creating or changing a floating window. Use when adding a window, deleting, killing or retiring a window or overlay ('kill this panel', 'remove the X window', consolidating X into Y and deleting X), editing a window component, declaring restore or ephemeral behavior, wiring a ?panels= link or the Tools grid, or a window fails to restore after reload. NOT for drag/resize/tray internals (use window-panels) or for opening an overlay (use overlay-system)."
---

# Window Panel Authoring

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

A window is an overlay whose render module returns a `WindowPanel`. The engine (`WindowPanel`, window manager, persistence, links) is the package `@ai-matrx/summon`; **a defect in that engine is fixed in `../aidream/apps/shared/summon` in the same session**, never worked around in the window. Slots, drag, tray and phone presentation: `window-panels` skill. Definition, render module, registry and opener rules: `overlay-system` skill (read it first, the file list below assumes it).

If the window is an agent-aware surface, invoke `surface-authoring` and its overlay-surface reference. A window resident never inherits ambient surface values; an outside helper may receive an approved snapshot under its documented integration contract.

## Files you touch

| File | When |
|---|---|
| `features/window-panels/windows/[<feature>/]MyFeatureWindow.tsx` | The window component. |
| `features/overlays/definitions/<id>.overlay.tsx` | Definition: `id`, `label`, `instance`, and the `window` block (`windowId`, `mobile`, `preservation`, `restoreDefaults`, `ephemeral`, `deprecated`), optional `link`. Holds the opener (`useOpenX`, `XController`). |
| `features/overlays/definitions/<id>.render.tsx` | Lazy chunk: narrows `data`, wires props by name (no spread). |
| `definitions/registry.ts` | The one hand line, `d.<id>Overlay,`; then `pnpm gen:overlays` (overlay-system "Add an overlay"). |
| `features/window-panels/tools-grid/toolsGridTiles.ts` | Optional Tools grid tile. |
| `definitions/<id>.link.ts` | Optional `?panels=` hydrator. |

## Steps

### 1. The window component

```tsx
"use client";
import { useState } from "react";
import { WindowPanel } from "@ai-matrx/summon/window";
import { MyFeatureBody } from "@/features/my-feature/components/MyFeatureBody";

interface MyFeatureWindowProps {
  onClose: () => void;
  initialSelectedId?: string | null;   // seeded from overlay data by the render module
}

export default function MyFeatureWindow({ onClose, initialSelectedId }: MyFeatureWindowProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const collectData = (): Record<string, unknown> => ({ selectedId });

  return (
    <WindowPanel
      title="My Feature"
      id="my-feature-window"          // stable, never random: geometry is keyed by it
      overlayId="myFeatureWindow"     // identical to the definition id; this is the close binding
      minWidth={380} minHeight={280} width={560} height={440} position="center"
      onClose={onClose}
      onCollectData={collectData}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      <MyFeatureBody selectedId={selectedId} onSelect={setSelectedId} />
    </WindowPanel>
  );
}
```

Rules:
- No `isOpen` prop and no `if (!isOpen) return null`: a closed overlay is never rendered, so the render module only mounts an open window.
- `id` is stable. `overlayId` equals the definition `id`. Close binding is exactly one of `overlayId`, `boundToOverlay`, `onClose` (type-enforced).
- `instance: "multi"` windows are keyed by the render module's `key={instanceId}`; pass the instance id into the component so each instance gets distinct state (`windowInstanceId` pattern in `NotesWindow`).
- `onCollectData` returns all keys the window preserves, read from live state; the React Compiler memoizes it, so no manual `useCallback`.
- Body is content only; chrome is slots (`window-panels` skill). **A window wraps the canonical component** (FEATURE.md law), never a hand-rolled copy.
- A window component that other code props-extends uses `Omit<WindowPanelBaseProps, ...>` from `@ai-matrx/summon/window`.

### 2. The definition and render module

Create `<id>.overlay.tsx` with a `window` block and `<id>.render.tsx` that renders `MyFeatureWindow` with `onClose={() => close()}` and `initialSelectedId` narrowed from `data`; add `d.myFeatureWindowOverlay,` to `registry.ts` and run `pnpm gen:overlays` (overlay-system). Do not import `MyFeatureWindow` from anywhere except its render module (and its own tests).

```ts
window: {
  windowId: "my-feature-window",
  mobile: "drawer",                                   // fullscreen | drawer | card | hidden
  preservation: { dataKeys: ["selectedId"] },         // opt in to refresh restore (default-deny)
  restoreDefaults: { selectedId: null },
  // ephemeral: true,                                 // never saves anything
},
```

### 3. (Optional) Tools grid tile

Tiles are declarative in `tools-grid/toolsGridTiles.ts`; `ToolsGrid.tsx` and `activateToolsGridTile.ts` read the definition via `appOverlayDefinition(overlayId)` (instance strategy comes from `instance`). Never add a tile in `features/window-panels/components/SidebarWindowToggle.tsx`.

```ts
{ id: "tile.my-feature", label: "My Feature", icon: MyFeatureIcon, category: "general",
  overlayId: "myFeatureWindow" /* seedData: (ctx) => ({ selectedId: null }) */ },
```

### 4. (Optional) `?panels=` address

Three edits, all required, or the link opens an empty frame: (a) `link: { key: "my_feature", hydrate }` on the definition (heavy hydrator in `myFeatureWindow.link.ts`, loaded lazily; the hydrator must call `open({ data })`), (b) `urlSyncKey="my_feature"` on the `WindowPanel` when it differs from the default, (c) `urlSyncId={subjectId}` on the `WindowPanel`. Two windows may not claim one key (the package throws on a duplicate link key). `features/window-panels/__tests__/everyWindowHasAnAddress.test.ts` refuses a window with a durable subject (`...Id`, `Slug`, `Token` data) and no address, unless listed in `registry/window-address-baseline.json` (which only shrinks).

## Persistence contract (default-deny)

A window survives a refresh only when its `window.preservation.dataKeys` lists what to keep and it is not `ephemeral`. Geometry (`rect`, `windowState`, `sidebarOpen`, `zIndex`) is captured by the package; the window supplies content via `onCollectData`, filtered to `dataKeys`, JSON only, at most `maxDataBytes` (32 KiB default). Saves are debounced 250 ms after any window-manager or state change and flushed on `pagehide`; close removes the window from the saved workspace. Storage is `users.user_surface_state` (details: `window-panels` persistence branch). Callback-group windows (`callbackGroupId` in data) are `ephemeral: true` and listed `addressless` with the reason.

## Ephemeral windows

`ephemeral: true` on the definition's `window` block for debug panels, one-shot dialogs and callback-group windows. It governs restore only, never reachability: an ephemeral window can and should still have a link.

## Updating a window

1. Change `restoreDefaults` and `preservation.dataKeys` together (a new key missing from `dataKeys` is silently dropped from storage).
2. Update `onCollectData` to return all current keys.
3. Props changed: update the render module's by-name wiring and the opener's `Open…Options` in the `.overlay` file. Then run `pnpm gen:overlays` if label, instance or window identity moved (`pnpm check:overlays` fails until you do).

## Sidebar layout

```tsx
<div className="flex flex-col min-h-0 h-full">
  <div className="px-2 py-1 border-b type-title shrink-0">Header</div>
  <div className="flex-1 min-h-0 p-1.5 space-y-1">{items.map((item) => <Item key={item.id} />)}</div>
</div>
```

`h-full min-h-0 flex flex-col` on the root; no `overflow-y-auto` on the root (WindowPanel handles it); no `shrink-0` on the root.

## Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| `overlayId` in the component differs from the definition id | Type error, or the window reads another overlay's metadata | Make them identical |
| Definition missing from `registry.ts` | Window never renders; `pnpm check:overlays` names it | Add `d.<id>Overlay,` to `APP_OVERLAYS` |
| Generated index stale | `pnpm check:overlays` fails | Run `pnpm gen:overlays` and commit the result |
| Definition file lacks `"use client"` | Production build fails collecting page data for a server page | Add it |
| No `window.preservation` | Window reopens empty after refresh; Save does nothing | Declare `dataKeys` |
| Multi-instance window without a per-instance id | Windows share state, or restore finds no instance | Use `key={instanceId}` and pass `instanceId` through |
| Random `id` on `WindowPanel` | Geometry lost on re-render | Stable string |
| `ephemeral: true` but the window needs restore | Window does not reopen | Remove `ephemeral`, declare `preservation` |
| Link edits skip `urlSyncId` | Every instance writes the same token | Pass the subject id |
| Fixing package behavior in the window | Diverges from every other host | Fix `../aidream/apps/shared/summon` |

## Resources

- Package guides: `../aidream/apps/shared/summon/README.md` (WindowPanel, links, persistence, handles) and `FEATURE.md` (invariants).
- App window facts and laws: `features/window-panels/FEATURE.md`. Definitions: `features/overlays/definitions/`. Host: `features/overlays/host/`.
- Openers, registry, mounting: `overlay-system` skill. Slots, drag, tray: `window-panels` skill. Removal: [`removing.md`](removing.md) in this skill.

## Removing a window panel

Deleting a panel means removing it from every place its registration spreads, then proving zero residue: no shims, aliases, forwarding openers or tombstone comments. The full no-trace recipe (keystone, ten-row checklist, repoint-before-delete greps, shared infrastructure not to delete, verification) is in [`removing.md`](removing.md). Read it in full before any deletion.

## Relocated

| Old skill and trigger | Now |
|---|---|
| `remove-window-panel`: deleting, killing or retiring a window/overlay | this skill, [`removing.md`](removing.md) |
| `remove-window-panel`: consolidating X into Y and deleting X | this skill, [`removing.md`](removing.md) |
| `remove-window-panel`: "kill this panel", "remove the X window" | this skill, [`removing.md`](removing.md) |
| `remove-window-panel`: NOT for adding or opening an overlay | `overlay-system` skill |

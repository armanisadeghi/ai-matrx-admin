# Window Panels — FEATURE.md

> **Status**: Active. Phases 0–5, 8, 9 of the modernization plan shipped (2026-04-23). Phases 6, 7, 10–13 deferred or in progress — see **Known gaps** at the bottom.
> **Canonical reference** for the window/overlay system. Supersedes the long-form content of `INVENTORY.md`.

---

## Mental model

A single **registry** declares every overlay in the app — floating windows, bottom sheets, modals, and inline agent widgets. A single **unified controller** iterates that registry and renders each open overlay through a generic **surface** component. A single **tools-grid config** declares which overlays show up in the shell sidebar. Every other subsystem (persistence, URL sync, mobile presentation, Redux slice init) reads the registry — no parallel lists.

Adding a new overlay is a **2-file change**: register it + write the component. No `OverlayController` edit, no slice seed, no Tools-grid edit.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Shell (server component)                                           │
│    Sidebar.tsx — dynamic()-imports SidebarWindowToggle              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ lazy
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SidebarWindowToggle → ToolsGrid                                    │
│    • reads toolsGridTiles.ts (declarative tiles)                    │
│    • each click → dispatch(openOverlay({...}))                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Redux: overlaySlice                                                │
│    overlays[overlayId][instanceId] = { isOpen, data, lastUsedAt }   │
│    actions: open / close / closeAll / toggle /                      │
│             closeAllInstancesOfOverlay / pruneStaleInstances        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  UnifiedOverlayController (behind NEXT_PUBLIC_OVERLAYS_V2 flag)     │
│    ALL_WINDOW_REGISTRY_ENTRIES.map(entry =>                         │
│      <OverlaySurface overlayId={entry.overlayId} />)                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OverlaySurface — per registry entry                                │
│    • subscribes to useOverlayOpen / useOverlayInstances             │
│    • React.lazy(entry.componentImport) — cached module ref          │
│    • merges entry.defaultData under live data                       │
│    • renders <Component isOpen onClose {...data} />                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Window component (mounts <WindowPanel>)                            │
│    • desktop → WindowPanel shell (drag/resize/tray)                 │
│    • mobile → routed by registry.mobilePresentation:                │
│         "fullscreen" → current fullscreen takeover                  │
│         "drawer"     → MobileDrawerSurface (vaul)                   │
│         "card"       → MobileCardSurface (bottom-right floating)    │
│         "hidden"     → do not mount                                 │
└─────────────────────────────────────────────────────────────────────┘
```

Parallel subsystems that read the registry:

- **WindowPersistenceManager** — hydrates `window_sessions` rows on mount; clamps rects to viewport; runs the idle GC sweep (`pruneStaleInstances` every 30 min).
- **UrlPanelManager** — reads `?panels=` query, dispatches hydrators; every `registry.urlSync.key` must have a hydrator in `initUrlHydration.ts` (dev assertion enforces).
- **WindowPanel** — looks up its own registry entry by `overlayId` to resolve `mobilePresentation`, `mobileSidebarAs`, and `urlSync.key`.

---

## The registry (single source of truth)

File: [`registry/windowRegistry.ts`](./registry/windowRegistry.ts)

### Shape

```ts
interface WindowRegistryEntry {
  // Identity
  slug: string;              // kebab-case, stored in window_sessions.window_type
  overlayId: string;         // camelCase, key in overlaySlice
  kind: OverlayKind;         // "window" | "widget" | "sheet" | "modal"

  // Rendering
  componentImport: () => Promise<{ default: ComponentType<any> }>;
  label: string;             // shown in tray + window manager
  defaultData: Record<string, unknown>;  // doc + restore fallback
  ephemeral?: boolean;       // skip DB persistence

  // Mobile
  mobilePresentation?: "fullscreen" | "drawer" | "card" | "hidden";
  mobileSidebarAs?: "drawer" | "inline";  // default "drawer"

  // Instancing
  instanceMode?: "singleton" | "multi";   // default "singleton"

  // Integrations
  urlSync?: { key: string };              // ?panels= deep link
  icon?: LucideIconName;                  // (reserved — grid uses toolsGridTiles)
  category?: ToolsCategory;               // (reserved — see above)
  heavySnapshot?: boolean;                // Phase 7 opt-in
  autosave?: boolean;                     // Phase 7 opt-in
  seedData?: (ctx) => Record<string, unknown>;  // rarely used on registry
}
```

### Invariants (checked by `assertRegistryIntegrity`)

1. Every entry has `kind` + `componentImport`.
2. Every `kind: "window"` has `mobilePresentation`.
3. `slug` and `overlayId` are each unique across the registry.
4. Every entry with `urlSync.key` has a hydrator registered in `initUrlHydration.ts` (separate dev check in that file).

### How to add a new overlay

**Step 1** — register it in [`registry/windowRegistry.ts`](./registry/windowRegistry.ts):

```ts
{
  slug: "my-feature-window",
  overlayId: "myFeatureWindow",
  kind: "window",
  label: "My Feature",
  componentImport: () =>
    import("@/features/window-panels/windows/MyFeatureWindow"),
  defaultData: { selectedId: null, search: "" },
  mobilePresentation: "drawer",   // or "fullscreen" / "card" / "hidden"
  // optional:
  // ephemeral: true,
  // instanceMode: "multi",
  // mobileSidebarAs: "drawer",
  // urlSync: { key: "my_feature" },
},
```

**Step 2** — create the component at the path `componentImport` points to:

```tsx
"use client";
import { useCallback, useState } from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedId?: string | null;
  search?: string;
}

export default function MyFeatureWindow({ isOpen, onClose, selectedId, search }: Props) {
  if (!isOpen) return null;
  const [sel, setSel] = useState<string | null>(selectedId ?? null);

  const collect = useCallback(
    () => ({ selectedId: sel, search: "" }),
    [sel],
  );

  return (
    <WindowPanel
      id="my-feature-window"
      title="My Feature"
      overlayId="myFeatureWindow"
      onClose={onClose}
      onCollectData={collect}
      minWidth={380}
      minHeight={280}
    >
      <div>…</div>
    </WindowPanel>
  );
}
```

**That's it.** Render, Tools-grid placement (via `toolsGridTiles.ts` if desired), persistence, URL sync, mobile routing — all automatic. Nothing else to touch.

---

## Slices

All three live under `lib/redux/slices/`:

| Slice | Responsibility |
|---|---|
| `overlaySlice` | Open/closed state + data payload + `lastUsedAt` per overlay/instance. `initialState.overlays` is `{}` — entries grow lazily on first `openOverlay`. |
| `windowManagerSlice` | Window geometry, z-index, tray slots, `arrangeActiveWindows` computations. |
| `urlSyncSlice` | `?panels=` entries the URL manager serializes. |

`overlaySlice` actions:
- `openOverlay({ overlayId, instanceId?, data? })` — stamps `lastUsedAt`.
- `closeOverlay({ overlayId, instanceId? })` — flips isOpen on singleton slots; deletes the entry entirely for multi-instance overlays.
- `closeAllOverlays()`, `toggleOverlay()`.
- `closeAllInstancesOfOverlay({ overlayId })` — nukes every instance of one overlay.
- `pruneStaleInstances({ olderThanMs })` — GC for closed multi-instance entries. Called from the idle sweep in `WindowPersistenceManager`.

---

## Persistence

Table: `window_sessions` (Supabase, RLS-enforced per user).

```
id (uuid) | user_id | window_type (slug) | label | panel_state (jsonb) | data (jsonb) | created_at | updated_at
```

**Save triggers — only two:**
1. **Explicit** — user clicks "Save window state" in the green traffic-light dropdown.
2. **Piggyback** — child component calls `onCollectData` as part of its own save flow.

Moving, resizing, toggling the sidebar, or switching tabs does **not** trigger a DB write. (Phase 7 will add opt-in `autosave` + `heavySnapshot` for specific windows.)

**On close**: `WindowPanel` calls `persistence.closeWindow(overlayId)` which deletes the row.

**On page load**: `WindowPersistenceManager`:
1. Runs a one-time `matrx_window_manager_state` localStorage migration (clamp each rect, dispatch `restoreWindowState`, remove the key).
2. Fetches all `window_sessions` rows for the user.
3. For each row: dispatches `openOverlay({ overlayId, data })` and builds a clamped `WindowEntry` for `windowManagerSlice` via `clampRectToCurrentViewport`.
4. Dispatches `restoreWindowState(entries)` so geometry is in Redux before `WindowPanel` mounts.

**Rect clamping** ([`utils/rectClamp.ts`](./utils/rectClamp.ts)) — restored rects are clamped into the current viewport with a 48 px minimum visible strip so the header stays draggable. Nonsensical rects fall back to a centered default.

**Instance GC** — every 30 minutes (idle-only via `requestIdleCallback`), `pruneStaleInstances({ olderThanMs: 30min })` sweeps closed multi-instance entries that haven't been reopened. Singleton slots are preserved regardless so stable-reference selectors don't thrash.

**Ephemeral overlays** — registry entries with `ephemeral: true` never write to DB. Use for debug panels, one-shot tool dialogs, and callback-group windows whose caller-side state can't survive reload.

---

## Mobile presentation

Every `kind: "window"` declares `mobilePresentation`:

| Value | Rendered as | When to use |
|---|---|---|
| `"fullscreen"` | Full-viewport takeover (legacy mobile branch of WindowPanel) | Content-dominant windows (Notes, AgentRun, CanvasViewer, News). Default. |
| `"drawer"` | Bottom-sheet ([`mobile/MobileDrawerSurface.tsx`](./mobile/MobileDrawerSurface.tsx), vaul, 85 dvh) | Forms, settings, sidebar-heavy windows. Sidebars collapse into a nested right-side drawer. |
| `"card"` | Small floating card ([`mobile/MobileCardSurface.tsx`](./mobile/MobileCardSurface.tsx), bottom-right, 60 dvh max) | Utility/debug windows (Stream Debug, State Analyzer, JSON Truncator). Non-modal. |
| `"hidden"` | Nothing; dev warning if opened | Windows that shouldn't exist on mobile. |

`mobileSidebarAs` — for windows with a sidebar:
- `"drawer"` (default) — sidebar opens in a nested drawer on mobile. Keeps the body full-width.
- `"inline"` — sidebar pushes the body on mobile. Useful for 50/50 split layouts.

Decision tree:
1. Has a sidebar? → `"drawer"`.
2. Is a content-dominant experience (chat, editor, feed)? → `"fullscreen"`.
3. Is a small utility / debug surface? → `"card"`.
4. True alert / system modal? → `"modal"` (registry `kind`).

---

## URL sync

Set `urlSync: { key: "..." }` on a registry entry. `WindowPanel` auto-activates `useUrlSync` when:

1. The entry has `overlayId` defined (caller passes it).
2. Either the caller passes `urlSyncKey`/`urlSyncId` props, or the registry has `urlSync.key`.

Instance id auto-falls-back to `overlayId` for singletons — URL reads like `?panels=notes:notesWindow`.

Every registry `urlSync.key` must have a hydrator in [`url-sync/initUrlHydration.ts`](./url-sync/initUrlHydration.ts). A dev-only assertion in that file logs missing mappings on mount.

---

## Tools grid

Declarative — lives in [`tools-grid/toolsGridTiles.ts`](./tools-grid/toolsGridTiles.ts). Each tile references a registry `overlayId` and provides:

```ts
interface ToolsGridTile {
  id: string;
  label: string;
  icon: LucideIcon;
  category: ToolsCategory;    // voice | notes | content | agents | files-web | general | admin
  gate?: "admin";
  overlayId?: string;         // registered overlay
  instanceStrategy?: "singleton-default" | "fresh-per-click";
  seedData?: (ctx: TileContext) => Record<string, unknown>;
  onActivate?: (ctx: TileContext) => void;   // escape hatch (e.g. Image Studio → router.push)
}
```

[`ToolsGrid.tsx`](./tools-grid/ToolsGrid.tsx) reads the config, groups by category, applies admin gate, and dispatches `openOverlay` with the correct instance strategy.

Multi-tile cases (e.g. two "Notes" tiles opening the same overlay with different seed data) are natively supported.

Bundle: the entire Tools grid + all 53 Lucide icons ship only after the user first clicks the sidebar toggle — `SidebarWindowToggle` is wrapped in `dynamic(..., { ssr: false })` at the shell mount.

---

## Bundle invariant

**Non-negotiable**: no window component or its heavy dependencies may ship in the initial bundle.

Enforced by:
1. Every registry entry's `componentImport` is a lazy `() => import(...)` — Next.js chunks it on demand.
2. `UnifiedOverlayController`, `OverlaySurface`, and `useOverlay` have zero static imports of any window component.
3. `SidebarWindowToggle` (1,402-line tools grid) is `dynamic(..., { ssr: false })` at the shell mount site.
4. `scripts/check-bundle-size.ts` gates per-route bundle growth at +2 KB per PR.

---

## File inventory

### Core (top-level)

| File | Role |
|---|---|
| `WindowPanel.tsx` | Shell (drag, resize, maximize, minimize, mobile routing, persistence, URL sync). Decomposition into modules is Phase 6. |
| `OverlaySurface.tsx` | Generic renderer for one registry entry — singleton + multi-instance. |
| `UnifiedOverlayController.tsx` | Iterates `ALL_WINDOW_REGISTRY_ENTRIES`; one source of truth for mounted overlays. |
| `WindowPersistenceManager.tsx` | Hydrates `window_sessions`; LS migration; idle GC sweep. |
| `WindowTray.tsx` / `WindowTraySync.tsx` | Minimized-window dock chips; responsive chip width via `constants/tray.ts`. |

### Subdirs

| Path | Role |
|---|---|
| `registry/windowRegistry.ts` | Single source of truth for all overlays + types. |
| `service/windowPersistenceService.ts` | Supabase CRUD for `window_sessions`. |
| `hooks/useOverlay.ts` | Factory hooks (`useOverlayOpen`, `useOverlayData`, `useOverlayInstances`, `useOverlayActions`, `useCloseOverlay`). |
| `hooks/useWindowPanel.ts` | Pointer-driven move/resize; Redux window registration. |
| `mobile/MobileDrawerSurface.tsx` | Vaul-based bottom sheet for `mobilePresentation: "drawer"`. |
| `mobile/MobileCardSurface.tsx` | Floating card for `mobilePresentation: "card"`. |
| `tools-grid/toolsGridTiles.ts` | Declarative config for every Tools-grid tile. |
| `tools-grid/ToolsGrid.tsx` | Data-driven Tools-grid renderer. |
| `tools-grid/menuPrimitives.tsx` | `MenuSection` / `MenuDivider` / `MenuItem` / `MenuGridItem`. |
| `url-sync/initUrlHydration.ts` | `registerPanelHydrator` calls + dev-time integrity check. |
| `url-sync/UrlPanelRegistry.ts` | Hydrator map. |
| `url-sync/UrlPanelManager.tsx` | Reads/writes `?panels=`. |
| `url-sync/useUrlSync.ts` | Registers/unregisters open panel in `urlSyncSlice`. |
| `constants/tray.ts` | Tray dimensions + responsive helpers. |
| `utils/rectClamp.ts` | Viewport-safe geometry clamping. |
| `utils/windowArrangements.ts` | `arrangeActiveWindows` tile math. |
| `utils/embed-site-url.ts` | URL normalization for iframe windows. |
| `components/SidebarWindowToggle.tsx` | Shell sidebar toggle (600 LOC post-Phase 3). |
| `components/LayoutIcon.tsx` | Layout arrangement icon buttons. |
| `windows/**` | 60+ window components — every one referenced by a registry `componentImport`. |

### Deleted (Phase 9)

- `FloatingPanel.tsx`, `utils/withGlobalState.tsx`, `hooks/usePanelPersistence.ts`, `TODO-persistence-spec.md`.

### Baselines

- `_baselines/bundle-before.md` — pre-modernization bundle/LOC snapshot. Deleted at the end of Phase 12.

---

## Rollout state

| Phase | Status |
|---|---|
| 0 — Baselines + bundle-size gate | ✅ shipped |
| 1 — Registry schema expansion (59 entries) | ✅ shipped |
| 2 — UnifiedOverlayController + absorbed non-window overlays (33 new entries) | ✅ shipped (behind `NEXT_PUBLIC_OVERLAYS_V2=1` flag; legacy deletion pending user smoke test) |
| 3 — Auto-derived Tools grid + lazy SidebarWindowToggle | ✅ shipped |
| 4 — State cleanup: drift-free initial state, instance GC, LS sidecar retired | ✅ shipped |
| 5 — Mobile presentation layer (drawer/card surfaces, rect clamp) | ✅ shipped |
| 6 — WindowPanel decomposition | ⏸ deferred |
| 7 — Persistence hardening (typed defaultData, autosave, heavy snapshot) | ⏸ deferred |
| 8 — URL-sync completion + build-time pair check | ✅ shipped |
| 9 — Dead code removal | ✅ shipped |
| 10 — Tests (registry integrity, pointer math, persistence, mobile routing) | ⏸ deferred |
| 11 — Docs refresh (this file) | ✅ in progress |
| 12 — `SKILL.md` + guardrails (ESLint) | 🔜 next |
| 13 — Polish (undo/redo, theme tokens) | ⏸ deferred |

---

## Known gaps / future work

1. **Phase 6 — WindowPanel decomposition.** The 1,500-line shell wants to be split into `ResizeFrame` / `WindowHeader` / `TrafficLights` / `Chrome` / `SaveDropdown` / `PersistenceBinding`. Pure internal refactor; public prop surface stays identical.
2. **Phase 7 — Persistence hardening.**
   - Typed link between `defaultData` and `onCollectData` (registry generic parameter).
   - Autosave-on-blur opt-in per entry.
   - `heavySnapshot` callback for Scraper / PDF Extractor / Markdown tester / Voice pad transcripts.
   - `onReopenAfterReload` for callback-group windows (Content Editor, Smart Code Editor, Image Uploader).
3. **Phase 10 — Tests.** Needs a test harness pass first (`vitest` already present). Priorities:
   - Registry integrity (every kind: "window" has mobilePresentation; every urlSync.key has a hydrator).
   - `clampRectToViewport` edge cases.
   - `overlaySlice` instance GC round-trips.
   - Mobile routing decisions (drawer vs card vs fullscreen).
4. **Legacy `OverlayController.tsx` (2,586 lines) deletion.** Gated on user smoke test with `NEXT_PUBLIC_OVERLAYS_V2=1`.
5. **`windowManagerSlice` split** (geometry / state / tray / zIndex). Deferred to Phase 13 unless profiling flags tray-op cost.
6. **Responsive tray slot math.** `WindowTray.tsx` pulls desktop chip width from the centralized constants, but `windowManagerSlice`'s slot placement math still uses desktop dimensions. Safe mid-session reshuffle is a Phase 13 item.
7. **Redux DevTools namespace.** Slices are flat (`overlays/*`, `windowManager/*`). Migrating to `windowPanels/overlays/*` would be cosmetic but breaks downstream action-type string matches.

---

## Change log

- **2026-04-23** — Phases 0–5, 8, 9 shipped. This `FEATURE.md` created; the long-form content previously in `INVENTORY.md` is absorbed above. `usePanelPersistence.ts` / `FloatingPanel.tsx` / `withGlobalState.tsx` / `TODO-persistence-spec.md` deleted. `UnifiedOverlayController` + `OverlaySurface` introduced behind `NEXT_PUBLIC_OVERLAYS_V2` flag. 6 missing URL-sync hydrators filled; dev-time integrity check added. Mobile drawer + card surfaces introduced; `WindowPanel` routes by `registry.mobilePresentation`.
- **2026-04-11** — `INVENTORY.md` last reviewed.

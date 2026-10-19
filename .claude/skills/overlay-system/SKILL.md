---
name: overlay-system
subject: platform/ui-shell
description: "Overlay system on @ai-matrx/summon: dialogs, sheets and windows declared once in features/overlays/definitions, opened by dispatch. Use when opening, adding, debugging an overlay, or touching features/overlays/**, SummonHost, defineOverlay, useOpenX. NOT for WindowPanel chrome (use window-panels)."
---

# Overlay System (on `@ai-matrx/summon`)

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
<!-- rules:stamp-end -->

The engine is the npm package `@ai-matrx/summon` (source: `../aidream/apps/shared/summon`, guides: its `README.md` and `FEATURE.md`). This repo owns only the **app's overlays** (`features/overlays/definitions/`) and the **host wiring** (`features/overlays/host/`). Deep reference: [`features/overlays/FEATURE.md`](../../../features/overlays/FEATURE.md).

## Package bugs are fixed in the package

A defect in opening, closing, links, persistence, handles, WindowPanel, tray or pop-out is fixed in `../aidream/apps/shared/summon` in the same session (its gates: `pnpm typecheck`, `npx vitest run`, `pnpm check:package`), published, then picked up here (`"@ai-matrx/summon": "latest"`). Never copy engine code back into this repo, never wrap a package bug in an app-side workaround. The app has no `OverlayController`, `catalogue.ts`, `overlaySlice`, `windowManagerSlice`, `urlSyncSlice`, `lazyOverlay` or `openers/` any more; a doc, memory or comment that names one is stale.

## The model

- **One declaration per overlay**: `features/overlays/definitions/<id>.overlay.ts(x)` calls `defineOverlay<Data>()({ id, label, instance, keepAlive, closesOnNavigation, window, link, render })`. It is a light module (safe to import anywhere); the old opener code (`useOpenX`, `XController`, option types) lives in the same file and keeps its old export names.
- **One lazy chunk per overlay**: `<id>.render.tsx` is the `render: () => import("./<id>.render")` target. A closed overlay is nothing: no node in the tree, no chunk fetched.
- **`definitions/registry.ts`** lists every definition in `APP_OVERLAYS`. `features/overlays/host/OverlayWorldHost.tsx` renders `<SummonHost definitions={APP_OVERLAYS} />`; each definition has its own subscriber, so opening A never re-renders B.
- **State** is the package's four slices (`overlays`, `windowManager`, `urlSync`, `overlayState`), mounted by `...summonReducers` in `lib/redux/rootReducer.ts` and `createSummonMiddleware` in `lib/redux/store.ts`. There is no `overlayData` slice.
- `WindowPanel` is a component from `@ai-matrx/summon/window`; the overlay layer and the window frame stay separate systems (window-panels skill).

## Hard rules

1. **No JSX prop spread in a `*.render.tsx`.** Wire every prop by name from the narrowed `data` (ESLint `no-restricted-syntax` on `JSXSpreadAttribute`). `data` arrives untrusted (`Readonly<Record<string, unknown>> | null`): narrow it in the render module or give the definition a `parse(raw)`.
2. **No functions in open data.** Callbacks travel as handles (`@ai-matrx/summon/handles`): the opener creates a channel/group owned by the instance and puts only its id (`callbackGroupId`) in the data. Closing the instance disposes everything it owns.
3. **No `kind: "window" | "modal" | "sheet"` discriminator.** A window is an overlay whose definition has a `window` block and whose render module returns a `WindowPanel`; everything else is a plain component.
4. **Open with the definition's hook, never raw `dispatch(openOverlay(...))`** in new code: `useOpenX()` (kept legacy name), `def.useSummon()`, or `<XController />` / `<def.Controller />` for mount-opens/unmount-closes.
5. **Every definition file starts with `"use client"`.** `lookupOverlay` (a server component path) reads `definitions/overlay-meta-index.ts` instead of the registry for exactly this reason; importing a definition from a server component breaks the production build.
6. **Never statically import a window component** (`features/window-panels/windows/**`) outside a `*.render.tsx`; ESLint `windowPanelsImportRestriction` points here. `features/overlays/**` is exempt.
7. **No blocking layers, AI stays reachable** (`/policies/no-dead-ends.md` in common-docs). The design-system `Dialog` is non-blocking on desktop; never pass `modal` to make a workbench block. `pnpm check:blocking-dialogs` fails a forced `modal`.

## Add an overlay

A new overlay is **two new files plus one line in `registry.ts`**, then `pnpm gen:overlays`. Everything else is generated; a missing step fails a typecheck or `pnpm check:overlays`.

1. `features/overlays/definitions/<id>.overlay.ts` (`.tsx` if it has JSX) starting with `"use client"`:

```ts
"use client";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

export interface OpenMyThingOptions { initialId?: string | null }

export const myThingOverlay = defineOverlay<OpenMyThingOptions>()({
  id: "myThing",
  label: "My thing",
  instance: "single",            // or "multi"
  render: () => import("./myThing.render"),
  // window: { windowId: "my-thing", mobile: "drawer", ephemeral: true },   // window overlays
  // link:   { key: "my_thing", hydrate: (ctx) => import("./myThing.link").then((m) => m.hydrate(ctx)) },
});
export const useOpenMyThing = myThingOverlay.useSummon;   // keep the old hook name callers use

declare module "@ai-matrx/summon" {
  interface OverlayRegistry { myThing: OverlayWire<OpenMyThingOptions> }
}
```

2. `features/overlays/definitions/<id>.render.tsx`: default export named `OverlayRender` (a named function keeps rules-of-hooks working), typed JSX, no spread:

```tsx
"use client";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import MyThingWindow from "@/features/window-panels/windows/my-thing/MyThingWindow";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  const initialId = typeof data?.initialId === "string" ? data.initialId : null;
  return <MyThingWindow key={instanceId} initialId={initialId} onClose={() => close()} />;
}
```

3. `definitions/registry.ts`: one line, `d.myThingOverlay,`, at the end of `APP_OVERLAYS` (the host renders in list order).
4. Run `pnpm gen:overlays`. It regenerates `overlay-definitions.gen.ts` (the imports `registry.ts` reads as `d`) and `overlay-meta-index.ts` (plain id, label, instance and window identity for server components); `OVERLAY_ID_INDEX` in `overlay-ids.ts` derives from the meta index. Never hand-edit those files. `pnpm check:overlays` (also a release gate and part of the jest suite) fails when they are stale or a definition file is missing from `registry.ts`.

Then: `pnpm type-check` (a mistyped id is a compile error because `OverlayRegistry` is augmented), `npx jest features/overlays/definitions`, `pnpm check:surface-overlays`. A window overlay also needs the window-panel-authoring steps.

## Open an overlay

```tsx
import { useOpenAgentRunWindow } from "@/features/overlays/definitions/agentRunWindow.overlay";
const openRun = useOpenAgentRunWindow();          // returns a handle: close() (and update/instanceId where the opener has them)
<button onClick={() => openRun({ initialAgentId })}>Run</button>

// declarative: opens on mount, closes on unmount
<AgentRunWindowController initialAgentId={agentId} />
```

The package form is `def.useSummon()` → `open({ data, handlers })` returning `{ overlayId, instanceId, close() }`, plus `def.useIsOpen()`, `def.useClose()`, and `def.useEmit()` inside the render tree.

### Callbacks

New overlays declare an event map and pass `handlers` (README "Callbacks without functions in Redux"). The existing callback-aware openers (`imageUploaderWindow`, `smartCodeEditorWindow`, `multiFileSmartCodeEditorWindow`, `curatedIconPickerWindow`, `contentEditor*`, `findReplace`, `fullScreenEditor`, `storageSourcePicker`, `saveToTable`, `googleConnectWindow` …) create a `callbackManager` group from `@ai-matrx/summon/handles` and pass `callbackGroupId`; their contracts are in `features/overlays/definitions/callbacks/` and beside the window (`windows/<feature>/callbacks.ts`). Copy one of those for an overlay whose callers already use that contract.

### Links (`?panels=`)

Set `link: { key, hydrate }` on the definition (heavy hydrators go in `<id>.link.ts`, loaded lazily). `OverlayLinkManager` (mounted in `host/OverlayServices.tsx`) keeps the address bar and open overlays in sync; the one door for notifications and the extension bridge is `openFromLink` / `openPanelRequest`. A window gets its token written from `WindowPanel`'s `urlSyncKey` / `urlSyncId` (window-panel-authoring).

## Where it is mounted

- `app/Providers.tsx` and `features/applets-host/AppletProviders.tsx` wrap the tree in `AppSummonProvider` (`features/overlays/host/AppSummonProvider.tsx`): `SummonProvider` over the app store with the app ports (`host/ports.ts`: identity, notify, errors, debug, persistence), `WindowsProvider` + `WindowTraySync` from `@ai-matrx/summon/window-host`.
- `app/DeferredSingletonCore.tsx` mounts `OverlayServices` (link manager + `OverlayPersistence`, plus the dev-only `window.__overlaysTest` hook).
- `app/DeferredSingletonWrapper.tsx` loads `app/DeferredOverlayWorld.tsx` → `OverlayWorldHost` (`SummonHost`) on the **first open only** (`overlayWorldWanted`); nothing loads at idle. `app/__tests__/nothing-loads-until-engaged.test.tsx` guards this.
- Close-on-navigation is the definition's `closesOnNavigation: true`; `SummonHost` performs it.

## Debug an overlay that does not appear

1. Is the id registered? `isRegisteredOverlay(id)`; check `registry.ts`.
2. Is the render chunk failing? The package shows its error card (retry; admins get "Copy for AI" from `host/OverlayErrorCopyForAi.tsx`). A chunk that never loads becomes a `ChunkLoadError` after 12 s.
3. Did it open and never render? The package render watchdog announces an overlay that opened with nothing mounted (console error + toast).
4. Did the render module refuse? `parse` returning `null` closes the overlay with a warning.
5. Runtime sweep gate: `window.__overlaysTest` (`ids/open/close/isOpen`) exists in dev or a build made with `NEXT_PUBLIC_OVERLAYS_SWEEP=1`; `pnpm check:overlays-sweep --url <origin> [--min n] [--only id1,id2] [--data scripts/overlays/sweep-data.json]` opens every registered overlay and counts it rendered only with a visible box on screen (features/overlays/FEATURE.md, Testing).

## Message actions (chat)

The chat message action bar is a **consumer** of this system, not a parallel one. The old `features/cx-conversation/` bar, `messageActionRegistry` and `messageActionsSlice` no longer exist in this repo; the chat-turn dialogs its actions ask for are hosted by `features/rich-document/hosts/ChatMessageDialogs.tsx`, and the action toolkit for any markdown surface is the `rich-document-actions` skill. Rule that survives: an action that opens UI opens it through a definition's opener; inline per-route modals with local `isOpen` flags are the anti-pattern this replaced, and overlay open/close state never lives in a message-actions slice.

## Files

```
features/overlays/
├── FEATURE.md
├── definitions/        <id>.overlay.ts(x), <id>.render.tsx, <id>.link.ts, callbacks/, registry.ts,
│                       register.ts, overlay-definitions.gen.ts + overlay-meta-index.ts (generated), overlay-ids.ts, overlay-types.ts,
│                       overlay-host-types.ts, trayPreviews.ts, link-helpers.ts, controller-helpers.ts
├── host/               AppSummonProvider, OverlayServices, OverlayWorldHost, ports, error report
└── components/         shared overlay bodies
```

Related: `lib/redux/rootReducer.ts`, `lib/redux/store.ts`, `features/admin/utils/lookupOverlay.ts`, `scripts/overlays/sweep.ts`.

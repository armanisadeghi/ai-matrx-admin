# Overlays: FEATURE.md

> Rules for the app's overlay layer. The engine is the npm package **`@ai-matrx/summon`** (source `../aidream/apps/shared/summon`; `README.md` to use it, `FEATURE.md` for its invariants). A package defect is fixed in the package, in the same session.
> Skill: [`.claude/skills/overlay-system/SKILL.md`](../../.claude/skills/overlay-system/SKILL.md). The window frame: [`features/window-panels/FEATURE.md`](../window-panels/FEATURE.md).

## What this system is

Any component (dialog, sheet, modal, toast, floating window, inline agent widget) is **summoned**: opened by dispatch, never in the React tree and never fetched until opened. Each overlay is declared once; the host renders the declared list. The app owns declarations and wiring; the package owns state, lifecycle, links, persistence and the window frame.

## Layout

```
features/overlays/
├── definitions/
│   ├── <id>.overlay.ts(x)    the openers callers import (useOpenX, XController, option types) — never a definition
│   ├── <id>.definition.ts(x) its one defineOverlay (@ai-matrx/summon/define); read only by overlay-definitions.gen.ts
│   ├── <id>.render.tsx       the lazy chunk (typed JSX wiring from `data`, no spread)
│   ├── <id>.link.ts          lazy ?panels= hydrator (57 overlays)
│   ├── registry.ts           APP_OVERLAYS (one hand line per overlay)
│   ├── overlay-definitions.gen.ts  generated imports registry.ts reads
│   ├── register.ts           ensureAppOverlaysRegistered, appOverlayDefinition(id)
│   ├── overlay-ids.ts        OVERLAY_ID_INDEX (derived from the meta index)
│   ├── overlay-meta-index.ts OVERLAY_META_INDEX (generated; plain data for server components)
│   ├── overlay-types.ts      OverlayWire / UntypedOverlayWire
│   ├── overlay-host-types.ts OverlayHostTypes { dispatch: AppDispatch }
│   ├── trayPreviews.ts       registerTrayPreview calls
│   ├── callbacks/            callback contracts (callbackManager groups)
│   ├── link-helpers.ts, controller-helpers.ts, audioDevices.tsx (opener only), __tests__/
├── host/                     AppSummonProvider, AppWindowSelectionSurface, OverlayServices,
│                             OverlayWorldHost, ports, overlayDiagnostics, overlayErrorReport,
│                             OverlayErrorCopyForAi
└── components/               shared overlay bodies (FindReplaceOverlay, ReferencePickerOverlay, …)
```

## How it is wired

| Piece | Where | What it does |
|---|---|---|
| Gate | `lib/redux/store.ts` (`createBootGate` from `@ai-matrx/summon/boot`, `ports: createStoreOverlayPorts()`) | No summon slice or middleware at first load. `summonGate.middleware` queues overlay/window actions; the first one loads the core, `attachReducer` injects its four slices (`overlays`, `windowManager`, `urlSync`, `overlayState`) into the one app store (`rootReducer.inject`), then the queue flushes. |
| Root | `features/overlays/host/AppSummonProvider.tsx` (`SummonRoot` from `@ai-matrx/summon/boot-root`), mounted in `app/Providers.tsx` | Hands the app store and ports to summon's context, with a `renderWrapper` that puts every rendered overlay inside the chat surface layer boundary, the error card's admin "Copy for AI" extra (lazy), and the window options. `runtime` lazily loads `host/AppSummonRuntime.tsx` (Next router port + `WindowTraySync`) only once the core has loaded. |
| Ports | `host/ports.ts` | `identity` (`auth:<id>` / `guest:<fingerprint>`, ready from auth), `notify` (`@/lib/toast`), `errors` (`captureError`, named `overlays:<source>`), `debug` (admin debug mode), `persistence` (`createDataPersistence` from `@ai-matrx/summon/persistence/data`, imported on first use; organization = active org), `router` (`appRouterPort`). |
| Services | `host/OverlayServices.tsx` (in `app/DeferredSingletonCore.tsx`) | `OverlayLinkManager` (`./url`) and `OverlayPersistence` (`./persistence`), running before anything opens; dev-only `window.__overlaysTest`. |
| World | `app/DeferredSingletonWrapper.tsx` → `app/DeferredOverlayWorld.tsx` → `host/OverlayWorldHost.tsx` | `<SummonHost definitions={APP_OVERLAYS} renders={RENDER_MAP} />` (`./react`), loaded on the first open only (`selectAnyOverlayTouched` from `./boot-kit`). |
| Light kit | `@ai-matrx/summon/boot-kit` | What first-load code may import: `formatLinkToken` (links), `lazyOpener`, and the light handle entries (`registerHandleEntry`, `unregisterHandleEntry`, `removeHandleGroup`, `peekHandle`). `./boot` adds the action creators (`openOverlay`, `closeOverlay`, `toggleOverlay`) and `isOverlayOpen`. |

## Rules

1. **A closed overlay is nothing.** Not in the tree, no chunk fetched. Never render an overlay outside `SummonHost`; a component needed without a trigger goes in `app/Providers.tsx` or the layout, not here.
2. **No JSX prop spread in a render module.** Wire props by name from narrowed `data` (or a definition `parse`). ESLint enforces it on `definitions/*.render.tsx`.
3. **No functions in open data.** Handlers go through handles (`@ai-matrx/summon/handles`); only a channel/group id rides in the data. The owner (`overlayId:instanceId`) disposes them on close.
4. **No `kind` discriminator.** A window overlay differs only by its `window` block and a `WindowPanel` in its render output.
5. **Open through the definition** (`useOpenX`, `def.useSummon()`, `Controller`). Raw `openOverlay`/`closeOverlay` dispatch is for host code under `features/overlays/` and the extension bridge.
6. **Every definition file starts with `"use client"`**; server components read `overlay-meta-index.ts`, never the registry.
7. **Openers and definitions never share a module.** The bundler's unit is the module, and it keeps every export anything uses: the registry (lazy runtime) uses every definition, so a definition beside its openers rode into first load wherever a menu imported an opener (54 on /pricing, 2026-10-17). `check:overlays` fails when an `.overlay` file declares a definition; `check:import-fanout` fails when anything but the generated list imports a `.definition` file.
8. **Chat's window openers are lazy.** `ChatHostAdapter` registers `createLazyChatWindowOpeners(store)` (`chat-window-opener-specs.ts`: ids + instance-id rules only); the openers themselves are ONE chunk, `chat-window-openers.ts`, imported by the first chat-triggered open. Each opener module exports a plain `create…Opener(store)` its hook wraps; a new chat opener adds a spec row and a chunk row (the spec type demands an `instanceId` rule for instance openers; per-subject ids live in `definitions/opener-instance-ids.ts`). Callbacks that register on open use summon's light handle entries on `./boot-kit` (`registerHandleEntry`, `removeHandleGroup`, `peekHandle`); only the emit loads `@ai-matrx/summon/handles`. First-load code imports summon only from `./boot`, `./boot-kit` and `./boot-root`.
9. **Declare once**: `registry.ts` is the only hand list. `overlay-definitions.gen.ts` and `overlay-meta-index.ts` are generated by `pnpm gen:overlays`; `pnpm check:overlays` (`definitions/__tests__/overlayIndexIsGenerated.test.ts`, a release gate) fails when they are stale or a definition file is unlisted.
10. **Window components are imported only by their render module.** `features/overlays/**` is exempt from the window-import ban.
11. **Dialogs never block the AI.** Desktop `Dialog` is non-blocking by default; a workbench never passes `modal`. `pnpm check:blocking-dialogs`.
12. **Notices open in a new place only**; they never route the current tab (`openFromNotice`, `check:notice-new-tab`).

## Adding one

Two files plus one line in `registry.ts` (`d.<id>Overlay,`), then `pnpm gen:overlays`. Steps and templates: the `overlay-system` skill. Type-check proves ids (a mistyped id is a compile error through the augmented `OverlayRegistry`); jest guards prove the index.

## Restore on reload

Reloading the same tab restores its windows (data + dragged rect); a new tab starts empty; windows never follow a person to another device (Arman, 2026-10-21). A window is remembered by default (summon `core/preservation.ts`: every JSON open-data key except `callbackGroupId`). `window.ephemeral: true` / `preservation: false` is only for one-shots, each listed with a reason in `definitions/__tests__/ephemeralWindowsCensus.test.ts`.

## Instances and keep-alive

`instance: "single"` (instance id `default`) or `"multi"` (fresh id per open, or pass `instanceId`). `keepAlive`: `"none"` (default, unmount on close), `"hidden"` (stay mounted hidden, at most 8 closed ones, oldest evicted), `"restore"` (unmount; `useOverlayState` values return on reopen and persist when persistence is on). Minimizing a window always keeps its body mounted. `closesOnNavigation: true` closes an overlay that shows a piece of the page that opened it.

## Callbacks

New overlays declare an event map on `defineOverlay` and pass `handlers` when opening; the render tree emits with `def.useEmit()`. The older callback-aware openers use a `callbackManager` group (`@ai-matrx/summon/handles`) and pass `callbackGroupId`; contracts live in `definitions/callbacks/` and `windows/<feature>/callbacks.ts`. **The severed-callback bug class:** a handler that never reaches the component because the render module forgot to pass `callbackGroupId` through. Wire it by name; emitting after the instance closed is a silent no-op by design.

## Links, persistence, errors

- **Links** (`?panels=`): `link: { key, hydrate }` on the definition; the one door is `openFromLink` / `openPanelRequest` (notifications use `openPanelsInPlace`, the extension bridge uses a zod envelope then `openPanelRequest`). Link data wins over restore data, restored geometry wins over link geometry.
- **Persistence**: default-deny, declared per window (`window-panels` persistence branch). Rows are `users.user_surface_state`.
- **Failures are never silent**: a render module that does not load in 12 s becomes a `ChunkLoadError` with Try again; a render error shows the package's error card (admins: "Copy for AI" built by `host/overlayErrorReport.ts` and `host/overlayDiagnostics.ts`); an overlay that opened and never rendered is announced by the package watchdog.

## Testing

`definitions/__tests__/` (generated-index guard, link kit, ported link tests, per-overlay tests) and `app/__tests__/nothing-loads-until-engaged.test.tsx`. Package fakes: `@ai-matrx/summon/testing` (`createTestPorts`, `createTestSummonStore`, `createMemoryPersistence`). 

**The sweep gate** (`scripts/overlays/sweep.ts`): opens every registered id in a running build, signed in as the test admin from the app `.env`, and counts an id "rendered" only with ON-SCREEN proof (`scripts/overlays/sweep-probe.ts`): summon's window render-ack plus that `[data-window-id]` box, a visible node inside the host's `[data-overlay-id]` wrapper (`AppSummonProvider` renderWrapper; `display: contents`), or a new dialog surface. A store flag is not proof: open-but-nothing-on-screen is `blank`, a stuck loading fallback is `loading`. Run it against `next start` of a build made with `NEXT_PUBLIC_OVERLAYS_SWEEP=1` (that flag, or dev, compiles in `window.__overlaysTest`; a normal production build has no hook):

```
NEXT_PUBLIC_OVERLAYS_SWEEP=1 pnpm build:next && pnpm exec next start -p <port>
pnpm check:overlays-sweep --url http://localhost:<port> --min 213 --data scripts/overlays/sweep-data.json
```

It needs a build and a sign-in, so it is a documented gate, not a release gate; its proof logic is guarded by `scripts/overlays/__tests__/sweep-probe.test.ts` (jest, planted null render / zero box / stuck loading / stale dialog) and `pnpm check:overlays-sweep:self-test` (real Chromium over planted overlays). Ids that need data from their launcher (`agentInlineOverlay`, `applyToSourceReview`, `resourcePickerWindow`) legitimately close themselves in a bare sweep.

## Open items

1. Rerun the sweep gate after every summon upgrade; the ids that stay non-clean are external 404/409s or need launcher data (see the latest report).
2. `ChatWindowId` from the installed chat package contains an id with no definition here (ChatHostAdapter `chatWindowOverlay` type error): add the definition or fix the chat package.
3. Carried lint errors: `react-hooks/refs` in `extractionCellEditorWindow.overlay.tsx`, `matrx/alchemy-data-in` in `host/OverlayErrorCopyForAi.tsx`.
4. `definitions/audioDevices.tsx` is an opener only: it opens `audioControlWindow` with `tab: "devices"`.
5. 18 overlays use the untyped wire (`UntypedOverlayWire`) because their openers dispatch interface-typed payloads; tighten as their option types become plain.

# Window Panels: FEATURE.md

> **Read this first.** The window engine is the npm package **`@ai-matrx/summon`** (source `../aidream/apps/shared/summon`; guides: its `README.md` for use and `FEATURE.md` for invariants). This repo keeps only what is the app's: the window components, the Tools grid, tray previews, the Detail primitive host, the address census and the laws below.
>
> - Rendering/registering an overlay (dialog, sheet, window, any component): [`features/overlays/FEATURE.md`](../overlays/FEATURE.md), skill `overlay-system`.
> - The `WindowPanel` frame, window manager, tray, pop-out, phone presentation, persistence, links: **the package**. Fix a defect there, in the same session; never patch around it here.
> - Listening and speech windows: [`features/audio/FEATURE.md`](../audio/FEATURE.md) § LISTENING & SPEECH (`@ai-matrx/chat/window-panels/windows/listen/ListenSummaryWindow`, opened by `features/overlays/definitions/listenSummaryWindow.overlay.tsx`).

## Quick map

```
@ai-matrx/summon (package)          WindowPanel, windowManager/overlays/urlSync/overlayState slices,
                                    tray, pop-out, phone surfaces, persistence, links, handles
features/overlays/definitions/      one <id>.overlay.ts(x) + <id>.render.tsx per overlay (window
                                    identity = the definition's `window` block, address = its `link`)
features/overlays/host/             AppSummonProvider, AppWindowSelectionSurface, OverlayServices,
                                    OverlayWorldHost, ports
features/window-panels/
  windows/<feature>/                window components (imported only by a render module)
  tools-grid/                       toolsGridTiles.ts, ToolsGrid.tsx, activateToolsGridTile.ts
  registry/tray-previews.tsx        semantic minimized previews (registered in definitions/trayPreviews.ts)
  registry/window-address-baseline.json   the address census baseline (only shrinks)
  detail/                           Detail primitive host (window, docked, page)
  components/                       EmbedSiteFrame, SidebarWindowToggle
  lite-window/, hooks/useOverlay.ts, utils/embed-site-url.ts, docs/inventory/
```

Deleted by the switch (any doc that names them is stale): `OverlayController`, `catalogue.ts`, `openers/`, `lazyOverlay`, `overlaySlice`, `windowManagerSlice`, `urlSyncSlice`, `overlayDataSlice`, `WindowPanel.tsx`, `WindowTray`, `WindowTraySync.tsx`, `WindowPersistenceManager`, `windowRegistryMetadata.ts`, `windowRegistryTypes.ts`, `url-sync/initUrlHydration.ts`, `lazy-bundle-guard`, `persistence/` (the local workspace store), `popout/`, `mobile/`, `MatrxFloatingFrame`, `utils/callbackManager.ts`.

---

## 🚨 Live AI runs — THE FLOATING LAW

> **A user must never watch a spinner while AI works. The run streams, and it streams in `LiveRunWindow`.**

Arman's ruling, 2026-08-11. Two halves, both absolute:

**1. Never a top-of-page block.** Inserting a live-run block above the page's content shifts everything down the instant a run starts and puts the model's output above the thing the user is editing. **Banned on every page, no size threshold.** The canonical surface is the floating `@ai-matrx/chat/window-panels/windows/agents/LiveRunWindow` (the window now ships from the chat package; its overlay is `features/overlays/definitions/liveRunWindow.overlay.tsx`) — opened via `useOpenLiveRunWindow()` / `<LiveRunWindowController>` (`features/overlays/definitions/liveRunWindow.overlay.tsx`). Token output renders through [`LiveRunDisplay`](../../../aidream/apps/shared/chat/src/agents/components/live-run/LiveRunDisplay.tsx). A multi-lane surface passes a stable `runSetKey` via [`RunSetWindowController`](../../../aidream/apps/shared/chat/src/agents/components/live-run/RunSetDisplay.tsx), and the same window renders every retained entry through `RunSetDisplay`; a host remount therefore rebinds the set instead of forgetting component-local request ids. Non-token pipelines pass `progress` and render [`LiveRunProgress`](../../../aidream/apps/shared/chat/src/agents/components/live-run/LiveRunProgress.tsx): stable rows update in place; event narration is banned.

**THE ONE EXCEPTION — inline `LiveRunDisplay`, and it is earned, not assumed.** A surface may render the window's _internals_ inline only when ALL of these hold: the UI around it is purpose-built, more beautiful, and more specialized than the generic window; and it **guarantees zero page shift** — in practice, the content sits at the BOTTOM and the page only grows downward. This requires designing an entire interface around the kind. **Very few surfaces will ever qualify, and a coding agent's default output is nowhere near the bar.** When in doubt, float it.

**2. Sizing is derived, never eyeballed.** Kind components are visually tuned against the `/chat` reading column, so the window matches it: **~720px of usable width** (760 outer − 38 chrome) and **80vh** tall. A narrower box reflows tables and makes a kind look broken in the window while looking right in chat. Both constants live at the top of `LiveRunWindow.tsx` with the arithmetic. Per-kind `width`/`height` overrides exist and are legitimate — a three-line kind should not open at 80vh, a wide table may need more than the chat column — but **only after watching that kind render and seeing the default be wrong.** Never hardcode a smaller default to make one screenshot fit.

**A run that dies on refresh is the same defect as a spinner.** A surface that IS the display for its own run — purpose-built, more specialized than the generic window, and structurally unable to shift content (the Masterwork **Final Checkup** panel, whose whole body is its finding stream with per-finding verbs) — declares `live.surfaceOwnsDisplay` on `useDurableRun`: the stream is still ADOPTED and still rendered by the ONE canonical pipeline, the generic window simply does not also open beside it. The flag decides WHERE the canonical renderer mounts; it never licenses a bespoke one. If the work is server-side, the surface reattaches on load; the durable record is whatever the run's own feature persisted — never this window (it is `ephemeral: true`).

**A surviving viewer retains its request.** EVERY canonical viewer — `StreamAwareChatMarkdown` (the seam under every `MarkdownStream`) and `LiveRunDisplay` — registers a viewer id in `activeRequests` via `useRetainRequestForViewer`; `removeRequest` and `destroyInstance` defer deletion until the final viewer releases it, and `createRequest` never resets an existing row. A route/query remount may clean up its run owner, but it can never blank a still-open surface. **Before touching any reap, adoption, or live-run render path, read [`LIVE-RUN-RETENTION.md`](../../../common-docs/systems/architecture/execution-runtime/LIVE-RUN-RETENTION.md)** — the disappearing-run class doctrine; guard test `request-viewer-retention.test.ts`.

---

## 🚨 A PANEL WRAPS THE CANONICAL COMPONENT — never a hand-rolled copy

**Arman, 2026-08-25**, on a cannibalization drill panel that re-rendered its own partial
page list:

> "Whenever we get a window panel of something, it needs to just wrap the actual identical
> component as a window panel. In this case, when I click on any keyword, it routes me to a
> page that is essentially the same page I'm on here, and it shows me a table filtered for
> that particular keyword. That's exactly what the window panel should show me… So it's
> actually easier than you're making it out to be. You're writing a bunch of extra code, but
> all that does is just make something ugly that we don't need. And it's not as useful as the
> one we already have. So just use what we already have."

The rule, and why it is not a style preference:

- **Find the route or component that already answers this question, and put THAT in the
  panel.** If clicking the thing navigates somewhere, the panel shows what that destination
  shows.
- A bespoke panel body is a **second renderer of the same data**, so it drifts, and it
  usually drifts by _truncating_ — the offending panel showed 5 of 83 pages while the
  canonical table paginated all 83. That is not a smaller view; it is a **wrong** one.
- Worked example: `GscDrilldownWindow` (`features/marketing/search-console/windows/`) is the
  Search Console page for one slice — `KpiBand` + `PerformanceChart` + `GscDimensionTable`.
  Every insight table's panel action opens it with `filters: { query_eq: row.query }` instead
  of rendering its own list.
- 🚨 **AND THE PANEL REPLACES THE TRIP, IT DOES NOT LINK TO IT.** Arman, 2026-08-26: _"We
  don't ever want to send the user off of the page, over to a route like the agent's mandate
  route. Instead, you should do the same thing that we do when the user clicks on the settings
  icon for the agents that are assigned into roles."_ A working surface that names a record
  OPENS its window; a `<Link>` to that record's route from such a surface is the regression
  this law exists to stop. The route keeps existing for browsing the whole list.
- Worked example: `MandateWindow` (`windows/mandates/MandateWindow.tsx`) — the mandate twin of
  `AgentSettingsWindow`. Its Yours pane IS `MandateOverridePanel` (what `/mandates`
  composes) and its Admin pane IS `MandateDetailView` (the console drawer, whole). The
  window's own code is the shell only: which mandates are in scope (the surface's own + its
  family's), which is selected, which pane shows, and ONE scoped load
  (`fetchMandateConsoleData({ mandateKeys })` — a handful of rows, not the platform's 365).
- Mechanical note: `MatrxDataTable`'s `window` prop is for the table's own record window.
  When the panel should be a canonical surface instead, set `window={{ enabled: false }}` and
  open the canonical window from a `rowActions` button.

## The Detail primitive — ONE core, three presentations (window · docked · page)

**Arman, 2026-09-17:** *"a core component that then shows up as a Page, a flexible drawer, and a
window panel. The default is the window."* The primitive is `lib/detail` (package-shaped; read
[`lib/detail/README.md`](../../lib/detail/README.md) and [`lib/detail/FEATURE.md`](../../lib/detail/FEATURE.md)).
A record type registers ONE `DetailRecordType`; the wrapper yields the `detailWindow` overlay
(a `WindowPanel`, the default), a `record-peek` canvas tab (docked) and the
`/detail/[type]/[id]` route. Presentation is the person's
`ui.detail.default_presentation` knob; `useOpenDetail()` from `lib/detail` is the one opener.

- **Do not build another `*DetailPanel.tsx` / `*DetailWindow.tsx`.** Register the type (today:
  an entry in `features/item-presentation/registry.tsx`, THE type map) and every presentation
  exists. The seven bespoke panels still in the tree are the follow-up census in the README.
- **Host binding lives here:** `detail/DetailHost.tsx` (boot-light ports, mounted in
  `app/Providers.tsx`), `detail/shells/` (window / page chrome), `detail/canvas/` (the docked `record-peek` canvas
  kind), `detail/detailTypeBinding.ts`, `windows/detail/DetailWindow.tsx` (window component), opener `features/overlays/definitions/detailWindow.overlay.tsx` + `detailWindow.render.tsx`, hydrator `detail` in `features/overlays/definitions/detailWindow.link.ts` (the `link` block of the definition):
  (`?panels=detail:<type>.<id>:as-window|docked`).
- **`docked` is not `drawer`.** `drawer` here is the vaul bottom sheet (`window.mobile`).


---

## Slots: the app's rules on top of the package contract

The package README lists every slot prop. App rules: the body is content only (header, footer, sidebar, secondary panel are slots, never body JSX); canonical body class `flex min-h-0 flex-1 flex-col overflow-hidden p-0`; `footerVariant="rich"` for a composer (reference `windows/multi-file-smart-code-editor`); `sidebarExpandsWindow` stays `false`; keep header action clusters compact (the centered title can be overlapped); the secondary panel is desktop only and the window owns its phone form. Reference windows: `windows/notes/NotesWindow.tsx`, `windows/FeedbackWindow.tsx`. Windows that extend `WindowPanel` props use `Omit<WindowPanelBaseProps, ...>` from `@ai-matrx/summon/window`.

## Mounting and bundle rules

- `AppSummonProvider` (`app/Providers.tsx`, `features/applets-host/AppletProviders.tsx`) mounts `SummonProvider`, `WindowsProvider` (selection surface, Escape-yield selector) and `WindowTraySync`, all from light package entries. Page-local `WindowPanel`s get the same options as overlay windows.
- **The root and boot code never import `@ai-matrx/summon/window` or a definition's render module.** `WindowPanel` and every `windows/**/*Window.tsx` load only through a render module (lazy, per definition) or `dynamic(..., { ssr: false })`. The overlay world itself loads once, on the first open (`app/DeferredOverlayWorld.tsx`). Guards: ESLint `windowPanelsImportRestriction`, `scripts/check-bundle-size.ts` (+2 KB per route), `app/__tests__/nothing-loads-until-engaged.test.tsx`. Read the `code-splitting` skill before importing a window-panel file.
- A unit shared between a window and a plain page drops into a slot as content and imports no `WindowPanel`.
- A dialog that launches a window and must stay mounted uses `<Dialog modal={false}>` (no scrim, not inert, below the window base z). Never raise a window above modal UI. `features/window-panels/__tests__/window-launching-dialogs.test.ts` lists the hosts.

## Persistence and links (app facts)

Declared per definition (`window.preservation`, `window.restoreDefaults`, `window.ephemeral`, `link`); stored by the package in `users.user_surface_state` through the app's `@ai-matrx/data` doors (`features/overlays/host/ports.ts`). Default-deny: no `preservation` means geometry only. Old local workspace keys are not migrated. Skill branch: `window-panels/persistence.md`. **Open:** the data adapter has not run against live `users.user_surface_state` writes; watch RLS, the organization binding and the version-conflict path.

## 🚨 A WINDOW WITH NO ADDRESS CANNOT BE REACHED: the address census (R35)

Every identity the platform names has a durable address AND an in-place door. A window without a `link` can be opened only by its door: it cannot be deep-linked, verified from a real seat, or reached by the extension and desktop clients. `ephemeral: true` governs restore only, never reachability.

The census is [`__tests__/everyWindowHasAnAddress.test.ts`](./__tests__/everyWindowHasAnAddress.test.ts) over `APP_OVERLAYS` (needs `../aidream` reachable) with [`registry/window-address-baseline.json`](./registry/window-address-baseline.json). It fails when: (1) a window overlay has no `window` identity (no address, mobile presentation or preservation contract); (2) a window whose data names a durable subject (`...Id`, `...Ids`, `...Token`, `...Slug`) has no `link`; (3) two windows claim one link key (unless listed in `sharedAddresses`; `detail` is one record in two presentations picked by the `as-` arg). A window whose data carries `callbackGroupId` hands a value back to its opener, so a deep link would open a picker with nothing to answer: it is listed in `addressless` with the reason. Everything else unaddressed sits in `unaddressedBaseline`, which **only shrinks**: new debt fails, and an entry that has since been addressed must be deleted.

**Giving a window its address takes three edits:** the `link` block (+ `<id>.link.ts` hydrator), `urlSyncKey`, and `urlSyncId={<subject id>}` on the `WindowPanel`. Without the third, every instance writes the same token and the link reopens an empty frame. The hydrator must `open(...)` the window; one that does not open it is the "opens from the URL but never writes back" defect. The address is never destroyed by a clock: an unresolved token stays verbatim in `?panels=` and is announced at the package's deadline, and only a window that registered and then unregistered removes its token.

## Tools grid

Declarative tiles in [`tools-grid/toolsGridTiles.ts`](./tools-grid/toolsGridTiles.ts); each references an overlay id and may set `gate: "admin"`, `instanceStrategy` (`singleton-default` | `fresh-per-click`), `seedData(ctx)`, or `onActivate(ctx)` as an escape hatch. `activateToolsGridTile.ts` resolves the definition with `appOverlayDefinition(overlayId)`; with no `instanceStrategy`, a `multi` overlay is fresh per click. Two tiles may open the same overlay with different seed data. The grid and its icons ship only after the first click on the sidebar toggle (`SidebarWindowToggle` is `dynamic`, `ssr: false`). Never add a tile inside `features/window-panels/components/SidebarWindowToggle.tsx`.

## Tray previews

A window with a small, safe status payload registers a semantic preview: `registerTrayPreview("<overlayId>", { Preview })` in `features/overlays/definitions/trayPreviews.ts`, component in `registry/tray-previews.tsx` (today: notes, quick tasks, cloud files, scraper, smart code editor, messages, single message, browser workbench, error inspector, live run, share, transcript studio). Every other window uses the package default capture. Do not turn on raster capture for a window with a semantic preview.

## Auto-opened windows (MKT-104)

A window the system opens by itself (debug auto-open: Workflow run, Watch AI) calls `markAutoOpened(overlayId, instanceId)` (from `@ai-matrx/summon/window`) before dispatching its open. The package then docks it in the widest free gutter beside the page's working column. When no gutter fits, `AutoWatch` (checked with `autoOpenHasRoom`) opens the same view as a tab in the shell's canvas column instead (`features/ai-watch/canvas/runViewKinds.ts`); a docked window the page grows over closes itself and its view moves to the canvas (`AUTO_OPEN_NO_ROOM_EVENT`). Never a parked tray tile, never over the page; a person's drag, minimize or restore ends the system's say.

## Open items

1. Real IndexedDB and Document Picture-in-Picture have not been exercised in a real browser; the data adapter has not run against live `user_surface_state` rows (package FEATURE "Known open items").
2. `WindowPanel` throws when there is no `SummonProvider` above it (dialog/sheet fall back to default ports): any standalone test or story wraps one.
3. Persistence rollout stays audited: add typed linkage between `restoreDefaults`, `preservation.dataKeys` and `onCollectData` before enabling more windows; callback-group windows need a rebind contract first.
4. Semantic tray previews: add one only when a window has a safe status payload.
5. Broader phone-presentation matrix and browser coverage beyond the preservation pilots.
6. `secondaryPanel` has no phone route; the consumer owns it (`features/notes` is the reference).
7. Six link tests were ported onto the definitions' `link.hydrate` through `features/overlays/definitions/__tests__/linkKit.ts`; new link tests use the same kit.

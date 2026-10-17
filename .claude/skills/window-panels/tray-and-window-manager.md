# Window Panels: the tray and the window manager

Companion to the `window-panels` skill. Read when the task touches minimized windows, tray previews, or `windowManager` state. The slice, tray layout and reveal logic are the package's (`src/core/windowManagerSlice.ts`, `src/core/geometry/tray.ts`, `src/window/tray/`, `src/window/WindowTraySync.tsx`); fix them there.

## The tray

There is no separate dock component to mount. A minimized window is a card drawn by `WindowPanel` itself (`tray/MinimizedWindowContent.tsx`); desktop cards are 240x160, slot zero bottom-right, later cards grow left then wrap upward, and an overflow collapses to a bounded title-strip grid. Single-click or double-click anywhere on the card restores it. `WindowTraySync` (mounted once by `AppSummonProvider` from `@ai-matrx/summon/window-host`) is the debounced viewport listener that recomputes slot positions and clamps docked windows into a shrunken viewport.

**Previews.** Order: a semantic preview registered with `registerTrayPreview(overlayId, { Preview })` (app registrations: `features/overlays/definitions/trayPreviews.ts`, components in `features/window-panels/registry/tray-previews.tsx`), then the `captureTraySnapshot` prop, then the package's default capture (`html-to-image`, loaded on first minimize; without it the card shows no thumbnail). Snapshots are in-memory only. A live or stateful window that must not lose a draft or stream on minimize is already safe: minimize keeps the body mounted.

## `windowManager` state

Registry of mounted windows: geometry, z-index, tray slots, pop-out state. A window joins on mount and leaves on unmount. Actions and selectors come from `@ai-matrx/summon` (for example `updateWindowRect`); there is no `lib/redux/slices/windowManagerSlice.ts` any more.

- **`revealWindow`** is the one "bring this into view" primitive (un-minimize, clamp, raise, clear `windowsHidden`); opening an already-open window re-reveals it.
- **`windowsHidden` can never strand `true`:** registering a window clears it, unregistering the last window resets it. Do not add a path that leaves it set.
- **Geometry never collapses to zero:** every viewport read for geometry goes through `safeViewportDims()`; a reader may take the 1280x800 fallback, a writer must bail on a degenerate measurement.
- **Silent-render guard:** the package's `renderWatchdog` middleware checks ~2.5 s after an open that a visible panel exists and, if not, errors loudly and offers a self-healing toast. `WindowPanel` acknowledges its render; a window that swaps in its own phone surface calls `useOverlaySurfaceRenderAck`.
- **System-opened windows** call `markAutoOpened(overlayId, instanceId)` (exported from `@ai-matrx/summon/window`) before dispatching the open; see FEATURE.md "Auto-opened windows".

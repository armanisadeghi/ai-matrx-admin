# Window Panels: persistence and links

Companion to the `window-panels` skill. Read when saving or restoring window state, `onCollectData`, `ephemeral`, or `?panels=` links. The engine is the package (`src/persistence/`, `src/url/`); the app supplies the port (`features/overlays/host/ports.ts`) and two mounted components (`OverlayPersistence`, `OverlayLinkManager`, both in `features/overlays/host/OverlayServices.tsx`).

## Where it is stored

`createDataPersistence` (`@ai-matrx/summon/persistence/data`) over the app's `@ai-matrx/data` doors writes rows of `users.user_surface_state` (`feature = "summon"`, `surface_key` = `workspace`, `workspace:<tab id>` or `state:<overlayId>:<instanceId>`), with the active organization bound through `createDb({ organization })`. It is per person and per identity key (`auth:<userId>` / `guest:<fingerprint>`). Old `matrx:window-workspace:*` local keys are not read: everyone started with no saved windows once. The `window_sessions` table is gone. **Not yet exercised against live `users.user_surface_state` writes** (package FEATURE "Known open items"): watch RLS and the org binding.

## What saves and when

The controller (`src/persistence/controller.ts`) saves the workspace and `keepAlive: "restore"` component state **debounced 250 ms after any window-manager or overlay-state change**, and flushes on `pagehide`, hidden visibility and every close. Writes stay gated until the load for the current identity applied. An identity change closes everything and loads the new identity's data. Closing removes the window from the saved workspace (no resurrection of a window closed during a slow read).

## Default-deny, declared on the definition

```ts
window: {
  windowId: "my-feature-window",
  mobile: "drawer",
  preservation: { dataKeys: ["selectedId"], requiredDataKeys: ["selectedId"], maxDataBytes: 32768 },
  restoreDefaults: { selectedId: null },
  // ephemeral: true,   // never saves anything (callback-group windows, debug panels, one-shot dialogs)
},
```

- A window restores **data** only for `preservation.dataKeys`; without `preservation` it restores geometry only; `ephemeral: true` saves nothing. Multi-instance windows restore per exact `instanceId`.
- `requiredDataKeys` stops a context-dependent window from reopening without the identity it needs.
- `restoreDefaults` is merged under restored data. Functions, callbacks and blobs never reach storage (open data is JSON).
- `WindowPanel`'s `onCollectData` returns the window's current content keys (plain JSON, read from live state). The result is filtered to `dataKeys`. **No manual `useCallback`**: the React Compiler memoizes it. "Save window state" in the green dropdown is an explicit save.
- Link vs restore for the same instance: link data wins, restored geometry wins, in either arrival order.

## Links (`?panels=`)

A window is addressable when its definition has `link: { key, hydrate }`; `WindowPanel` then writes its own token (`?panels=notes:<instanceId>`) from `urlSyncKey` / `urlSyncId` / `urlSyncArgs`. **Three edits give a window its address:** the `link` block (+ `<id>.link.ts` hydrator), the matching `urlSyncKey`, and `urlSyncId={<subject id>}` on the `WindowPanel` (without the third, every instance writes the same token and the link reopens an empty frame). Grammar v2 is `key[:id[:k-v(_k-v)*]]`. A token whose overlay has not registered yet is kept verbatim in the address bar and announced at the deadline; it is never dropped by a timer. The address census is `features/window-panels/__tests__/everyWindowHasAnAddress.test.ts` + `registry/window-address-baseline.json`.

# Window Panels

Floating, resizable, minimizable OS-style windows. The engine (`WindowPanel`, window manager, tray, pop-out, phone presentations, persistence, `?panels=` links) is the npm package **`@ai-matrx/summon`** (`../aidream/apps/shared/summon`; its `README.md` is the usage guide). This folder holds the app's window components and the few things around them.

> Full rules and laws: [`FEATURE.md`](./FEATURE.md). Overlay rendering: [`../overlays/FEATURE.md`](../overlays/FEATURE.md). Skills: `overlay-system`, `window-panels`, `window-panel-authoring` (includes removal).

## Add a window: declare it, then write it

**1. Declare it** in `features/overlays/definitions/` (two files and one line in `registry.ts`, then `pnpm gen:overlays`; the full recipe is in the `overlay-system` skill):

```ts
// myFeatureWindow.overlay.tsx
export const myFeatureWindowOverlay = defineOverlay<OpenMyFeatureWindowOptions>()({
  id: "myFeatureWindow",
  label: "My Feature",
  instance: "single",
  window: { windowId: "my-feature-window", mobile: "drawer" /* preservation, ephemeral, restoreDefaults */ },
  render: () => import("./myFeatureWindow.render"),
});
```

`myFeatureWindow.render.tsx` renders the window component with by-name props and `onClose={() => close()}`.

**2. Write the component** in `windows/<feature>/MyFeatureWindow.tsx`: mount `<WindowPanel>` from `@ai-matrx/summon/window`, body is content, chrome in slots, close binding (`overlayId`, `boundToOverlay` or `onClose`), `onCollectData` if the window preserves state.

## Where things are

| Need | Look |
|---|---|
| Slots, close binding, bundle rules, pitfalls | skill `window-panels` |
| Restore, `ephemeral`, links | skill `window-panels` branch `persistence.md`, FEATURE.md address census |
| Phone presentation | definition `window.mobile`; skill branch `mobile-presentation.md` |
| Tools grid tile | `tools-grid/toolsGridTiles.ts` |
| Tray preview | `registry/tray-previews.tsx`, `../overlays/definitions/trayPreviews.ts` |
| Detail window / page / docked | `detail/`, FEATURE.md § The Detail primitive |
| A window to the engine's behavior | the package source, never a copy here |

Bundle rule: window components and `@ai-matrx/summon/window` are reached only from a render module or a `dynamic(..., { ssr: false })`, never from a route, layout or provider.

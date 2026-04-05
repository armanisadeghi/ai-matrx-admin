# Floating Window Panel System

A high-performance, Redux-backed OS-style window manager for React. This system resolves `z-index` and `overflow:hidden` constraints by portalling windows to `document.body` while securely tracking layout properties in a centralized store.

## Architecture & Data Flow

1. **Global Store (`windowManagerSlice.ts`)**
   - Single source of truth for window state (`windowed`, `minimized`, `maximized`), geometry (`WindowRect`), depth (`zIndex`), and minimization docks (`traySlot`). 
   - Exposes imperative actions (`updateWindowRect`, `maximizeWindow`, etc.) avoiding React state synchronization delays.

2. **Controller Hook (`useWindowPanel.ts`)**
   - The bridge between the DOM and Redux. It registers the instance on mount and injects unmanaged `mousemove`/`mouseup` listeners on the `document` for performant, frictionless dragging/resizing via `updateWindowRect` dispatches. 

3. **Presentation Layer (`WindowPanel.tsx`)**
   - The UI shell. Consumes `useWindowPanel` properties and inline-styles an absolute `div` target portalled directly to `document.body`. Handles rendering traffic light controls, title injection, and dynamic resize handles (N, S, E, W, NE, NW, SE, SW).

4. **Multi-Instance State Backing (`withGlobalState.tsx`)**
   - Uses the Redux dynamic module slice paradigm. 
   - By creating a `systemComponents` module, this High-Order Component provides instances rendered inside `WindowPanel` with their own `globalState`, `globalConfigs`, and `globalPrefs` bucket without bloating the core window coordinates store. 

5. **Dock Controller (`WindowTray.tsx` & `WindowTraySync`)**
   - Monitors minimized window entries and renders UI chips. Exposes click-to-restore functionality and tracks bounding box collisions/dimensions on window resize via `WindowTraySync`.

## Redux Topology
*   **Window Manager Slice**: Governs *Spatial Data* (Positions, State).
*   **System Components Module**: Governs *Internal Component State* (Arbitrary UI data inside the panel).

## Specialized Components

### `FloatingPanel.tsx` (Unmanaged Wrapper)
For ephemeral or basic floating components that do **not** require grid arrangements, tray docking, or persistence. `FloatingPanel` handles its own self-contained drag listeners and collapse logic independently of Redux.

## Event Subsystem (`useCallbackManager`)
For long-running tasks or asynchronous processing across dynamic panels, `useCallbackManager` provides a predictable proxy. Components wrap promises enabling progress monitoring visually outside the exact React render loop. Wait for completions gracefully without manually managing memory references.

## Key Invariants
- `WindowPanel` is strictly unmounted if not visible, EXCEPT when `state === 'minimized'` where boundaries are forced to zero to keep DOM execution alive safely.
- All dynamic components *must* declare an `id` to leverage Z-index memory indexing.

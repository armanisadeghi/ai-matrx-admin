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

## Built-in Collapsible Sidebar

WindowPanel has first-class support for a resizable, collapsible left sidebar panel. When enabled, a toggle icon appears in the traffic light area (next to the close/minimize/maximize dots) — no extra header space consumed.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sidebar` | `ReactNode` | — | Content for the collapsible left panel. Omit to disable. |
| `sidebarDefaultSize` | `number` | `25` | Initial width as a percentage of the window. |
| `sidebarMinSize` | `number` | `10` | Minimum percentage before the panel collapses. |
| `defaultSidebarOpen` | `boolean` | `true` | Whether the sidebar starts expanded. |
| `sidebarClassName` | `string` | — | Class name for the sidebar content wrapper. |

### Usage

```tsx
<WindowPanel
  title="My Window"
  sidebar={<MySidebarNav />}
  sidebarDefaultSize={25}
  sidebarMinSize={10}
  sidebarClassName="bg-muted/20"
  onClose={handleClose}
>
  <MainContent />
</WindowPanel>
```

The sidebar is internally wired with `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle` — consumers don't manage any sidebar state, refs, or toggle logic. The toggle button is rendered inside the traffic light group and appears automatically when `sidebar` is provided.

### Sidebar Scrolling

The sidebar wrapper automatically applies `overflow-y-auto` with a thin scrollbar (`scrollbar-thin`). Sidebar content that exceeds the available height will scroll without any extra work from the consumer.

**Rules for sidebar content components:**

1. **Do NOT set `overflow-y-auto` or `overflow-hidden` on your sidebar root** — the WindowPanel wrapper handles it.
2. **Do NOT use `shrink-0`** on the sidebar root — it prevents the container from constraining to the available height.
3. **DO use `h-full min-h-0 flex flex-col`** on your sidebar root so it fills the available space and allows flex children to shrink.
4. Use `flex-1 min-h-0` on the scrollable content area inside your sidebar.

```tsx
// Correct sidebar content pattern
function MySidebar() {
  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Optional fixed header */}
      <div className="px-2 py-1 border-b text-xs font-medium">Header</div>
      {/* Scrollable list — no overflow needed, parent handles it */}
      <div className="flex-1 min-h-0 p-1.5 space-y-1">
        {items.map(item => <Item key={item.id} />)}
      </div>
    </div>
  );
}
```

## Built-in Footer

WindowPanel supports a `footer` prop that renders a full-width bar below the body (including below the sidebar). It matches the header's density — same padding (`px-2 py-1.5`), background, and border treatment. Icons and buttons inside the footer are automatically sized to match the header (`[&_svg]:h-3 [&_svg]:w-3`, `[&_button]:h-5`).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `footer` | `ReactNode` | — | Content for the footer bar. Omit to disable. |

### Usage

```tsx
<WindowPanel
  title="My Window"
  footer={
    <>
      <span className="text-muted-foreground">Status text</span>
      <div className="flex-1" />
      <Button size="sm" className="h-5 text-xs px-2">Save</Button>
    </>
  }
>
  <MainContent />
</WindowPanel>
```

The footer content is wrapped in a flex row — use `<div className="flex-1" />` spacers for alignment. When combined with `sidebar`, the footer spans the full window width (it sits outside the sidebar split).

## Specialized Components

### `FloatingPanel.tsx` (Unmanaged Wrapper)
For ephemeral or basic floating components that do **not** require grid arrangements, tray docking, or persistence. `FloatingPanel` handles its own self-contained drag listeners and collapse logic independently of Redux.

## Event Subsystem (`useCallbackManager`)
For long-running tasks or asynchronous processing across dynamic panels, `useCallbackManager` provides a predictable proxy. Components wrap promises enabling progress monitoring visually outside the exact React render loop. Wait for completions gracefully without manually managing memory references.

## Key Invariants
- `WindowPanel` is strictly unmounted if not visible, EXCEPT when `state === 'minimized'` where boundaries are forced to zero to keep DOM execution alive safely.
- All dynamic components *must* declare an `id` to leverage Z-index memory indexing.

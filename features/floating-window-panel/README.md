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
   - macOS-style invisible hot zone over the left header area — traffic light icons reveal before the cursor reaches the dots.

4. **Multi-Instance State Backing (`withGlobalState.tsx`)**
   - Uses the Redux dynamic module slice paradigm. 
   - By creating a `systemComponents` module, this High-Order Component provides instances rendered inside `WindowPanel` with their own `globalState`, `globalConfigs`, and `globalPrefs` bucket without bloating the core window coordinates store. 

5. **Dock Controller (`WindowTray.tsx` & `WindowTraySync`)**
   - Monitors minimized window entries and renders UI chips. Exposes click-to-restore functionality and tracks bounding box collisions/dimensions on window resize via `WindowTraySync`.

## Redux Topology
*   **Window Manager Slice**: Governs *Spatial Data* (Positions, State).
*   **System Components Module**: Governs *Internal Component State* (Arbitrary UI data inside the panel).

## Sizing

Pass `width` and `height` as simple numbers (pixels) or viewport-relative strings. The component handles all `window` checks internally — consumers never need `typeof window`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number \| string` | `320` | Initial width. Number = pixels, string = viewport unit (`"60vw"`). |
| `height` | `number \| string` | `400` | Initial height. Number = pixels, string = viewport unit (`"60vh"`). |
| `position` | `WindowPosition` | `"center"` | Placement hint: `"center"`, `"top-right"`, `"top-left"`, `"bottom-right"`, `"bottom-left"`. |
| `minWidth` | `number` | `180` | Minimum resize width in pixels. |
| `minHeight` | `number` | `80` | Minimum resize height in pixels. |

```tsx
<WindowPanel title="Chat" width={420} height="60vh" position="center">
  <ChatBody />
</WindowPanel>

<WindowPanel title="Voice" width={320} height={420} position="top-right">
  <VoicePad />
</WindowPanel>
```

`initialRect` still exists for edge cases where you need a specific `x`/`y` pixel position (e.g., demo layouts). When `initialRect` provides `x`/`y`, those override the `position` prop. When it provides `width`/`height`, those override the `width`/`height` props. Prefer the simpler props for all standard usage.

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


## Important Reminders:
- Make sure your component is listed here: min/features/floating-window-panel/SidebarWindowToggle.tsx
- Remember that you can create a multi-window pattern as well, which is best demonstrated by the User Feedback and Screenshot systems:
  - features/floating-window-panel/windows/ImageViewerWindow.tsx
  - features/floating-window-panel/windows/FeedbackWindow.tsx
  - In this case, it's a one-direction relationship but it could be two-directional as well!

## Registered Windows (Tools Tab)

| overlayId | Window File | Feature |
|-----------|-------------|---------|
| `jsonTruncator` | — | JSON truncation utility |
| `notesWindow` | `NotesWindow.tsx` | Quick notes |
| `voicePad` | — | Voice pad |
| `quickAIResults` | — | AI results viewer |
| `streamDebug` | — | Stream debug |
| `feedbackDialog` | `FeedbackWindow.tsx` | Feedback submission + image viewer |
| `adminStateAnalyzerWindow` | — | State analyzer |
| `markdownEditorWindow` | `MarkdownEditorWindow.tsx` | Markdown editor |
| `userPreferencesWindow` | `UserPreferencesWindow.tsx` | User preferences |
| `emailDialogWindow` | `EmailDialogWindow.tsx` | Email composer |
| `shareModalWindow` | `ShareModalWindow.tsx` | Share modal |
| `quickTasksWindow` | `QuickTasksWindow.tsx` | Task list |
| `quickDataWindow` | `QuickDataWindow.tsx` | Data tables |
| `quickFilesWindow` | `QuickFilesWindow.tsx` | File browser |
| `fileUploadWindow` | `FileUploadWindow.tsx` | File uploader |
| `scraperWindow` | `ScraperWindow.tsx` | Web scraper |
| `contextSwitcherWindow` | `ContextSwitcherWindow.tsx` | Context switcher |
| `pdfExtractorWindow` | `PdfExtractorWindow.tsx` | PDF / image text extraction |
| `canvasViewerWindow` | `CanvasViewerWindow.tsx` | Canvas item viewer |
| `galleryWindow` | `GalleryWindow.tsx` | Unsplash image gallery + favorites |

## PDF Extractor Window

Overlay ID: `pdfExtractorWindow`

Feature logic lives in `features/pdf-extractor/`:
- `hooks/usePdfExtractor.ts` — extraction state, history, copy utility
- `components/PdfExtractorWorkspace.tsx` — body, sidebar, and self-contained floating shell

**Architecture:** The window holds its own `usePdfExtractor` instance (all state lives inside `PdfExtractorFloatingWorkspace`). The sidebar shows per-session extraction history; clicking a history item re-loads that result without re-extracting.

**Tabs:** Raw Text · Preview · Metadata · AI Clean (placeholder)

## Specialized Components

### `FloatingPanel.tsx` (Unmanaged Wrapper)
For ephemeral or basic floating components that do **not** require grid arrangements, tray docking, or persistence. `FloatingPanel` handles its own self-contained drag listeners and collapse logic independently of Redux.

## Event Subsystem (`useCallbackManager`)
For long-running tasks or asynchronous processing across dynamic panels, `useCallbackManager` provides a predictable proxy. Components wrap promises enabling progress monitoring visually outside the exact React render loop. Wait for completions gracefully without manually managing memory references.

## Key Invariants
- `WindowPanel` is strictly unmounted if not visible, EXCEPT when `state === 'minimized'` where boundaries are forced to zero to keep DOM execution alive safely.
- All dynamic components *must* declare an `id` to leverage Z-index memory indexing.

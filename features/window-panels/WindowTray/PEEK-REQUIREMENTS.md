# Tray Chip Hover-Peek — Requirements for Parallel Implementation

**Status**: spec / not yet built. Hand this to the dev who's writing the peek components in parallel.
**Owner**: window-panels feature
**Surface**: minimized window tray chips (`features/window-panels/WindowTray.tsx`)

---

## 1. What we're building

A hover-peek surface that appears when the user hovers a minimized tray chip — a larger floating preview card that displays richer information about the window than fits in the 200×56px chip.

Visual reference: think Windows 11 taskbar peek (large preview floats above the chip on hover-and-hold), or macOS Mission Control thumbnails (hover scrubbing reveals a larger view).

Two rendering tiers:

1. **Generic peek (default)** — a pre-built component that renders a card with: window icon + title + brief description + restore/close buttons. Used for any window without a custom peek.
2. **Custom peek (opt-in)** — per-window-type component supplied via the registry, gets full control of the peek surface to render anything (chart preview, last 3 messages, file list, etc.).

---

## 2. Trigger UX

- **Show**: pointer hovers a tray chip for ≥ 400 ms
- **Hide**: pointer leaves both the chip AND the peek surface
- **Stay open while pointer moves between** chip and peek (allow grabbing buttons inside the peek)
- **Position**: float above the chip (typically), nudged left if it would overflow the right edge
- **Animations**: 150ms fade-in + 4px translate-up; 100ms fade-out
- **Dismiss on**: Escape key, click anywhere outside, scroll on parent
- **Disabled when**: dragging a chip (don't fight the drag-to-reorder gesture)

---

## 3. Sizing

- **Width**: 320 px (default), windows can override per-instance via custom peek
- **Height**: auto, capped at 280 px (overflow scrolls inside the peek)
- **Padding**: matches design tokens (12px outer, 8px between sections)

---

## 4. Component API

```ts
// New file: features/window-panels/WindowTray/TrayChipPeek.tsx

export interface TrayChipPeekProps {
  /** Anchor element — the chip the peek attaches to (for positioning). */
  anchor: HTMLElement;
  /** Window id (matches WindowEntry.id). */
  windowId: string;
  /** Window title (from WindowEntry.title). */
  title: string;
  /** Called when the peek wants to dismiss itself. */
  onClose: () => void;
}

export function TrayChipPeek(props: TrayChipPeekProps): JSX.Element;
```

Internally, `TrayChipPeek` should:

1. Look up the registry entry via `getRegistryEntryByOverlayId(windowId)`
2. If `registry.renderTrayPeek` exists → render that
3. Otherwise → render the generic peek body

---

## 5. Registry hook (already declared)

We will add this field to `WindowRegistryEntry` (in `features/window-panels/registry/windowRegistry.ts`):

```ts
interface WindowRegistryEntry {
  // ...existing fields

  /**
   * Optional custom JSX for the hover-peek surface. If provided, takes
   * precedence over the generic peek. Receives the same `TrayPreviewContext`
   * as `renderTrayPreview` (so a window can share data fetching).
   *
   * Should render *only the body content* — the peek surface frame
   * (background, shadow, border, close button) is provided by `TrayChipPeek`.
   * Keep it under ~280px tall; overflow scrolls inside.
   */
  renderTrayPeek?: (ctx: TrayPreviewContext) => ReactNode;
}
```

`TrayPreviewContext` is already defined in `windowRegistry.ts`:

```ts
interface TrayPreviewContext {
  data: Record<string, unknown>;  // window's persisted overlay data
  overlayId: string;
  instanceId: string;
  title: string;
}
```

---

## 6. Generic peek (default body)

When a window doesn't provide `renderTrayPeek`, the peek shows:

```
┌──────────────────────────────────────────┐
│ [icon] Window Title                  [X] │  ← header (24px, border-bottom)
├──────────────────────────────────────────┤
│                                          │
│ {Description from registry.label, or     │
│  reuses renderTrayPreview if available   │
│  rendered at larger size}                │
│                                          │
├──────────────────────────────────────────┤
│             [ Restore ]  [ Close ]       │  ← footer (32px)
└──────────────────────────────────────────┘
```

- Header icon: registry icon via `IconResolver` (same as chip)
- Title: window title
- Body: rendered via `renderTrayPreview` if defined, else `registry.label` as plain text
- Restore button: dispatches `restoreWindow(id)`
- Close button: dispatches a close action (TBD — we may need to add a `closeWindow` action; for now use `unregisterWindow` or close via overlay slice)

---

## 7. Integration into `WindowTray.tsx`

The chip already has a click handler. The dev integrating the peek should:

1. Add hover-detection to the chip (via a custom `useHoverIntent` hook with the 400ms delay)
2. When intent fires, mount `TrayChipPeek` as a portal anchored to the chip
3. The portal target should respect `usePopoutContainer()` — peeks for chips in a popped-out window should render in the popout (though this combination is unusual since popped-out windows aren't in the tray)

Suggested patch site: inside `TrayChip` (around line 178 of `WindowTray.tsx`):

```tsx
const [peekOpen, setPeekOpen] = useState(false);
const chipRef = useRef<HTMLDivElement>(null);
useHoverIntent(chipRef, { delay: 400, onHover: () => setPeekOpen(true) });

return (
  <>
    <div ref={chipRef} ...>
      ...existing chip JSX...
    </div>
    {peekOpen && chipRef.current && (
      <TrayChipPeek
        anchor={chipRef.current}
        windowId={id}
        title={title}
        onClose={() => setPeekOpen(false)}
      />
    )}
  </>
);
```

---

## 8. Positioning logic

Use floating-ui (`@floating-ui/react`) — already a dependency in this project (verify with `grep "@floating-ui" package.json`). The standard pattern:

```ts
const { x, y, refs, strategy } = useFloating({
  placement: "top",
  middleware: [
    offset(8),
    flip(),
    shift({ padding: 8 }),
  ],
});
```

Mount the peek as a portal so it escapes the tray's `overflow:hidden` ancestors.

---

## 9. Accessibility

- Peek must have `role="tooltip"` or `role="dialog"` (whichever matches behavior)
- Focusable controls inside (Restore / Close) must be reachable via Tab
- Escape closes the peek
- Hovering the peek itself keeps it open (don't dismiss when pointer leaves chip but enters peek)
- Reduced motion: skip the slide animation when `prefers-reduced-motion: reduce`

---

## 10. Testing checklist

- [ ] Hover chip for 400ms → peek appears
- [ ] Hover for 200ms then leave → peek does NOT appear
- [ ] Move from chip to peek without losing it
- [ ] Peek auto-positions (above by default, flips below if no room)
- [ ] Restore button restores window + closes peek
- [ ] Close button closes window + closes peek
- [ ] Escape closes peek
- [ ] Click outside closes peek
- [ ] Multiple chips → only one peek at a time (mounting a new one closes the previous)
- [ ] Custom `renderTrayPeek` for Notes shows a list of recent notes
- [ ] Generic peek (no custom render) for any unmigrated window
- [ ] Theme toggle while peek is open → peek updates without remount
- [ ] Reduced motion respected
- [ ] Touch devices: long-press chip opens peek (replaces hover)

---

## 11. Files to create

```
features/window-panels/WindowTray/
├── TrayChipPeek.tsx               — main peek surface component (NEW)
├── useHoverIntent.ts              — 400ms-debounced hover detector (NEW)
└── peek-internals/                — supporting components (NEW)
    ├── PeekHeader.tsx
    ├── PeekFooter.tsx
    └── GenericPeekBody.tsx
```

---

## 12. Files to modify

```
features/window-panels/registry/windowRegistry.ts
  → add `renderTrayPeek?: (ctx: TrayPreviewContext) => ReactNode` to WindowRegistryEntry

features/window-panels/WindowTray.tsx
  → integrate TrayChipPeek into TrayChip (see §7)
```

---

## 13. Things to coordinate with main feature owner

- **closeWindow action**: there isn't a clean "close minimized window" Redux action right now (you can `unregisterWindow` but that's a teardown, not a UX-level close). Either add one (`closeWindow` that dispatches both unregister AND a closeOverlay if overlay-managed), or have the peek just dispatch `unregisterWindow` for v1. Discuss before shipping.
- **Mobile behavior**: the mobile tray uses different chips (`MobileTrayChip`). Peek probably doesn't apply on mobile (touch users don't hover) — long-press might be the equivalent gesture, but skip for v1.
- **Custom peek migration order**: which 3-5 windows should ship with custom peeks first? Suggested: Notes (recent notes list), Quick Tasks (task list with checkboxes), Cloud Files (recent files), Conversation (last 3 messages), Web Scraper (results count + status).

---

## 14. Out of scope for v1

- Drag-to-reorder while peek is open (can be enabled later)
- Multi-peek (multiple peeks open simultaneously)
- Live data refresh inside the peek (peek shows snapshot of `data` at open time)
- Peek-to-window drag (drag from peek to spawn a popout)

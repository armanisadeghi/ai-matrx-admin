---
name: react-resizable-panels-v4
description: Single source of truth for `react-resizable-panels` v4 in this Next.js 16 SSR-heavy codebase. Use whenever you import from `react-resizable-panels`, edit `components/ui/resizable*`, work on `features/code/layout/`, build a split-pane layout, sidebar, code-editor shell, multi-pane app, or anything mentioning "resizable", "panel group", "split", "sidebar", or "drag handle". Covers the v3→v4 rename trap, the official Next.js cookie SSR pattern, programmatic show/hide that snaps back to prior size, and what NOT to add (no `useState` for sizes, no extra refs, no useEffects to read sizes).
---

# react-resizable-panels v4 — the only thing you need to read

> **Library version:** `4.10.x` (latest stable as of 2026-04). The package in `package.json` resolves here.
> **Demo routes that prove every pattern in this skill:** `/ssr/demos/resizables/*` (index at `app/(ssr)/ssr/demos/resizables/page.tsx`).
> **Repo wrappers (already styled to the theme):** [`components/ui/resizable.tsx`](../../../components/ui/resizable.tsx), [`components/ui/matrx/resizable.tsx`](../../../components/ui/matrx/resizable.tsx).

---

## STOP. Read this before writing any code.

### v4 is a rename of v3. Most of what you remember is wrong.

| You're about to type… | …it doesn't exist. Use this instead. |
|---|---|
| `import { PanelGroup }` | `import { Group }` |
| `import { PanelResizeHandle }` | `import { Separator }` |
| `<PanelGroup direction="horizontal">` | `<Group orientation="horizontal">` |
| `autoSaveId="x"` | `useDefaultLayout({ id: "x", panelIds, storage })` hook |
| `defaultSize={30}` (you meant 30%) | `defaultSize="30%"` (in v4, **bare numbers are PIXELS**) |
| `ref={panelRef}` | `panelRef={panelRef}` (named prop, NOT React `ref`) |
| `ref={groupRef}` | `groupRef={groupRef}` (named prop, NOT React `ref`) |
| `onCollapse={...}` / `onExpand={...}` | derive from `onResize(next, id, prev)` — those props were removed |
| `MixedSizes` type | `PanelSize` (`{ asPercentage: number; inPixels: number }`) |
| `ImperativePanelHandle` | `PanelImperativeHandle` |
| `ImperativePanelGroupHandle` | `GroupImperativeHandle` |
| `disableGlobalCursorStyles()` | `<Group disableCursor />` prop |

### Things that DO NOT EXIST in v4 (don't search for them — you won't find them)

- `units` prop on Group (size unit is encoded in each value: `30` = 30px, `"30%"` = 30%, `"3rem"`, `"50vh"`, `"50vw"`).
- `keyboardResizeBy` prop.
- `tagName` prop on Group/Panel/Separator. The root is always a `<div>`.
- `order` prop on Panel. DOM order = layout order. (Conditional rendering replaces it.)
- `defaultCollapsed` prop on Panel. Use `defaultSize="0%"` + `collapsible`. (4.4.1+ mounts collapsed.)
- `hitAreaMargins` on Separator. Hit-target is configured at Group level via `resizeTargetMinimumSize={{ coarse: 20, fine: 10 }}`.
- `onDragging` / `onFocus` / `onBlur` on Separator.
- `usePanelGroupContext` hook. Internal. Not exported.

If you import any of these, the build fails or runtime silently does nothing.

### The pixel-vs-percent rule (the most common silent regression)

In v3, `defaultSize={30}` meant 30%. **In v4, it means 30 pixels.** Use strings with explicit units:

```tsx
// ❌ WRONG — 30 pixels, not 30%. Your sidebar will be 30px wide.
<Panel defaultSize={30} minSize={10} />

// ✅ RIGHT — explicit percent
<Panel defaultSize="30%" minSize="10%" />

// ✅ ALSO RIGHT — explicit pixels (good for fixed sidebars)
<Panel defaultSize="240px" minSize="180px" />

// ✅ Mixed is fine; each prop is interpreted standalone
<Panel defaultSize="240px" minSize="20%" maxSize="50%" />
```

`SizeUnit` = `"px" | "%" | "em" | "rem" | "vh" | "vw"`.

---

## Decision tree

| You want… | Use this. |
|---|---|
| A simple 50/50 horizontal split with no persistence | Render `<Group>` directly from a Server Component with two `<Panel>`s and a `<Separator>`. No client wrapper needed. |
| Sizes remembered across reloads, SSR-correct first paint | Cookie pattern (recipe §3 below). Server reads cookie, passes `defaultLayout`, client wrapper writes on `onLayoutChanged`. |
| A button that hides/shows a sidebar and remembers prior width | `collapsible` + `collapsedSize="0%"` + `panelRef.current.collapse()/.expand()`. Library remembers automatically. (Recipe §4.) |
| Mount/unmount panels conditionally (not just collapse) | `useDefaultLayout({ id, panelIds })` with `panelIds` reflecting currently-mounted panels. (Recipe §5.) |
| VSCode-like layout (sidebar + editor + terminal + chat) | Nested groups (recipe §6). Each group has its own `id` and its own cookie. |
| Apple Mail / Notes layout (multi-sidebar) | Multiple collapsible panels in a single Group. (Recipe §7.) |
| Cross-component toggle (toolbar button hides a panel rendered far away) | Redux for the "is open" boolean → `useEffect` reads it and calls `panelRef.collapse()/.expand()`. Library still owns size. |
| Fullscreen one panel | `panel.resize("100%")` and `siblings.resize("0%")` via `groupRef.setLayout(...)`. Don't unmount. |

---

## §1 — API reference (verbatim from source)

### `<Group>` — replaces v3 `<PanelGroup>`

```tsx
import { Group, type GroupProps } from "react-resizable-panels";
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `id` | `string \| number` | `useId()` fallback | **Pass an explicit, stable `id` always.** Storage key uses it. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | (v3 was `direction`) |
| `defaultLayout` | `{ [panelId: string]: number }` (percentages 0..100) | undefined | Pair with `onLayoutChanged` for persistence. |
| `onLayoutChange` | `(layout) => void` | undefined | Fires every pointer move during drag. **Avoid for persistence — use the past-tense one.** |
| `onLayoutChanged` | `(layout) => void` | undefined | Fires on pointer-up. **Use this for cookie writes.** |
| `disableCursor` | `boolean` | false | Disables the global resize-cursor side effect. |
| `disabled` | `boolean` | false | Disables resize for the whole group. |
| `resizeTargetMinimumSize` | `{ coarse: number; fine: number }` | `{ coarse: 20, fine: 10 }` | Hit-target px for touch / mouse. |
| `groupRef` | `Ref<GroupImperativeHandle \| null>` | — | Imperative API. **Named prop, NOT React `ref`.** |
| `elementRef` | `Ref<HTMLDivElement \| null>` | — | Root `<div>` ref. |
| `className` / `style` | standard | — | `display`, `flex-direction`, `flex-wrap`, `overflow` are forced by the lib and CANNOT be overridden. |

### `<Panel>`

```tsx
import { Panel, type PanelProps } from "react-resizable-panels";
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `id` | `string \| number` | `useId()` fallback | **Pass an explicit, stable `id` always.** |
| `defaultSize` | `number \| string` | auto-distributed | Number = px. String without unit = percent. (`30` = 30px, `"30"` = 30%, `"30%"` = 30%, `"240px"` = 240px.) |
| `minSize` | `number \| string` | `"0%"` | Same unit rules. |
| `maxSize` | `number \| string` | `"100%"` | Same unit rules. |
| `collapsible` | `boolean` | false | Auto-collapses if dragged below `minSize`. Required for `panelRef.collapse()`. |
| `collapsedSize` | `number \| string` | `"0%"` | Size when collapsed. |
| `disabled` | `boolean` | false | Cannot be resized via pointer. **Imperative API still works.** |
| `groupResizeBehavior` | `"preserve-relative-size" \| "preserve-pixel-size"` | `"preserve-relative-size"` | When parent group resizes: keep ratio (default) or keep pixels. At least one panel per group must be `preserve-relative-size`. |
| `onResize` | `(next, id, prev) => void` | — | `next`/`prev` = `PanelSize` (`{ asPercentage, inPixels }`). `prev` is `undefined` on first mount. |
| `panelRef` | `Ref<PanelImperativeHandle \| null>` | — | **Named prop, NOT React `ref`.** |
| `elementRef` | `Ref<HTMLDivElement>` | — | Root `data-panel` div ref. |
| `className` / `style` | standard | — | **Applied to a NESTED inner div, not the outer `data-panel` div.** Target outer with `[data-panel]` selector or `elementRef`. |

### `<Separator>` — replaces v3 `<PanelResizeHandle>`

```tsx
import { Separator, type SeparatorProps } from "react-resizable-panels";
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `id` | `string \| number` | `useId()` fallback | |
| `disabled` | `boolean` | false | Direct resize disabled (neighbors may still resize indirectly). |
| `disableDoubleClick` | `boolean` | false | Disables 4.5.0+ double-click-to-reset behavior. |
| `elementRef` | `Ref<HTMLDivElement>` | — | |
| `className` / `style` | standard | — | `flex-grow`, `flex-shrink` cannot be overridden. |

The library renders `role="separator"`, `aria-controls`, `aria-orientation`, `aria-valuemin/max/now`, plus `data-separator="default" | "hover" | "dragging" | "focus"`. Style off `data-separator=*`, not pseudo-classes.

**Required CSS for any custom Separator** (you WILL hit this in dark mode otherwise):

```tsx
<Separator
  className={[
    "w-0.5 bg-border transition-colors cursor-col-resize",
    "focus:outline-none",                        // kill the browser's default focus outline
    "data-[separator=hover]:bg-primary",
    "data-[separator=focus]:bg-primary",         // after click — keep the primary color, not the browser outline
    "data-[separator=dragging]:bg-primary",
  ].join(" ")}
/>
```

The library sets `tabIndex={0}` on the Separator, so clicking it focuses it. Without `focus:outline-none` the browser draws its default focus outline — a 1px near-white line in the center — which looks correct in light mode but stands out hard in dark mode. **Always set `focus:outline-none` and explicitly style all four `data-separator` states** (`default` is the inherited `bg-border`; the other three should at minimum match `hover`). Style `data-separator=focus` separately, not just `data-separator=hover`, or you'll get a "click reveals a bright line" bug.

If you don't want to type this every time, use the project wrapper at [`components/ui/resizable.tsx`](../../../components/ui/resizable.tsx) — `ResizableHandle` already does it.

### Imperative handles

```tsx
interface PanelImperativeHandle {
  collapse(): void;                  // no-op if not collapsible OR already collapsed
  expand(): void;                    // restores pre-collapse size automatically (falls back to minSize, then 1)
  getSize(): { asPercentage: number; inPixels: number };
  isCollapsed(): boolean;            // returns false for non-collapsible panels even at size 0
  resize(size: number | string): void; // accepts "30%" / "200px" / "1rem" / etc.
}

interface GroupImperativeHandle {
  getLayout(): { [panelId: string]: number };           // percentages 0..100
  setLayout(layout: { [panelId: string]: number }): Layout; // returns post-validation layout
}
```

All methods are **synchronous**. Safe in event handlers and effects. **No-op if called during render** (the ref holds a stub until first layout effect runs).

### Hooks — the full export list

```tsx
import {
  Group, Panel, Separator,
  useDefaultLayout,        // SSR/persistence helper
  useGroupRef,             // = useRef<GroupImperativeHandle | null>(null) — type sugar
  useGroupCallbackRef,     // callback-ref form
  usePanelRef,             // = useRef<PanelImperativeHandle | null>(null) — type sugar
  usePanelCallbackRef,     // callback-ref form
  isCoarsePointer,         // utility
} from "react-resizable-panels";
```

There is **no `usePanelGroupContext`**. Don't import it.

---

## §2 — The smallest possible example (no persistence)

A 2-panel split. **Renders directly from a Server Component** — no `'use client'` wrapper needed because no callback props.

```tsx
// app/(ssr)/ssr/demos/resizables/00-baseline/page.tsx
// SERVER COMPONENT. No 'use client'.
import { Group, Panel, Separator } from "react-resizable-panels";

export default function Page() {
  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-hidden">
      <Group id="demo-baseline" orientation="horizontal" className="h-full w-full">
        <Panel id="left" defaultSize="50%" minSize="20%">
          <div className="h-full p-4">Left</div>
        </Panel>
        <Separator className="w-0.5 bg-border" />
        <Panel id="right" defaultSize="50%" minSize="20%">
          <div className="h-full p-4">Right</div>
        </Panel>
      </Group>
    </div>
  );
}
```

Why this works as SSR: `Group`/`Panel`/`Separator` all carry their own `'use client'` directive in the library. RSC composition allows server components to instantiate client components and pass server-rendered children. We don't pass any function props, so nothing crosses the boundary that can't be serialized.

---

## §3 — Cookie-backed SSR persistence (the canonical pattern)

**This is the pattern for 99% of real layouts.** Server reads cookie → passes `defaultLayout` to a client wrapper → wrapper writes the cookie on `onLayoutChanged`.

### Server component (the page)

```tsx
// app/(ssr)/ssr/demos/resizables/01-cookie-ssr/page.tsx
import { cookies } from "next/headers";
import { Panel, Separator, type Layout } from "react-resizable-panels";
import { ClientGroup } from "./ClientGroup";

const GROUP_ID = "demo-01";
const COOKIE_NAME = `panels:${GROUP_ID}`;

async function readLayoutCookie(): Promise<Layout | undefined> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Layout;
  } catch {
    return undefined;
  }
}

export default async function Page() {
  const defaultLayout = await readLayoutCookie();
  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-hidden">
      <ClientGroup
        id={GROUP_ID}
        cookieName={COOKIE_NAME}
        defaultLayout={defaultLayout}
        className="h-full w-full"
      >
        <Panel id="left"   defaultSize="20%" minSize="10%">…</Panel>
        <Separator className="w-0.5 bg-border" />
        <Panel id="center" defaultSize="60%" minSize="30%">…</Panel>
        <Separator className="w-0.5 bg-border" />
        <Panel id="right"  defaultSize="20%" minSize="10%">…</Panel>
      </ClientGroup>
    </div>
  );
}
```

### Client wrapper

```tsx
// app/(ssr)/ssr/demos/resizables/01-cookie-ssr/ClientGroup.tsx
"use client";

import { Group, type GroupProps } from "react-resizable-panels";

type Props = Omit<GroupProps, "onLayoutChange" | "onLayoutChanged"> & {
  cookieName: string;
};

export function ClientGroup({ cookieName, ...props }: Props) {
  return (
    <Group
      {...props}
      onLayoutChanged={(layout) => {
        document.cookie =
          `${cookieName}=${encodeURIComponent(JSON.stringify(layout))}` +
          `; path=/; max-age=31536000; SameSite=Lax`;
      }}
    />
  );
}
```

### Why each piece matters

- **Server reads cookie, passes `defaultLayout`.** Server output already has the persisted sizes baked into flex-grow values. No flash on first paint.
- **`onLayoutChanged` (past tense), not `onLayoutChange`.** Past tense fires on pointer-up. Present tense fires every mousemove → cookie write storm. (Past tense was added in 4.4.0.)
- **Stable explicit `id`** on Group AND every Panel. Without explicit ids the library uses `useId()` — hydration-stable but volatile across navigations, so persistence silently breaks.
- **Wrapper is `'use client'`** because `onLayoutChanged` is a function and functions can't cross the RSC boundary. The wrapper is the thinnest possible client component.
- **Server component children of `<Panel>` are fine.** Pass `<ServerSidebar />` etc. as `children` — RSC composition allows it.

---

## §4 — Show/hide a panel that remembers its prior size

**The library handles size memory automatically.** Do NOT add `useState` to track the previous width. Do NOT add a `useRef` to capture it before collapse. The library stores it in the panel's internal `expandToSize` and `expand()` reads it back.

```tsx
"use client";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";

export function ToggleSidebar() {
  const sidebarRef = usePanelRef();

  const toggle = () => {
    const panel = sidebarRef.current;
    if (!panel) return;
    panel.isCollapsed() ? panel.expand() : panel.collapse();
  };

  return (
    <>
      <button onClick={toggle}>Toggle</button>
      <Group id="root">
        <Panel
          id="sidebar"
          panelRef={sidebarRef}
          collapsible
          collapsedSize="0%"
          defaultSize="240px"
          minSize="180px"
        >
          <Sidebar />
        </Panel>
        <Separator />
        <Panel id="main"><Main /></Panel>
      </Group>
    </>
  );
}
```

That's the entire pattern. No state, no effects, no refs to capture sizes. The library does it.

If you need the toggle from a button **rendered far away** (toolbar in a different subtree), put the boolean in Redux and use one effect to drive the panel:

```tsx
"use client";
import { useEffect } from "react";
import { useAppSelector } from "@/lib/redux/hooks";

function SidebarPanel() {
  const sidebarRef = usePanelRef();
  const isOpen = useAppSelector((s) => s.layout.sidebarOpen);

  useEffect(() => {
    const panel = sidebarRef.current;
    if (!panel) return;
    if (isOpen && panel.isCollapsed()) panel.expand();
    if (!isOpen && !panel.isCollapsed()) panel.collapse();
  }, [isOpen]);

  return <Panel id="sidebar" panelRef={sidebarRef} collapsible collapsedSize="0%" defaultSize="240px" />;
}
```

The Redux value is the "intent." The library still owns the size. Don't put the size in Redux — that's drift waiting to happen.

---

## §5 — Conditional panels (mount/unmount, not just collapse)

If a panel can be **fully removed from the DOM** (not collapsed to zero), each combination of mounted panels gets its own remembered layout via `useDefaultLayout({ id, panelIds })`.

```tsx
"use client";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";

export function Workbench({ showLeft, showRight }: Props) {
  const panelIds = [
    ...(showLeft ? ["left"] : []),
    "center",
    ...(showRight ? ["right"] : []),
  ];
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "workbench",
    panelIds,
    storage: cookieStorage, // see below
  });

  return (
    <Group id="workbench" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
      {showLeft && <><Panel id="left" minSize="160px"><Left /></Panel><Separator /></>}
      <Panel id="center"><Editor /></Panel>
      {showRight && <><Separator /><Panel id="right" minSize="240px"><Right /></Panel></>}
    </Group>
  );
}
```

Storage key format (from library source): `react-resizable-panels:${groupId}:${...sortedPanelIds}`. Each `panelIds` permutation gets its own key, so toggling the right panel off and on again restores the same layout you had last time it was visible.

Cookie storage adapter (works with `useDefaultLayout`):

```ts
import type { LayoutStorage } from "react-resizable-panels";

export const cookieStorage: LayoutStorage = {
  getItem(key) {
    if (typeof document === "undefined") return null;
    const row = document.cookie.split("; ").find((r) => r.startsWith(`${encodeURIComponent(key)}=`));
    return row ? decodeURIComponent(row.split("=")[1]) : null;
  },
  setItem(key, value) {
    if (typeof document === "undefined") return;
    document.cookie =
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}` +
      `; path=/; max-age=31536000; SameSite=Lax`;
  },
};
```

Note: `useDefaultLayout` only runs on the client (it's in a `'use client'` component). For SSR-correct first paint with conditional panels, also pass an explicit `defaultLayout` from cookies in the server page (read the cookie matching the same storage key).

---

## §6 — VSCode-style nested layout

```tsx
"use client";
import { Group, Panel, Separator } from "react-resizable-panels";

export function VSCodeShell() {
  return (
    <Group id="root" orientation="horizontal" className="h-dvh">
      <Panel id="activity-bar" defaultSize="48px" minSize="48px" maxSize="48px">
        <ActivityBar />
      </Panel>
      <Separator disabled />

      <Panel id="sidebar" defaultSize="240px" minSize="180px" collapsible collapsedSize="0%">
        <Sidebar />
      </Panel>
      <Separator />

      <Panel id="main" minSize="40%">
        <Group id="main-vertical" orientation="vertical">
          <Panel id="editor" minSize="20%"><Editor /></Panel>
          <Separator />
          <Panel id="terminal" defaultSize="30%" collapsible collapsedSize="0%">
            <Terminal />
          </Panel>
        </Group>
      </Panel>
      <Separator />

      <Panel id="chat" defaultSize="320px" minSize="240px" collapsible collapsedSize="0%">
        <Chat />
      </Panel>
    </Group>
  );
}
```

Rules for nesting:
- Each `<Group>` needs its own stable `id` (and therefore its own cookie).
- Panels and Separators must be **direct DOM children of their Group**. Never wrap them in a `<div>`. (TSDoc spec.)
- A nested Group goes **inside** a parent Panel's children, not as a sibling of other Panels.
- For the immovable activity-bar pattern, set `defaultSize=minSize=maxSize` to the same pixel value AND mark the adjacent `<Separator disabled />`.

---

## §7 — Apple Mail / Notes multi-sidebar layout

```tsx
"use client";
import { Group, Panel, Separator } from "react-resizable-panels";

export function MailShell() {
  return (
    <Group id="mail" orientation="horizontal" className="h-dvh">
      <Panel id="folders"  defaultSize="200px" minSize="160px" collapsible collapsedSize="0%"><Folders /></Panel>
      <Separator />
      <Panel id="messages" defaultSize="300px" minSize="220px" collapsible collapsedSize="0%"><Messages /></Panel>
      <Separator />
      <Panel id="reader"   minSize="40%"><Reader /></Panel>
      <Separator />
      <Panel id="inspector" defaultSize="280px" minSize="200px" collapsible collapsedSize="0%"><Inspector /></Panel>
    </Group>
  );
}
```

Each separator is independent — pulling separator B doesn't move separator A. Each collapsible panel remembers its own pre-collapse size.

---

## §8 — Pitfalls (numbered for fast scanning during code review)

1. **Don't add `useState` to track sizes.** The library is the source of truth. If you need the current size, read it from `onResize`, `onLayoutChanged`, or `panel.getSize()` in an event handler. A second source will drift during fast drags.
2. **Don't add `useRef` + `useEffect` to read sizes.** No `setInterval`, no `ResizeObserver`. `onLayoutChanged` and `onResize` already give you the values.
3. **Don't add a state to remember "previous size before collapse."** `panel.collapse()` stores it; `panel.expand()` restores it. Adding your own `lastSize` state is duplication.
4. **Don't put `key` props on Group or Panel that change on re-render.** Changing `key` remounts → re-registration with new identity → drops in-memory layout → resets persistence. Swap the `children`, not the panel.
5. **Don't wrap `<Panel>` or `<Separator>` in extra `<div>`s.** They must be direct DOM children of their Group. Wrap **inside** the Panel instead.
6. **Don't import v3 names** (`PanelGroup`, `PanelResizeHandle`, `MixedSizes`, `ImperativePanelHandle`, `ImperativePanelGroupHandle`). Build will fail.
7. **Don't pass bare numbers and assume percent.** `defaultSize={30}` = 30 pixels. Use `"30%"`.
8. **Don't pass `onLayoutChanged` (or any function prop) on `<Group>` from a Server Component.** Functions can't cross the RSC boundary. Use a `'use client'` wrapper (recipe §3).
9. **Don't call imperative API methods during render.** The ref holds a no-op stub until first layout effect runs. Call from event handlers / effects.
10. **Don't use `localStorage` for SSR.** It's undefined on the server → mismatch on hydration. Use the cookie storage adapter (§5) or an explicit `defaultLayout` cookie read.
11. **Don't omit `id` on Group or Panel.** Falls back to `useId()` — works for the current page but breaks persistence across navigations and clobbers other groups' storage.
12. **Don't rely on `Layout` being an array.** v4 layout is `{ [panelId: string]: number }`. v3-shaped persisted data needs migration (the `useDefaultLayout` hook does it automatically via `readLegacyLayout`; if you wrote your own persistence in v3, migrate manually).
13. **`Panel`'s `className`/`style` apply to a NESTED inner div, not the outer `data-panel` div.** Target the outer with `[data-panel]` selector or `elementRef`.
14. **Don't expect `onCollapse`/`onExpand`.** Removed in v4. Detect transitions in `onResize` by comparing `prev.asPercentage` to `next.asPercentage`.
15. **Don't forget `focus:outline-none` on a custom Separator.** The library sets `tabIndex={0}`, so clicking the separator focuses it; without that class the browser paints a near-white default outline that's invisible in light mode but jarring in dark mode. Style all four `data-separator` states (`default`/`hover`/`focus`/`dragging`), not just `hover`. See §1 for the canonical class list, or use the project wrapper.

---

## §9 — Project conventions (this codebase)

- **Theme-styled wrappers exist.** Prefer importing `ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle` from [`@/components/ui/resizable`](../../../components/ui/resizable.tsx) when you want the standard handle styling and theme-aware focus rings. They're thin v4-aware wrappers around `Group`/`Panel`/`Separator` and they're already `'use client'`.
- **For SSR-first pages**, render `<Group>` directly (it carries its own `'use client'`) or use a hand-written `'use client'` wrapper when you need callbacks. The shadcn wrapper is always client; if you mount it from a Server Component, you cannot pass `onLayoutChanged` from the server side.
- **Cookie naming convention:** `panels:${groupId}` (e.g. `panels:demo-01`, `panels:vscode-shell`). Keep all panel-layout cookies under the `panels:` namespace so they're easy to clear and find in devtools.
- **Layout state lives in Redux only when** a non-adjacent component needs to toggle a panel (toolbar button → panel rendered elsewhere). Keep only the *intent* (boolean isOpen) in Redux; let the library own the *size*.
- **Window Panels (overlays) are a different system.** [`features/window-panels/`](../../../features/window-panels/) is for floating windows, modals, sheets, drawers — overlays. `react-resizable-panels` is for split-pane layouts. Don't mix them.
- **Page wrapper convention:** `<div className="h-[calc(100dvh-var(--header-height))] overflow-hidden">` — sets full viewport height minus the 2.5rem header, hides overflow so child scrolls are contained.
- **Mobile:** resizable panels collapse poorly on phones. Use `useIsMobile()` and swap to a stacked layout or drawer on mobile widths. (Pattern documented per CLAUDE.md "NEVER tabs on mobile, NEVER nested scrolling.")
- **Demos that prove every pattern in this skill:** [`app/(ssr)/ssr/demos/resizables/`](../../../app/(ssr)/ssr/demos/resizables/). Refer to a demo whose route name matches your task before writing new code.

---

## §10 — Quick TypeScript reference (verbatim from `lib/index.ts`)

```ts
import type {
  GroupProps,
  GroupImperativeHandle,
  Layout,                 // { [panelId: string]: number }   — percentages 0..100
  LayoutStorage,          // Pick<Storage, "getItem" | "setItem">
  OnGroupLayoutChange,
  Orientation,            // "horizontal" | "vertical"
  PanelProps,
  PanelImperativeHandle,
  PanelSize,              // { asPercentage: number; inPixels: number }
  OnPanelResize,
  SizeUnit,               // "px" | "%" | "em" | "rem" | "vh" | "vw"
  SeparatorProps,
} from "react-resizable-panels";
```

`MixedSizes` is **not** exported in v4. The replacement is `PanelSize`.
`ImperativePanelHandle` / `ImperativePanelGroupHandle` are **not** exported. Use `PanelImperativeHandle` / `GroupImperativeHandle`.

---

## §11 — Pre-commit self-check (mental walkthrough before opening a PR)

- [ ] No `PanelGroup`, `PanelResizeHandle`, `MixedSizes`, `ImperativePanelHandle` imports.
- [ ] No `direction=`, `autoSaveId=`, `onCollapse=`, `onExpand=`, `order=`, `defaultCollapsed=`.
- [ ] All `defaultSize`, `minSize`, `maxSize`, `collapsedSize` for percent values use `"X%"` strings.
- [ ] Every `<Group>` has an explicit, stable `id`.
- [ ] Every `<Panel>` has an explicit, stable `id`.
- [ ] No `useState` mirroring panel sizes.
- [ ] No `useEffect` reading sizes from refs.
- [ ] No `useState`/`useRef` capturing pre-collapse size — use `panel.collapse()`/`expand()`.
- [ ] `onLayoutChanged` (past tense) used for persistence, not `onLayoutChange`.
- [ ] If SSR: cookie path used (server reads → `defaultLayout` → client wrapper writes). NOT `localStorage`.
- [ ] No `<div>` between `<Group>` and `<Panel>` / `<Separator>`.
- [ ] If using imperative API across the tree: Redux holds intent (boolean), one effect drives `panelRef`. Size stays in the library.
- [ ] Custom Separator has `focus:outline-none` AND explicit styling for `data-[separator=hover|focus|dragging]` (not just `hover`).

---

## §12 — Source citations (verify when in doubt)

- npm latest: <https://registry.npmjs.org/react-resizable-panels/latest>
- Exports: <https://raw.githubusercontent.com/bvaughn/react-resizable-panels/main/lib/index.ts>
- `Group` types: <https://raw.githubusercontent.com/bvaughn/react-resizable-panels/main/lib/components/group/types.ts>
- `Panel` types: <https://raw.githubusercontent.com/bvaughn/react-resizable-panels/main/lib/components/panel/types.ts>
- `Separator` types: <https://raw.githubusercontent.com/bvaughn/react-resizable-panels/main/lib/components/separator/types.ts>
- Imperative methods: <https://raw.githubusercontent.com/bvaughn/react-resizable-panels/main/lib/global/utils/getImperativePanelMethods.ts>
- Storage key fn: <https://raw.githubusercontent.com/bvaughn/react-resizable-panels/main/lib/components/group/auto-save/getStorageKey.ts>
- Next.js cookie integration page: <https://github.com/bvaughn/react-resizable-panels/tree/main/integrations/next/app>
- v3→v4 migration (CHANGELOG): <https://github.com/bvaughn/react-resizable-panels/blob/main/CHANGELOG.md> (search `# 4.0.0`)

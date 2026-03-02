# SSR Shell — Developer Guide

Rules and patterns for building routes inside `app/(ssr)/`. Read this completely before writing any code.

---

## Architecture Overview

The shell is a **server-rendered, glassmorphic application frame** that never unmounts during navigation. It uses **zero client-side JavaScript** for structural layout. Interactive features are isolated into tiny client islands that lazy-load on demand.

```
app/(ssr)/
  layout.tsx          ← Server: auth, grid shell, sidebar, header, dock
  shell.css           ← All shell CSS (glass tokens, grid, animations)
  nav-data.ts         ← Pure data: nav items, dock items, icon color map
  _components/        ← Shell components (Header, Sidebar, MobileDock, etc.)
  ssr/
    notes/            ← Reference route — follow this pattern exactly
    [your-route]/     ← Your new route goes here
```

---

## Core Rules

### 1. Server Components by Default

Every component is a server component unless it absolutely needs browser APIs. Mark client components with `"use client"` only when required (event handlers, hooks, browser APIs).

### 2. Lite Store — No Full Redux, No Entity System

The `(ssr)` shell uses `LiteStoreProvider` — a lightweight Redux store with 13 slices and **zero middleware** (no sagas, no socket.io, no entity system). The store wraps only `children` inside `<main>`, not the shell chrome.

**Available slices (all start empty, hydrate on demand):**
- `user`, `userPreferences` — pre-populated from server at hydration time
- `adminPreferences`, `adminDebug` — admin tools (lazy, only meaningful for admin users)
- `layout`, `theme`, `overlays` — core UI state
- `canvas` — canvas panel state
- `promptCache`, `promptRunner`, `promptExecution`, `actionCache` — prompt system
- `modelRegistry` — AI model list (dispatch `fetchAvailableModels()` to hydrate)
- `sms` — SMS conversations

**Client islands can use Redux hooks:**
```tsx
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
const userId = useAppSelector(state => state.user.id);
const prefs = useAppSelector(state => state.userPreferences);
```

**NOT available (requires full store):**
- `entities`, `globalCache` — entity CRUD system (134 slices + 108K schema)
- `socketConnections`, `socketResponse`, `socketTasks` — socket.io
- `broker`, `workflows` — saga-dependent
- `fileSystem`, `appBuilder` — feature-specific heavy systems

If you need entity system or socket.io, that route belongs in `(authenticated)`, not `(ssr)`.

**Shell chrome still uses props, not Redux.** The Header, Sidebar, MobileDock, and MobileSideSheet are server components that receive data as props from the layout. They do not read from the store.

**Data access patterns:**
- **Server-side:** `import { createClient } from '@/utils/supabase/server'`
- **Client-side:** `import { supabase } from '@/utils/supabase/client'`
- **Server actions:** `import { someAction } from '@/actions/...'`

### 3. The Glass Rule — No Solid Backgrounds in the Chrome

The header and dock are **always transparent**. Content scrolls behind them. Glass is additive — it only works when the layers below are also transparent.

**NEVER** use on any element in the shell chrome flow:
- `bg-background`, `bg-card`, `bg-white`, `bg-zinc-*` (solid)
- Any `rgba` with alpha > 0.7 on a full-bleed element

**ALWAYS** use for route-level panels and surfaces:
- `bg-card/60` with `backdrop-blur-xl` (semi-transparent)
- `bg-transparent` or no background on main content areas
- `bg-accent/60` or lower for interactive elements

**For floating elements** (popups, context menus, dropdowns):
- `bg-[var(--shell-glass-bg)]` with `backdrop-blur-[20px] saturate-[1.5] border border-[var(--shell-glass-border)]`

**How to verify:** If the header/dock backgrounds look solid instead of blurred glass, you've introduced a solid background somewhere. Find it and make it transparent.

### 4. CSS-Only Shell State

Shell state (sidebar expanded/collapsed, mobile menu open/closed) is driven entirely by CSS `:has()` selectors on hidden checkboxes. No React state, no JavaScript.

```
#shell-sidebar-toggle  → .shell-root:has(#shell-sidebar-toggle:checked) ...
#shell-mobile-menu     → .shell-root:has(#shell-mobile-menu:checked) ...
```

Never add JavaScript to toggle these. Use `<label htmlFor="shell-sidebar-toggle">`.

### 5. Client Islands — Small, Lazy, Independent

Client-side interactivity must be isolated into small, lazy-loaded islands. The shell frame renders instantly from the server.

```tsx
import dynamic from "next/dynamic";
const HeavyFeature = dynamic(() => import("./HeavyFeature"), {
  ssr: false,
  loading: () => null,
});
```

**Every client component must:**
- Be loadable independently (no shared global state)
- Not block initial page render
- Not cause the shell to re-render during navigation

### 6. URL-Based State with pushState

Use `window.history.pushState()` for client-side state changes that don't need a server round-trip. Read state from `usePathname()` and `useSearchParams()`.

```tsx
// Navigate without server request:
window.history.pushState({}, "", `/ssr/notes/${noteId}?tabs=a,b,c`);

// Update query params in-place:
window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
```

Never use `router.push()` for in-route state — it triggers unnecessary server requests. Use `next/link` `<Link>` only for cross-route navigation.

### 7. Header Center Injection via Portal

Routes can inject controls into the header's center zone using `createPortal`. Target: `id="shell-header-center"`.

```tsx
const [headerCenter, setHeaderCenter] = useState<HTMLElement | null>(null);
useEffect(() => {
  setHeaderCenter(document.getElementById("shell-header-center"));
}, []);

{headerCenter && createPortal(
  <div className="shell-glass rounded-full px-1 py-0.5 flex items-center gap-0.5">
    {/* Your controls — use shell glass tokens */}
  </div>,
  headerCenter,
)}
```

Portal content must use glass tokens, never solid backgrounds.

### 8. Cross-Component Communication via Custom Events

For state sync between sibling client components (e.g., workspace saves a note, sidebar updates), use `CustomEvent` on `window`.

```tsx
// Dispatch:
window.dispatchEvent(new CustomEvent("notes:labelChange", {
  detail: { noteId, label },
}));

// Listen:
useEffect(() => {
  const handler = (e: Event) => {
    const { noteId, label } = (e as CustomEvent).detail;
  };
  window.addEventListener("notes:labelChange", handler);
  return () => window.removeEventListener("notes:labelChange", handler);
}, []);
```

Namespace events with `module:action` (e.g., `notes:created`, `notes:deleted`, `notes:moved`).

---

## Performance Architecture

### Server-Side Data, Client-Side Surgery

All layout structure and initial data are server-rendered. Client components are **pushed down** into the smallest possible scope — they handle only the interactive behavior, never layout.

**Pattern:** The server `layout.tsx` fetches data and renders the structural grid. Client components receive **serializable data via props** and manage local state only.

```tsx
// layout.tsx — Server component owns structure + data
export default async function FeatureLayout({ children }) {
  const supabase = await createClient();
  const { data } = await supabase.from("items").select("id, label, folder");

  return (
    <div className="feature-root">
      <aside className="feature-sidebar">
        <Suspense><SidebarClient items={data ?? []} /></Suspense>
      </aside>
      <div className="feature-content">
        <Suspense><WorkspaceClient items={data ?? []} /></Suspense>
        <div style={{ display: "none" }}>{children}</div>
      </div>
    </div>
  );
}
```

### Lightweight Data Shapes

When fetching data for sidebar/list views, **never fetch content or heavy fields**. Create a lightweight interface:

```tsx
// Only the fields needed for the sidebar list — no `content` column
export interface ItemSummary {
  id: string;
  label: string;
  folder_name: string;
  tags: string[];
  updated_at: string;
}
```

Content is fetched **on demand** by the client component when the user opens an item. This keeps the server response fast and the initial HTML small.

### Persistent Workspace via Layout + Null Pages

For routes with multi-item views (tabs, panels), place the workspace component **in the layout** so it never unmounts when the URL changes. Use **null page stubs** purely for route matching:

```tsx
// page.tsx — Route stub
export default function FeaturePage() { return null; }

// [itemId]/page.tsx — Route stub
export default function ItemPage() { return null; }
```

The workspace reads `usePathname()` and `useSearchParams()` to know which item is active and which tabs are open. It manages its own in-memory cache (`Map<id, CachedItem>`) for instant switching between tabs without refetching.

### Client-Side Caching + Background Refresh

- **First open:** fetch content from Supabase, cache in a `Map`
- **Subsequent opens:** serve from cache instantly, background-refresh if stale (>30s)
- **Auto-save:** debounced writes (1.5s) with optimistic local state, conflict detection when server data changes during editing

---

## Mobile Design Philosophy

The mobile experience maximizes usable content space through three key techniques:

### Transparent Glass Header + Footer (Content Scrolls Behind)

On mobile, the header and dock are **totally transparent glass**. All content scrolls freely behind them. This eliminates wasted vertical space that fixed solid bars would consume.

To achieve this, `.shell-main` uses:
```css
margin-top: calc(-1 * var(--shell-header-h));
padding-top: var(--shell-header-h);
```

So content starts under the header and scrolls behind it. The same principle applies to route-specific fixed bars.

### Floating, Hovering UI — Nothing Pinned Inline

On mobile, action bars and controls **float over content** instead of being stacked above/below it. They are `position: fixed` and use glass styling:

```css
.notes-sidebar .notes-search-bar {
  position: fixed;
  top: var(--shell-header-h);
  left: var(--shell-dock-mx);
  right: var(--shell-dock-mx);
  z-index: 40;
}
```

Things that would normally stack (toolbar, tabs, actions) are moved to the main header via portal, placed in a more-options bottom sheet, or hidden entirely on mobile.

### Bottom Sheets Instead of Menus/Dialogs

On mobile, context menus and option lists must use **bottom sheets**, not popups or dialogs. Position above the dock:

```tsx
<div className="fixed inset-x-3 z-50 rounded-2xl p-2 bg-(--shell-glass-bg) backdrop-blur-[20px] saturate-[1.5] border border-(--shell-glass-border) shadow-2xl bottom-[calc(var(--shell-dock-h)+var(--shell-dock-bottom)+env(safe-area-inset-bottom,0px)+0.5rem)]">
  {/* Sheet content */}
</div>
```

### CSS `:has()` for Layout Switching

Use `:has()` selectors on the route root to toggle between mobile views (e.g., list vs. detail) without JavaScript:

```css
/* Hide sidebar when detail is active */
.feature-root:has(.detail-active) .feature-sidebar { display: none; }

/* Show content panel only when detail is active */
.feature-root:not(:has(.detail-active)) .feature-content { display: none; }
```

Apply a CSS class (e.g., `.detail-active`) to the rendered detail component. The CSS reacts automatically — no state management needed.

---

## Tap Target Pattern — Invisible Hit Areas

Buttons must meet the 44px minimum tap target but should **look small and clean**. Achieve this with an invisible outer wrapper and a small visible glass pill inside:

```css
/* Invisible 44px hit area */
.feature-tap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;    /* 44px */
  height: 2.75rem;
  flex-shrink: 0;
}
```

```tsx
<div className="feature-tap">
  <button className="flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full shell-glass shell-tactile text-muted-foreground [&_svg]:w-3.5 [&_svg]:h-3.5">
    <Icon />
  </button>
</div>
```

The outer `div` is the tap target (invisible, no background). The inner `button` is the visible glass pill (30px). The **gap between buttons emerges naturally** from the invisible wrapper — no explicit `gap` needed. This satisfies accessibility while keeping the UI tight and professional.

On desktop, collapse the wrapper so buttons are their natural compact size:

```css
@media (min-width: 1024px) {
  .feature-tap {
    width: auto;
    height: auto;
  }
  .feature-tap button {
    width: 1.375rem !important;
    height: 1.375rem !important;
  }
}
```

**Buttons never show text labels.** Icons only, with `title` and `aria-label` for accessibility.

---

## Desktop Design — VSCode-Style Compactness

On desktop (≥1024px), the layout should feel like a professional IDE — maximum space efficiency, small icons, small text, no wasted chrome.

### Compact Toolbar Heights

Desktop toolbars and search bars use reduced heights (`1.875rem` not `2.75rem`). The CSS scopes this with `@media (min-width: 1024px)`:

```css
@media (min-width: 1024px) {
  .feature-search-bar { height: 1.875rem; gap: 0.125rem; padding: 0 0.5rem; }
  .feature-search-input-wrap input { height: 1.375rem !important; font-size: 0.75rem !important; }
}
```

### VSCode-Style Tabs

Desktop routes with multi-item views use compact tabs with rounded top corners, merging into the content panel:

```css
@media (min-width: 1024px) {
  .feature-tab-bar .group {
    border-radius: 7px 7px 0 0;
    border-top: 1px solid hsl(var(--border));
    border-left: 1px solid hsl(var(--border));
    border-right: 1px solid hsl(var(--border));
    margin-bottom: -1px; /* seals over bar's bottom border */
  }
  .feature-tab-bar .group[data-active="true"] {
    border-bottom: 1px solid hsl(var(--card));
    background-color: hsl(var(--card));
  }
}
```

The active tab includes an inline editable title and action icons (save, duplicate, share, delete).

### Text Sizing Hierarchy

| Context          | Size                    |
|------------------|-------------------------|
| Folder header    | `text-[0.6875rem]` uppercase tracking-wider |
| Note item        | `text-xs` (0.75rem)     |
| Tab label        | `text-[0.6875rem]`      |
| Status bar       | `text-[0.625rem]`       |
| Timestamps       | `text-[0.625rem]` tabular-nums |
| Editor content   | `text-sm` leading-[1.7] |

---

## Skeleton Loading

When content is loading, render a **shimmer skeleton** — not a spinner. Use staggered width lines with a pulse animation:

```tsx
{[40, 80, 65, 90, 50, 75].map((w, i) => (
  <div
    key={i}
    className="feature-skeleton-line h-3.5 rounded bg-muted"
    style={{ width: `${w}%` }}
  />
))}
```

```css
@keyframes feature-shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
.feature-skeleton-line {
  animation: feature-shimmer 1.5s ease-in-out infinite;
}
.feature-skeleton-line:nth-child(2) { animation-delay: 0.1s; }
.feature-skeleton-line:nth-child(3) { animation-delay: 0.2s; }
/* ... stagger each child */
```

---

## CSS Token Reference

### Glass Tokens

| Token | Usage |
|---|---|
| `var(--shell-glass-bg)` | Default glass background |
| `var(--shell-glass-bg-hover)` | Hover state |
| `var(--shell-glass-bg-active)` | Active/pressed/selected state |
| `var(--shell-glass-border)` | Border color |
| `var(--shell-glass-shadow)` | Subtle shadow |
| `var(--shell-glass-shadow-lg)` | Elevated shadow |

### Glass CSS Classes

| Class | Effect |
|---|---|
| `.shell-glass` | Full glass node: bg + blur + border + shadow + hover/active |
| `.shell-glass-dock` | Dock-specific glass (higher blur, stronger bg) |
| `.shell-glass-sheet` | Side sheet glass |
| `.shell-active-pill` | Active route indicator with View Transitions |
| `.shell-tactile` | iOS hover/active scale (1.05 / 0.95) |
| `.shell-tactile-subtle` | Subtle scale (1.02 / 0.98) for nav items |

### Layout Variables

| Variable | Value | Usage |
|---|---|---|
| `--shell-header-h` | `2.75rem` | Header height |
| `--shell-sidebar-w` | `2.75rem` | Collapsed sidebar width |
| `--shell-sidebar-w-expanded` | `13rem` | Expanded sidebar width |
| `--shell-dock-h` | `3.75rem` | Dock height |
| `--shell-dock-bottom` | `0.625rem` | Dock bottom offset |
| `--shell-dock-mx` | `0.5rem` | Dock horizontal margin |

### Nav Colors

| Token | Usage |
|---|---|
| `var(--shell-nav-text)` | Default nav text |
| `var(--shell-nav-text-hover)` | Hovered nav text |
| `var(--shell-nav-icon)` | Default icon color |
| `var(--shell-nav-icon-hover)` | Hovered icon color |
| `var(--shell-pill-bg/border/text)` | Active route pill |

---

## Scrollbar Rules

All scrollable elements inherit auto-hiding thin scrollbars. For module-specific scrollable areas:

```css
.your-scrollable {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.your-scrollable:hover {
  scrollbar-color: hsl(var(--muted-foreground) / 0.15) transparent;
}
```

Scrollbars must be: thin (3-4px), transparent by default, visible only on hover.

---

## Mobile Rules

### Breakpoints

- Desktop: `min-width: 1024px` (`lg:`)
- Mobile: `max-width: 1023px` (`max-lg:`)

### Required on Mobile

- Dock bottom padding: `calc(var(--shell-dock-h) + var(--shell-dock-bottom) + 1rem + var(--shell-safe-area-bottom))`
- Fixed-position dropdowns must position above the dock
- Input font-size must be >= 16px to prevent iOS zoom
- Content must scroll behind the transparent header — no wasted vertical space
- All bars/toolbars must float over content, not stack inline

### Forbidden on Mobile

- **Never use `Dialog`** — use drawer/bottom sheet
- **Never use split view** — hide with `max-lg:hidden`
- **Never use `h-screen` or `vh`** — use `h-dvh` / `min-h-dvh`
- **Never nest scrollable areas** — one scroll context per view
- **Never use inline tabs** — stack sections or put in header/sheet
- **Never show text on buttons** — icons only with `aria-label`
- **Never stack toolbars vertically** — consolidate into header or sheet

---

## Building a New Route

### Step 1: Create Route Directory

```
app/(ssr)/ssr/your-feature/
  page.tsx             ← Server component or null stub
  layout.tsx           ← Server layout: auth, data fetching, grid
  your-feature.css     ← Grid layout, :has() selectors, animations, tap targets
  _components/
    SidebarClient.tsx   ← Client island: list/tree, search, filter
    WorkspaceClient.tsx ← Client island: content editing, tabs, caching
    NewItemButton.tsx   ← Tiny client island for CRUD
```

### Step 2: Server Layout (layout.tsx)

```tsx
import "./your-feature.css";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SidebarClient from "./_components/SidebarClient";
import WorkspaceClient from "./_components/WorkspaceClient";

export const metadata = { title: "Feature | AI Matrx" };

export interface ItemSummary {
  id: string;
  label: string;
  folder_name: string;
  updated_at: string;
}

export default async function FeatureLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Lightweight query — no content column
  const { data } = await supabase
    .from("items")
    .select("id, label, folder_name, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const items: ItemSummary[] = (data ?? []).map(/* normalize */);

  return (
    <div className="feature-root">
      <aside className="feature-sidebar">
        <Suspense><SidebarClient items={items} /></Suspense>
      </aside>
      <div className="feature-content">
        <Suspense><WorkspaceClient items={items} /></Suspense>
        <div style={{ display: "none" }}>{children}</div>
      </div>
    </div>
  );
}
```

### Step 3: Null Page Stubs

```tsx
// page.tsx
export default function FeaturePage() { return null; }

// [itemId]/page.tsx
export default function ItemPage() { return null; }
```

### Step 4: Route-Level CSS

CSS handles: grid layout, `:has()` responsive selectors, tap target wrappers, scrollbar overrides, skeleton animations, desktop compact overrides. All colors and text styles go in Tailwind utility classes.

```css
/* Grid layout */
.feature-root {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-areas: "sidebar content";
  height: 100%;
  overflow: hidden;
}

/* Invisible tap target */
.feature-tap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
}

/* Mobile: single column, content scrolls behind header */
@media (max-width: 1023px) {
  .feature-root {
    grid-template-columns: 1fr;
    grid-template-areas: "content";
    height: auto;
    min-height: 100%;
    overflow: visible;
  }
  .feature-sidebar { padding-top: var(--shell-header-h); min-height: 100dvh; }
  .feature-root:has(.detail-active) .feature-sidebar { display: none; }
  .feature-root:not(:has(.detail-active)) .feature-content { display: none; }
}

/* Desktop: compact controls */
@media (min-width: 1024px) {
  .feature-tap { width: auto; height: auto; }
  .feature-tap button { width: 1.375rem !important; height: 1.375rem !important; }
}
```

### Step 5: Client Islands

Follow these patterns:

- **Workspace:** owns a `Map<id, CachedItem>`, reads URL for active item + tabs, auto-saves, syncs via custom events
- **Sidebar:** receives server data as props, listens for custom events (`feature:created`, `feature:deleted`, `feature:moved`), manages search/filter via URL `searchParams`
- **Tiny islands:** (e.g., NewItemButton) handle one action, keep minimal state

---

## Integration Patterns

### Using AI Features Without Redux

```tsx
// Fetch menu items from Supabase directly
const { data } = await supabase
  .from("context_menu_unified_view")
  .select("placement_type, categories_flat")
  .in("placement_type", ["ai-action"]);

// Execute via API route (streaming)
const response = await fetch("/api/prompts/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages, model: "gpt-4o", variables }),
});
```

### Using Server Actions

Server actions work without Redux. Import and call directly from client components:

```tsx
import { submitFeedback } from "@/actions/feedback.actions";
const result = await submitFeedback({ feedback_type: "bug", route: pathname });
```

### Using Data from the Main App's Database

Never duplicate Supabase queries. The `(ssr)` shell uses the same Supabase project — query tables directly.

---

## Checklist Before Merging

- [ ] No `bg-background`, `bg-card`, or solid backgrounds on content flow elements
- [ ] All floating elements use `--shell-glass-*` tokens
- [ ] No `"use client"` on components that could be server components
- [ ] No full Redux imports (no entity hooks, no `globalCache` selectors, no socket slices)
- [ ] Only lite store slices used: `user`, `userPreferences`, `overlays`, `canvas`, `promptCache`, `modelRegistry`, etc.
- [ ] Heavy client components lazy-loaded with `next/dynamic` + `ssr: false`
- [ ] Scrollbars are thin and auto-hiding
- [ ] Mobile: no split views, no nested scrolling, no dialogs (use drawers)
- [ ] Mobile: content scrolls behind transparent header — no inline fixed bars consuming space
- [ ] Mobile: buttons are icon-only, no text labels
- [ ] Mobile: actions consolidated into header portal or bottom sheet — no stacked toolbars
- [ ] Tap targets are ≥44px via invisible wrapper, visible pill is smaller (30px)
- [ ] Desktop: compact toolbar heights, small text, VSCode density
- [ ] Portal content in header uses glass tokens
- [ ] No `router.push()` for in-route state — use `pushState`
- [ ] Context menus show real user data, not hardcoded defaults
- [ ] Loading states use skeleton shimmer, not spinners
- [ ] Sidebar syncs with workspace via custom events (created/deleted/moved/labelChange)
- [ ] The dock correctly highlights when navigating to your route

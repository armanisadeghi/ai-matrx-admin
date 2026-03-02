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
    dashboard/        ← Route: server page + server sub-components
    notes/            ← Route: server layout + client islands
    [your-route]/     ← Your new route goes here
```

---

## Core Rules

### 1. Server Components by Default

Every component is a server component unless it absolutely needs browser APIs. Mark client components with `"use client"` only when required (event handlers, hooks, browser APIs).

```
Server: layout.tsx, page.tsx, Sidebar.tsx, Header.tsx, NavItem.tsx, ShellIcon.tsx
Client: UserMenuIsland.tsx, MobileDock.tsx, SidebarClient.tsx, NotesWorkspace.tsx
```

### 2. No Redux, No Providers

The `(ssr)` route group has **no Redux store, no context providers, no StoreProvider**. This is intentional. If you need data, fetch it server-side or call Supabase directly from client islands.

- **Server-side:** `import { createClient } from '@/utils/supabase/server'`
- **Client-side:** `import { supabase } from '@/utils/supabase/client'`
- **Server actions:** `import { someAction } from '@/actions/...'` (works without Redux)

If you need functionality from the main app that depends on Redux (e.g., `usePromptRunner`, `useAppSelector`), you must create a **lightweight alternative** that uses API routes or server actions instead. Never add Redux to the SSR shell.

### 3. The Glass Rule — No Solid Backgrounds in the Chrome

The header and dock are **always transparent**. Content scrolls behind the header. The dock floats over content. Glass is additive — it only works when the layers below are also transparent.

**NEVER** use these on any element that sits in the shell chrome flow (layouts, page wrappers, sidebars):
- `bg-background` (solid)
- `bg-card` (solid)
- `bg-white` / `bg-zinc-*` (solid)
- Any `rgba` with alpha > 0.7 on a full-bleed element

**ALWAYS** use for route-level panels and surfaces:
- `bg-card/60` with `backdrop-blur-xl` (semi-transparent, allows glass to work)
- `bg-transparent` or no background at all on main content areas
- `bg-accent/60` or lower for interactive elements

**For floating elements** (popups, context menus, dropdowns) that render above everything:
- `bg-[var(--shell-glass-bg)]` with `backdrop-blur-[20px] saturate-[1.5] border border-[var(--shell-glass-border)]`
- These are fine with higher opacity since they're overlays, not part of the content flow

**How to verify:** If your route is loaded and the header/dock backgrounds look solid instead of blurred glass, you've introduced a solid background somewhere in the content tree. Find it and make it transparent.

### 4. CSS-Only Shell State

Shell state (sidebar expanded/collapsed, mobile menu open/closed) is driven entirely by CSS `:has()` selectors on hidden checkboxes. No React state, no JavaScript.

```
#shell-sidebar-toggle  → .shell-root:has(#shell-sidebar-toggle:checked) ...
#shell-mobile-menu     → .shell-root:has(#shell-mobile-menu:checked) ...
```

Never add JavaScript to toggle these. Use `<label htmlFor="shell-sidebar-toggle">` or `<label htmlFor="shell-mobile-menu">`.

### 5. Client Islands — Lazy Load Everything

Client-side interactivity must be isolated into small, lazy-loaded islands. The shell frame, header, sidebar, and dock render instantly from the server.

```tsx
// In a server component:
import dynamic from "next/dynamic";
const HeavyFeature = dynamic(() => import("./HeavyFeature"), {
  ssr: false,
  loading: () => null,
});

// Only renders client-side, downloads on demand
{showFeature && <HeavyFeature />}
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

// Read state reactively:
const pathname = usePathname();
const searchParams = useSearchParams();
```

Never use `router.push()` from `useRouter()` for in-route state changes — it triggers unnecessary server requests. Use `next/link` `<Link>` only for cross-route navigation (e.g., dashboard to notes).

### 7. Header Center Injection via Portal

Routes can inject controls into the header's center zone using `createPortal`. The target element has `id="shell-header-center"`.

```tsx
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

const [headerCenter, setHeaderCenter] = useState<HTMLElement | null>(null);
useEffect(() => {
  setHeaderCenter(document.getElementById("shell-header-center"));
}, []);

// In render:
{headerCenter && createPortal(
  <div className="shell-glass rounded-full px-1 py-0.5 flex items-center gap-0.5">
    {/* Your controls — use shell glass tokens for backgrounds */}
  </div>,
  headerCenter,
)}
```

**Portal content must use glass tokens**, never solid backgrounds. The header is transparent — your injected content sits directly over the page background.

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
    // update local state
  };
  window.addEventListener("notes:labelChange", handler);
  return () => window.removeEventListener("notes:labelChange", handler);
}, []);
```

Namespace events with `module:action` (e.g., `notes:created`, `notes:deleted`, `notes:moved`).

---

## CSS Token Reference

### Glass Tokens (use for all interactive elements in header/dock/overlays)

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
| `.shell-glass` | Full glass node: bg + blur + border + shadow + hover/active states |
| `.shell-glass-dock` | Dock-specific glass (higher blur, stronger bg) |
| `.shell-glass-sheet` | Side sheet glass |
| `.shell-active-pill` | Active route indicator with View Transitions |
| `.shell-tactile` | iOS hover/active scale (1.05 / 0.95) |
| `.shell-tactile-subtle` | Subtle scale (1.02 / 0.98) for nav items |

### Layout Variables

| Variable | Value | Usage |
|---|---|---|
| `--shell-header-h` | `2.5rem` | Header height |
| `--shell-sidebar-w` | `2.75rem` | Collapsed sidebar width |
| `--shell-sidebar-w-expanded` | `13rem` | Expanded sidebar width |
| `--shell-dock-h` | `3.75rem` | Dock height |
| `--shell-dock-bottom` | `0.625rem` | Dock bottom offset |

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

All scrollable elements inside `.shell-main` inherit auto-hiding thin scrollbars. For module-specific scrollable areas, use the `notes-scrollable` class or equivalent:

```css
.your-scrollable {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.your-scrollable:hover {
  scrollbar-color: hsl(var(--muted-foreground) / 0.15) transparent;
}
```

Scrollbars must be: thin (3-4px), transparent by default, only visible on hover. Never use browser default thick scrollbars.

---

## Mobile Rules

### Breakpoints

- Desktop: `min-width: 1024px` (`lg:` in Tailwind)
- Mobile: `max-width: 1023px` (`max-lg:` in Tailwind)

### Required on Mobile

- The dock is always visible. Account for it with bottom padding: `calc(var(--shell-dock-h) + var(--shell-dock-bottom) + 1rem + var(--shell-safe-area-bottom))`. The shell handles this on `.shell-main` automatically.
- Fixed-position dropdowns must position above the dock, not below it.
- Use `max-lg:fixed` with `max-lg:inset-x-3` for full-width mobile dropdowns.
- Input font-size must be >= 16px to prevent iOS zoom.

### Forbidden on Mobile

- **Never use `Dialog` on mobile** — use drawer/bottom sheet.
- **Never use Split view** — hide with `max-lg:hidden`.
- **Never use `h-screen` or `vh`** — use `h-dvh` / `min-h-dvh`.
- **Never nest scrollable areas** — one scroll context per view.
- **Never use tabs on mobile** — stack sections vertically.

---

## Building a New Route

### Step 1: Create Route Directory

```
app/(ssr)/ssr/your-feature/
  page.tsx             ← Server component (data fetching)
  layout.tsx           ← Optional: server layout if route has persistent UI
  your-feature.css     ← Layout-only CSS (grid, scrollbar, :has() selectors)
  _components/
    FeatureClient.tsx   ← Client island(s) with "use client"
```

### Step 2: Server Page Pattern

```tsx
// page.tsx — Server component
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Feature | AI Matrx",
  description: "...",
};

export default async function FeaturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch data server-side
  const { data } = await supabase.from("table").select("...").eq("user_id", user.id);

  // Render server HTML, pass data to client islands
  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Server-rendered content — no bg-background, keep transparent */}
      <h1 className="text-lg font-semibold text-foreground px-4">Feature</h1>
      <FeatureClient items={data ?? []} />
    </div>
  );
}
```

### Step 3: Client Island Pattern

```tsx
"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";
import dynamic from "next/dynamic";

// Lazy-load heavy sub-components
const HeavyPanel = dynamic(() => import("./HeavyPanel"), { ssr: false });

interface FeatureClientProps {
  items: Item[];
}

export default function FeatureClient({ items: serverItems }: FeatureClientProps) {
  const [localItems, setLocalItems] = useState(serverItems);

  const handleAction = useCallback(async () => {
    // Direct Supabase call — no Redux
    const { data } = await supabase.from("table").insert({...}).select().single();
    if (data) setLocalItems(prev => [...prev, data]);
  }, []);

  return (
    <div>
      {/* Render items */}
      {localItems.map(item => (
        <div key={item.id} className="text-foreground">{item.name}</div>
      ))}
      {showPanel && <HeavyPanel />}
    </div>
  );
}
```

### Step 4: Route-Level CSS (if needed)

Only use CSS for: grid layout, `:has()` responsive selectors, scrollbar overrides, animations, pseudo-selectors. All colors, backgrounds, borders, and text styles go in Tailwind utility classes.

```css
/* your-feature.css */
.feature-root {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 1023px) {
  .feature-root {
    grid-template-columns: 1fr;
  }
}
```

---

## Integration Patterns

### Using AI Features Without Redux

The `UnifiedContextMenu` and `usePromptRunner` require Redux. For SSR routes, use the API route directly:

```tsx
// Fetch menu items from Supabase directly
const { data } = await supabase
  .from("context_menu_unified_view")
  .select("placement_type, categories_flat")
  .in("placement_type", ["ai-action"]);

// Build hierarchy with pure utility (no Redux)
import { buildCategoryHierarchy } from "@/features/prompt-builtins/utils/menuHierarchy";
const groups = data.flatMap(row => buildCategoryHierarchy(row.categories_flat || []));

// Execute via API route (streaming)
const response = await fetch("/api/prompts/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages, model: "gpt-4o", variables }),
});
// Read SSE stream from response.body
```

### Using Server Actions

Server actions work without Redux. Import and call directly from client components:

```tsx
import { submitFeedback } from "@/actions/feedback.actions";

const result = await submitFeedback({
  feedback_type: "bug",
  route: pathname,
  description: "...",
});
```

### Using Data from the Main App's Database

Never duplicate Supabase queries. If the main app has a table or view, query it directly. The `(ssr)` shell uses the same Supabase project.

---

## Checklist Before Merging

- [ ] No `bg-background`, `bg-card`, or any solid background on content flow elements
- [ ] All floating elements use `--shell-glass-*` tokens
- [ ] No `"use client"` on components that could be server components
- [ ] No Redux imports (`useAppSelector`, `useAppDispatch`, etc.)
- [ ] Heavy client components lazy-loaded with `next/dynamic` + `ssr: false`
- [ ] Scrollbars are thin and auto-hiding
- [ ] Mobile: no split views, no nested scrolling, no dialogs (use drawers)
- [ ] Portal content in header uses glass tokens
- [ ] No `router.push()` for in-route state — use `pushState`
- [ ] Context menus show real user data (folders, tags, etc.), not hardcoded defaults
- [ ] The dock correctly highlights when navigating to your route

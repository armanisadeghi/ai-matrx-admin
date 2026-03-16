# SSR ↔ Authenticated Layout Convergence Plan

**Goal:** Merge `(ssr)` and `(authenticated)` into a single layout system that has SSR's performance characteristics with authenticated's full feature support.

---

## Current State

### `(authenticated)/layout.tsx` — The Full System
- **Server-side blocking:** Auth check, DB queries for user/preferences/admin status, schema initialization — all before first paint
- **30 providers** nested in `Providers.tsx` (Schema, Entity, Editor, FileSystem, Audio, Notes, Tasks, etc.)
- **Full Redux store** with entity system, sagas, socket middleware
- **Eager socket connection** via `SocketInitializer`
- **ResponsiveLayout** component — JS-driven mobile/desktop switching
- **Everything loads upfront** — no lazy loading, no progressive hydration

### `(ssr)/layout.tsx` — The Fast Shell
- **No server blocking:** Only reads `headers()`, paints immediately
- **5 providers** in `SSRShellProviders` (ReactQuery, LiteStore, Theme, Toast, Tooltip)
- **LiteStore** — no entity system, no sagas, no socket middleware
- **Deferred data loading** via `DeferredShellData` (client-side, after paint)
- **CSS-only navigation** — `:has()` selectors, checkbox toggles, zero re-renders
- **Lazy messaging/socket** — loaded on demand

### The Gap
SSR is fast but incomplete. Authenticated is complete but slow. Routes in `(ssr)` will break if they need any of the 25 missing providers (Entity, Schema, Editor, FileSystem, etc.).

---

## Key Decisions Needed

### 1. Store Strategy: LiteStore vs Full Store

**Current problem:** SSR uses `LiteStoreProvider` which has no entity system. Any route that uses `useAppSelector(state => state.entities.someEntity)` or entity hooks will fail.

**Options:**

**(A) Upgrade SSR to Full Store (deferred)**
- Keep `DeferredShellData` pattern but also fetch schema → init entity system after paint
- Store starts lite, gets upgraded via `replaceReducer()` when schema arrives
- Pro: Full compatibility with all existing routes
- Con: Adds complexity to store lifecycle; components need to handle "store not ready yet" state

**(B) Keep LiteStore, lazy-load entity system per-route**
- Routes that need entities wrap themselves in an `<EntityGate>` that fetches schema on demand
- Pro: Only pays entity cost when needed
- Con: Every entity-using route needs wrapping; first render shows loading state

**(C) Two-phase store: LiteStore → Full Store on auth confirmation**
- Paint with LiteStore immediately
- `DeferredShellData` fetches user + schema, then swaps to full store
- Pro: Best of both — fast paint, full compatibility once hydrated
- Con: Brief window where entity data isn't available; need loading boundaries

**Recommendation:** Option C — aligns with what `DeferredShellData` already does, just needs schema fetching added.

---

### 2. Provider Strategy: All 30 vs On-Demand

**Current problem:** Authenticated wraps everything in 30 providers. Most routes use <5 of them.

**Options:**

**(A) Add all 30 providers to SSRShellProviders**
- Direct port — same nesting as `Providers.tsx`
- Pro: Zero migration risk, every route just works
- Con: Defeats the purpose; massive bundle, slow hydration

**(B) Tiered providers: Shell (always) + Feature (per-route)**
- Shell tier (~10): Theme, Store, Schema, Entity, Toast, Tooltip, ReactQuery, ContextMenu, PreferenceSync, Overlay
- Feature tier (~20): Editor, FileSystem, Audio, Notes, Tasks, Transcripts, GoogleAPI, etc.
- Feature providers loaded via route-level `<FeatureProvider>` wrappers or layout segments
- Pro: Only pays for what you use
- Con: Need to identify which providers each route needs; some refactoring

**(C) Lazy context providers**
- Providers that are rarely used (Audio, GoogleAPI, UniformHeight, etc.) become lazy — their context starts as null, provider mounts on first use
- Pro: Minimal bundle impact; transparent to consumers if they handle null
- Con: Need fallback handling in every consumer hook

**Recommendation:** Option B — Split into shell-tier (always present) and feature-tier (loaded as needed). This is the cleanest long-term architecture.

---

### 3. CSS Strategy: shell.css Cleanup

**Current problem:** `shell.css` is 1,680 lines. ~60% is utility-style CSS that duplicates Tailwind. The other ~40% is structural CSS that genuinely requires raw CSS (`:has()` selectors, view transitions, grid template areas, pseudo-element tooltips).

**Plan:**

#### Keep as raw CSS (non-negotiable):
- CSS custom properties (`:root` variables for geometry, easing, glass tokens)
- Checkbox-driven state (`:has(#shell-sidebar-toggle:checked)`)
- View transitions (`@view-transition`, `::view-transition-old/new`)
- Grid template areas (`grid-template-areas` / `grid-area`)
- Pseudo-element tooltips (`.shell-nav-item[title]:hover::after`)
- Body-level `:has()` selectors (dock active state, route-level shell controls)
- Complex backdrop-filter combinations

#### Convert to Tailwind:
- `.icon-btn` → inline Tailwind classes
- `.shell-tactile` / `.shell-tactile-subtle` → Tailwind `@apply` or inline
- `.shell-header` → Tailwind classes on element
- `.shell-main` → Tailwind classes on element
- `.shell-dock-item` → Tailwind classes on element
- `.shell-auth-island` → Tailwind classes on element
- `.shell-mobile-nav-item` → Tailwind classes on element
- All dashboard-specific classes (`.shell-dashboard-grid`, `.shell-stat-card`, etc.)
- Scrollbar utilities → Tailwind scrollbar plugin
- Most flexbox/spacing/sizing rules

#### Register as Tailwind utilities (via `@theme` or plugin):
- `--shell-header-h`, `--shell-sidebar-w`, etc. → Tailwind spacing tokens
- Glass design tokens → Tailwind color/opacity tokens
- Easing functions → Tailwind transition-timing tokens
- Shell duration values → Tailwind duration tokens

**Target:** Reduce `shell.css` from ~1,680 lines to ~600-700 lines (only structural/behavioral CSS that can't be expressed in Tailwind).

---

### 4. Navigation State: CSS-Only vs Hybrid

**Current SSR approach:** Pure CSS with `data-pathname` attribute + checkbox toggles. Zero JS re-renders for nav state changes.

**What's missing:**
- `NavigationLoader` — loading overlay during route transitions (the authenticated system shows a spinner)
- No `useTransition` integration for navigation feedback

**Plan:** Keep CSS-only for visual state (active highlights, sidebar expand/collapse, mobile menu). Add a small client island `<NavigationProgress />` that uses `useTransition` to show a loading indicator during navigation. This preserves the zero-rerender benefit while adding user feedback.

---

### 5. Layout Component: ResponsiveLayout vs CSS Grid

**Current authenticated:** `ResponsiveLayout` → `DesktopLayout` / `MobileLayout` — switches between two entirely different component trees based on `isMobile`.

**Current SSR:** Single HTML structure, CSS media queries handle responsive behavior. Same DOM for desktop and mobile.

**Plan:** Keep SSR's single-DOM approach. It's objectively better:
- No layout shift when switching between mobile/desktop
- No hydration mismatch risk
- Simpler mental model
- Already works

The `ResponsiveLayout` / `DesktopLayout` / `MobileLayout` components become unnecessary once all routes use the SSR shell.

---

## Implementation Phases

### Phase 1: Store Upgrade (SSR gets full Redux)
1. Add `/api/schema` endpoint (if not already present) to serve `UnifiedSchemaCache`
2. Update `DeferredShellData` to also fetch schema and initialize entity system
3. Replace `LiteStoreProvider` with full `StoreProvider` in `SSRShellProviders`, using deferred initialization
4. Verify entity hooks work in SSR routes after hydration

### Phase 2: Shell-Tier Providers
Add these to `SSRShellProviders` (they're lightweight, no network calls):
1. `SchemaProvider` — needs schema from Phase 1
2. `EntityProvider` — needs store from Phase 1
3. `ContextMenuProvider`
4. `PreferenceSyncProvider` (move from layout to providers)
5. `RefProvider`
6. `PersistentComponentProvider` + `PersistentDOMConnector`
7. `GlobalBrokerRegistration` + `GlobalBrokersInitializer`
8. `ChipMenuProvider`

### Phase 3: Feature-Tier Provider System
1. Create `<FeatureProviders features={['editor', 'fileSystem', 'audio']}>` wrapper
2. Each feature provider is dynamically imported only when listed
3. Create route-level configurations (e.g., notes route needs `['editor', 'notes', 'fileSystem']`)
4. Document which features each route group needs

### Phase 4: CSS Cleanup
1. Extract Tailwind-convertible rules from `shell.css` → inline classes on components
2. Register shell CSS variables as Tailwind tokens in `globals.css` or theme config
3. Keep structural CSS in a reduced `shell.css` (~600-700 lines)
4. Remove dashboard-specific CSS classes (move to Tailwind on components)

### Phase 5: Navigation Polish
1. Add `<NavigationProgress />` client island using `useTransition`
2. Port any loading state patterns from `NavigationLoader`
3. Ensure `startTransition` wrapping on all `<Link>` navigations

### Phase 6: Route Migration
1. Start with low-risk routes (dashboard, settings, simple pages)
2. Move route files from `app/(authenticated)/[route]/` to `app/(ssr)/[route]/`
3. Test each route for provider dependencies
4. Add feature-tier providers where needed
5. Gradually move all routes

### Phase 7: Cleanup
1. Once all routes are migrated, remove `(authenticated)` layout
2. Rename `(ssr)` to `(authenticated)` (or just `(app)`)
3. Remove `Providers.tsx` (replaced by `SSRShellProviders` + feature tiers)
4. Remove `ResponsiveLayout`, `DesktopLayout`, `MobileLayout`
5. Remove `LiteStoreProvider` and `liteStore.ts` (no longer needed)

---

## Risk Mitigation

- **Both layouts coexist** during migration — no big bang cutover
- **Route-by-route migration** — each route tested individually
- **Feature providers are additive** — if a route breaks, add the missing provider
- **CSS changes are cosmetic** — layout structure stays identical
- **Full store upgrade is backward-compatible** — LiteStore actions still work in full store

---

## Open Questions

1. Should `(public)` routes also use the SSR shell (with a different nav config), or stay separate?
2. Are there any providers in the 30-provider stack that have ordering dependencies (must mount before others)?
3. Is the `GlobalBrokerRegistration` → `GlobalBrokersInitializer` pattern still needed, or can it be simplified?
4. Should the schema be fetched via API route or can we use a build-time static asset?
5. What's the desired behavior during the "store upgrading" window — show content with loading boundaries, or show a shell skeleton?

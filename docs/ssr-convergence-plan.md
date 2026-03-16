# SSR Shell Convergence Plan

**Goal:** Make `(ssr)` the only authenticated layout. No provider bloat. Entities phased out. Socket stays lean.

---

## Three Non-Negotiable Constraints

1. **No global provider wrapping.** Providers live at the route/feature level, not the shell. The shell stays minimal.
2. **Entities are being phased out.** They only get hydrated where and when needed. No global entity initialization. Routes that still depend on entities opt in explicitly; new features never use them.
3. **Socket.IO stays lean.** Basic connection setup at shell level (already done via `LazySocketInitializer`). Feature-specific socket state hydrates on demand. No baggage imports.

---

## Current State

### `(ssr)/layout.tsx` — The Target (5 providers, instant paint)
- `SSRShellProviders`: ReactQuery, LiteStore, Theme, Toast, Tooltip
- `DeferredShellData`: fetches user/preferences/admin client-side after paint
- CSS-only navigation (`:has()` selectors, checkbox toggles)
- Lazy messaging + lazy socket

### `(authenticated)/layout.tsx` — Being Retired (26 providers, blocking server calls)
- Server-side auth + DB queries before first paint
- `Providers.tsx` nests 26 providers (see inventory below)
- Full Redux store with entity system + sagas
- Eager socket connection
- JS-driven responsive layout (`ResponsiveLayout`)

### What SSR Shell Already Has Right
- Instant first paint (no server blocking)
- LiteStore (no sagas, no entities, no entity saga middleware)
- CSS-only nav state (zero re-renders)
- Lazy socket/messaging
- Single DOM for mobile+desktop (no `ResponsiveLayout` component tree switching)

---

## Provider Inventory & Disposition

Audit of all 26 providers in `Providers.tsx`, classified by where they belong:

### Keep in Shell (already there or lightweight enough)
These are truly global, lightweight, and have no data fetching:

| Provider | Weight | Notes |
|----------|--------|-------|
| ReactQueryProvider | Light | Already in SSRShellProviders |
| LiteStoreProvider | Light | Already in SSRShellProviders |
| ThemeProvider | Light | Already in SSRShellProviders |
| ToastProvider | Light | Already in SSRShellProviders |
| TooltipProvider | Light | Already in SSRShellProviders |
| ClientOverlayProvider | Light | Already in SSRShellProviders |

**Total shell providers: 6** (already done, no changes needed)

### Move to Route Level (feature-specific)
Each of these belongs in the route or feature layout that uses it:

| Provider | Weight | Used By | Action |
|----------|--------|---------|--------|
| EditorProvider | Medium | Rich-text editor routes | Wrap in editor route layouts |
| FileSystemProvider (Redux) | Heavy | File manager routes | Wrap in file routes |
| FileSystemProvider (Legacy) | Heavy | File manager routes | Same; eventually remove legacy |
| FilePreviewProvider | Light | File manager routes | Wrap with FileSystemProvider |
| NotesProvider | Medium | Notes feature only | Wrap in `app/(ssr)/notes/layout.tsx` |
| TaskProvider | Medium | Tasks feature only | Wrap in `app/(ssr)/tasks/layout.tsx` |
| TranscriptsProvider | Medium | Transcripts feature only | Wrap in transcripts layout |
| GoogleAPIProvider | Heavy | Google integrations only | Wrap in routes that need Google |
| AudioModalProvider | Light | Audio playback routes | Wrap where needed |
| SelectedImagesProvider | Light | Image selection UI | Wrap where needed |
| UniformHeightProvider | Light | Applet runner only | Wrap in applet routes |
| ChipMenuProvider | Light | Rich-text editor only | Wrap with EditorProvider |
| ModuleHeaderProvider | Light | Routes with dynamic headers | Wrap where needed |

### Evaluate & Likely Remove
These are candidates for simplification or removal:

| Provider | Weight | Disposition |
|----------|--------|-------------|
| SchemaProvider | Light | Keep only if non-entity features need schema. Otherwise, remove with entity phase-out |
| EntityProvider | Light | Phase out with entity system |
| PersistentComponentProvider | Medium | Audit usage — may be replaceable with portals |
| PersistentDOMConnector | Light | Tied to PersistentComponentProvider |
| GlobalBrokerRegistration | Light | Audit — may be simplifiable to a dispatch in DeferredShellData |
| GlobalBrokersInitializer | Light | Same as above |
| RefProvider | Light | Audit — used by editor; move with editor if kept |
| PreferenceSyncProvider | Medium | Move to DeferredShellData cleanup effect or a standalone hook |
| ContextMenuProvider | Light | Audit usage breadth — may stay in shell if widely used |

---

## Socket.IO: Fix the Baggage

### Problem Found
`socketMiddleware.ts` line 3 has a static import:
```typescript
import { Socket } from 'socket.io-client';
```
This pulls socket.io-client type definitions (~50-100KB) into **both** stores (full and lite) on every page.

### Fix (Phase 1, immediate)
```typescript
// socketMiddleware.ts — BEFORE:
import { Socket } from 'socket.io-client';

// AFTER:
import type { Socket } from 'socket.io-client';
```
If the bundler still doesn't tree-shake it, replace with a local interface:
```typescript
interface Socket {
  emit(event: string, ...args: unknown[]): void;
  on(event: string, fn: (...args: unknown[]) => void): void;
  off(event: string, fn?: (...args: unknown[]) => void): void;
  disconnect(): void;
  connected: boolean;
  id?: string;
}
```

### Socket Architecture (already good)
- `LazySocketInitializer` → dynamic imports `SocketConnectionManager` only when `connectionRequested`
- `SocketConnectionManager` → dynamic imports `socket.io-client` only on actual connect
- Socket slices are intentionally lightweight (explicitly avoid schema imports)
- **No entity system, no sagas, no schema** in the socket path

### Remaining Socket Concern
`socketMiddleware` is `.concat()`'d into LiteStore, meaning its action-matching logic runs on every Redux dispatch. This is low overhead (string comparisons) but worth monitoring. If it becomes a concern, the middleware itself can be lazily injected via `store.replaceReducer()` only when socket connects.

---

## Entity System Phase-Out Strategy

### Current Entity Usage (from audit)

**Active users (need migration path):**
- **Chat** — `conversation` + `message` entities, custom actions/selectors. Fully entity-dependent.
- **Workflows** — workflow step management via entities.
- **Entity CRUD UI** — admin tool for browsing all entities. Entity-dependent by definition.

**These routes will temporarily use `useEntitySystem()` on-demand hook** (already exists at `lib/redux/entity/useEntitySystem.ts`). It fetches schema and injects entity reducers via `store.replaceReducer()` only when the route mounts.

### Phase-Out Path
1. **No new features use entities.** New data fetching uses React Query + Supabase directly, or server components.
2. **Chat migration:** Replace entity-backed conversation/message with React Query hooks + Supabase. Chat already has parallel legacy slices (`conversationSlice.ts`, `messagesSlice.ts`) that could serve as stepping stones.
3. **Workflows migration:** Same pattern — React Query + Supabase.
4. **Entity CRUD UI:** Last to migrate (it's an admin tool). Eventually replace with a generic Supabase table browser.
5. **Remove entity system** once all consumers are migrated: `lib/redux/entity/`, sagas, `entitySlice.ts`, ~134 dynamic slices, 108KB schema.

### Entity Opt-In Pattern (Transitional)
Routes that still need entities during the phase-out wrap themselves:

```tsx
// app/(ssr)/chat/layout.tsx
'use client';
import { EntityGate } from '@/components/gates/EntityGate';

export default function ChatLayout({ children }) {
  return <EntityGate>{children}</EntityGate>;
}
```

`EntityGate` calls `useEntitySystem()` → fetches schema → injects reducers → renders children. No global cost.

---

## Implementation Phases

### Phase 1: Socket Fix + Shell Stabilization
1. Fix `socketMiddleware.ts` static import → `import type` or local interface
2. Verify SSR shell compiles and loads cleanly (the `dynamic` fix is already done)
3. Audit `ContextMenuProvider` usage breadth — decide shell vs route-level
4. Move `PreferenceSyncProvider` logic into `DeferredShellData` cleanup effect

### Phase 2: Route-Level Provider Wrappers
Create feature-specific layout wrappers for migrated routes:
```
app/(ssr)/notes/layout.tsx       → NotesProvider
app/(ssr)/tasks/layout.tsx       → TaskProvider
app/(ssr)/transcripts/layout.tsx → TranscriptsProvider
app/(ssr)/files/layout.tsx       → FileSystemProvider + FilePreviewProvider
app/(ssr)/editor/layout.tsx      → EditorProvider + RefProvider + ChipMenuProvider
app/(ssr)/chat/layout.tsx        → EntityGate (transitional)
```

Each wrapper is a `"use client"` component that wraps only `{children}`.

### Phase 3: Route Migration (low-risk first)
1. **Dashboard** — no feature providers needed, just shell
2. **Settings/Profile** — minimal, maybe PreferenceSync
3. **Sandbox** — already working in SSR
4. **Notes** — needs NotesProvider wrapper
5. **Tasks** — needs TaskProvider wrapper
6. **Chat** — needs EntityGate (transitional) + editor providers
7. **Admin routes** — needs EntityGate for entity browser

For each route:
- Move from `app/(authenticated)/[route]/` to `app/(ssr)/[route]/`
- Test for missing provider errors
- Add route-level provider wrapper if needed
- Verify functionality

### Phase 4: Entity Migration (Chat first)
1. Create React Query hooks for conversation CRUD (`useConversations`, `useMessages`)
2. Replace `getChatActionsWithThunks()` with direct Supabase mutations
3. Replace `createChatSelectors()` with React Query cache reads
4. Remove EntityGate from chat layout
5. Repeat for workflows

### Phase 5: Navigation Polish
1. Add `<NavigationProgress />` client island (`useTransition` + loading indicator)
2. Port loading patterns from `NavigationLoader`

### Phase 6: CSS Cleanup
1. Convert utility-style classes to Tailwind inline
2. Register shell CSS variables as Tailwind tokens
3. Reduce `shell.css` from ~1,680 to ~600-700 lines

### Phase 7: Final Cleanup
1. Remove `(authenticated)` layout entirely
2. Rename `(ssr)` → `(app)` or just `(authenticated)`
3. Delete `Providers.tsx`
4. Delete `ResponsiveLayout`, `DesktopLayout`, `MobileLayout`
5. Delete `LiteStoreProvider` / `liteStore.ts` (full store with deferred init replaces it)
6. Delete entity system once all consumers migrated

---

## Risk Mitigation

- **Both layouts coexist** — routes migrate one at a time, never a big-bang cutover
- **EntityGate is transitional** — provides backward compatibility while entities are phased out
- **Route-level providers are additive** — if a route breaks, the fix is wrapping it in the missing provider
- **Socket fix is isolated** — one line change in `socketMiddleware.ts`, no behavioral change
- **CSS cleanup is cosmetic** — layout structure stays identical throughout

---

## What's NOT Changing

- SSR shell structure (header, sidebar, mobile dock, glass portal)
- CSS-only navigation state (`:has()` selectors, checkbox toggles)
- DeferredShellData pattern (client-side auth + data after paint)
- LiteStore as the shell store (no sagas, no entities at shell level)
- LazySocketInitializer pattern (dynamic import on demand)
- Single-DOM responsive approach (CSS media queries, no component tree switching)

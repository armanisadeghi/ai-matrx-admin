# Phase 0 — React Query Usage Audit

> Read-only inventory. Produced 2026-04-20. Phase 7 migration is driven by this doc.

The repo touches `@tanstack/react-query` in **11 files** total (much smaller than the "~84" figure; that count likely included transitive node_modules matches). Only 10 are app-code consumers — the 11th is the provider. Every consumer path is mapped below.

Global defaults live in `providers/ReactQueryProvider.tsx`:
`staleTime: 60_000`, `retry: 1`, `refetchOnWindowFocus: false`, `mutations.retry: 1`. Devtools are dynamically imported but gated off by `showDevtools = false`.

## Summary table

| Bucket | File count | Representative capabilities used |
|---|---|---|
| A — plain fetch / one-off | 1 | queryKey + queryFn only |
| B — client caching / cross-tab | 4 | staleTime, `enabled` gating, identity scoping |
| C — requires new sync-engine capability | 5 | optimistic mutations w/ rollback, invalidation cascade, `useQueryClient.getQueriesData`/`setQueryData` fan-out, bridged Redux invalidation, default retry+staleTime semantics relied on by many consumers |

## Bucket C capability inventory (THE critical section)

### C1. Optimistic mutation with rollback (`onMutate` → snapshot → `onError` restore)
- **Consumers**
  - `hooks/canvas/useCanvasLike.ts` (both `likeMutation` and `unlikeMutation` — optimistic fan-out across **all** `['shared-canvas', *]` entries, plus `['canvas-like', canvasId]`)
  - `features/agent-context/hooks/useContextItems.ts` (`useUpdateContextStatus` — optimistic manifest patch by item id)
- **Breakage if absent:** Like button would lag behind network; status dropdown would visibly reorder on save. UX regression, not correctness.
- **Proposed `fallback()` extension:** `fallback.mutate({ optimistic: (draft) => ..., rollbackOnError: true })`. Internally: take a snapshot of the affected slice(s), apply the draft patch immediately, revert on thrown error.

### C2. Cache-wide fan-out (`queryClient.getQueriesData` + bulk `setQueryData`)
- **Consumers**
  - `hooks/canvas/useCanvasLike.ts` — iterates every `['shared-canvas', *]` entry to bump `like_count`.
- **Breakage if absent:** Optimistic like-count updates would only apply to a single keyed entry; siblings rendered in a list view would show stale counts until refetch.
- **Proposed extension:** `fallback.patchAll(prefix, updater)` — iterate all resources under a key prefix in the sync-engine cache and apply a pure updater.

### C3. Invalidation cascade across **unrelated** keys
- **Consumers**
  - `features/agent-context/hooks/useContextItems.ts` (every mutation invalidates 2–4 different keys: manifest + stats + attention + item + value + history)
  - `features/agent-context/hooks/useHierarchy.ts` (every mutation invalidates `hierarchy-tree` **and** dispatches a Redux thunk `invalidateAndRefetchFullContext` / `invalidateAndRefetchNavTree`)
  - `features/agent-context/hooks/useContextVariables.ts` (invalidates both `ctx-vars-scope` and `ctx-vars-resolved` on every mutation)
  - `hooks/canvas/useCanvasShare.ts` (`user-canvases` + `discover-canvases`)
  - `hooks/canvas/useCanvasScore.ts` (`canvas-best-score` + `canvas-leaderboard` + `shared-canvas`)
- **Breakage if absent:** Post-mutation UI would stay stale. Multi-pane screens (hierarchy tree + navigation + detail) would desync from a single write.
- **Proposed extension:** `fallback.invalidate([...resourceIds])` taking an array, plus a `bridgeToRedux` option that dispatches a named thunk after invalidation. Declarative invalidation groups on the `fallback()` resource definition would be even cleaner: `fallback('task', { invalidates: ['hierarchy-tree', 'full-context'] })`.

### C4. Bridged RQ → Redux thunk dispatch on mutation success
- **Consumers**
  - `features/agent-context/hooks/useHierarchy.ts` — every mutation dispatches normalized-slice upserts (`upsertOrgWithLevel`, `upsertProjectWithLevel`, `upsertTaskWithLevel`, `adjustProjectTaskCount`, `remove*FromSlice`) *in addition to* invalidating the RQ tree cache.
- **Breakage if absent:** The Redux-driven sidebar and the RQ-driven tree page would disagree after a write. This is effectively a dual-source-of-truth bug waiting to happen; Phase 7 is the opportunity to delete one side.
- **Proposed extension:** Not an RQ feature per se — this is a **migration-sequencing concern**. Before removing RQ here, the sync engine must own the canonical `HierarchyNode` shape so the Redux upserts become the only path.

### C5. Implicit reliance on global defaults (`staleTime: 60s`, `retry: 1`)
- **Consumers:** Every bucket-B file inherits these without opting in. Several bucket-B files override `staleTime` (5m for templates, 30s for leaderboard, 5m for shared canvas, 2m for hierarchy tree, 1m for discovery).
- **Breakage if absent:** A "zero-caching" replacement would cause thundering-herd refetches on every mount. Must not migrate without preserving per-resource TTL semantics.
- **Proposed extension:** `fallback({ resource, ttlMs, retry })` first-class. Also a global `SyncEngineProvider` default matching the current RQ defaults (60s TTL, 1 retry, no refocus refetch).

### C6. `enabled` gating (query short-circuit)
- **Consumers:** Nearly every `useQuery` call — 17+ occurrences across `useHierarchy`, `useContextVariables`, `useContextItems`, `useCanvas*`, `useRecipe`.
- **Breakage if absent:** Queries would fire with `null`/empty arg and throw. Essential feature, not optional.
- **Proposed extension:** `fallback({ enabled: boolean })`. Must be supported in Phase 2.

## Per-file inventory

### Bucket A — plain fetch

| File | Query keys | Reason for bucket A |
|---|---|---|
| `features/canvas/discovery/CanvasDiscovery.tsx` | `['discover-canvases', sortBy, filterType, searchTerm]` | Single list query with composite key; no mutations, no invalidation consumer elsewhere. Could be a plain thunk with debounced input, but it does benefit from `staleTime: 60s` — see note below. |

Note: `CanvasDiscovery` is borderline A/B. Listed A because its only RQ feature is the key + staleTime combo, and a SWR-style thunk would serve equally.

### Bucket B — client caching / cross-tab

| File | Query keys | Caching signals | Sync-engine slice suggestion |
|---|---|---|---|
| `features/recipes/view-setup/hooks/useRecipe.ts` | `['recipe', id]`, `['recipe-versions', id]` | `enabled: !!recipeId`; relies on global 60s TTL | `fallback('recipe', { ttlMs: 60_000 })` |
| `hooks/canvas/useLeaderboard.ts` | `['canvas-leaderboard', canvasId, limit]` | `staleTime: 30_000`, `enabled: !!canvasId` | `fallback('canvas-leaderboard', { ttlMs: 30_000 })` |
| `hooks/canvas/useSharedCanvas.ts` | `['shared-canvas', shareToken]` | `staleTime: 5 * 60_000`; public-facing | `fallback('shared-canvas', { ttlMs: 300_000 })`; also feeds C2 fan-out |
| `hooks/canvas/useCanvasScore.ts` (query half) | `['canvas-best-score', canvasId]` | `enabled: !!canvasId`; identity-scoped (`requireUserId`) | `fallback('canvas-best-score', { identityScoped: true })` — the mutation half is bucket C |

### Bucket C — requires new capability

| File | Query keys | Capability tags | Notes |
|---|---|---|---|
| `features/agent-context/hooks/useContextItems.ts` | 14 distinct keys (`context-manifest`, `context-item`, `context-value`, `context-history`, `context-stats`, `context-health`, `context-attention`, `context-access-summary`, `context-templates`, `context-templates-by-industry`, `context-access-volume`, `context-usage-rankings`) | C1 (optimistic status update), C3 (multi-key invalidation), C5, C6 | Single largest consumer. `useUpdateContextStatus` is the reference optimistic mutation. `useApplyTemplate` does read-then-write-then-invalidate-multiple — a transactional pattern worth first-classing. |
| `features/agent-context/hooks/useHierarchy.ts` | 5 key families | C3, C4 (Redux bridge), C5, C6 | Every mutation does `qc.invalidateQueries` **and** `dispatch(invalidateAndRefetchFullContext/NavTree())`. Sync engine must unify this. |
| `features/agent-context/hooks/useContextVariables.ts` | 2 key families (`ctx-vars-scope`, `ctx-vars-resolved`) | C3, C6 | Pure-pair invalidation — simpler than C3 peer files but same pattern. |
| `hooks/canvas/useCanvasShare.ts` | mutation-only; invalidates `['user-canvases']`, `['discover-canvases']` | C3 | Invalidates keys owned by **other** files, including a key (`user-canvases`) that is **never defined** as a query in this repo — see anti-patterns. |
| `hooks/canvas/useCanvasLike.ts` | `['canvas-like', canvasId]`, targets all `['shared-canvas', *]` | C1, C2, C3 | Most feature-dense file. Reference implementation for optimistic fan-out. |
| `hooks/canvas/useCanvasScore.ts` (mutation half) | invalidates `['canvas-best-score']`, `['canvas-leaderboard']`, `['shared-canvas']` | C3 | Query half is bucket B; mutation half forces the whole file into C. |

## Notable patterns and anti-patterns

1. **Dead invalidation target.** `useCanvasShare` invalidates `['user-canvases']` but **no file in the repo defines a query with that key.** Either dead code or a missing feature. Flag during Phase 7.
2. **Dual source of truth (RQ + Redux).** `useHierarchy` writes both to the RQ cache and to Redux normalized slices (`organizationsSlice`, `projectsSlice`, `tasksSlice`). A single mutation triggers both an RQ `invalidateQueries` and a Redux thunk refetch. This is the single biggest migration risk — it's not a simple rip-and-replace, it's a consolidation.
3. **Inconsistent key shapes.** `useContextItems` uses `['context-templates', cat]` for industry-filtered templates and `['context-templates']` for all — the prefix overlap means `invalidateQueries({ queryKey: ['context-templates'] })` would clobber both. No consumer does this yet, but it's a trap.
4. **`['shared-canvas']` is queried by `shareToken`, invalidated by `canvasId`.** See `useCanvasLike` and `useCanvasScore`. They invalidate the prefix (`['shared-canvas']`) because they don't know the token. Works today, but the sync engine's resource addressing must support "invalidate by related id" or keep using prefix fan-out (C2).
5. **Provider devtools are dead code.** `showDevtools = false` is hardcoded; the dynamic import is never exercised. Safe to delete at the same time as RQ itself.
6. **`requireUserId()` inside `queryFn`.** `useCanvasScore` and `useCanvasLike` call `requireUserId()` inside the queryFn — this throws when logged out and relies on `enabled: !!canvasId` not being sufficient to prevent firing. Identity-scoped caching in the sync engine should make the user-id dependency explicit rather than implicit.
7. **No uses of:** `useInfiniteQuery`, `useSuspenseQuery`, `useQueries`, `prefetchQuery`, `keepPreviousData`, `select`, custom `retry` functions, `refetchInterval`. Phase 7 does **not** need to replicate those.

## Open questions for Arman

1. `useHierarchy` → the RQ tree cache + Redux normalized slices have overlapping responsibilities. In Phase 7, should the sync engine own the tree (deleting `organizationsSlice`/`projectsSlice`/`tasksSlice`), or should Redux remain canonical and the RQ layer just go away?
2. `['user-canvases']` is invalidated but never queried. Dead code, or a feature that was half-deleted? If dead, remove in Phase 7.
3. `useCanvasLike` fan-outs across every `['shared-canvas', *]` entry. Is a single-canvas page the only realistic surface, or do we also need to optimistically update a list view? If list-view, the sync engine must support prefix-scoped bulk patch from day one.
4. `useUpdateContextStatus` is the only optimistic query in the `useContextItems` family. Are there more status-like fields planned (priority, archive toggle) that will want the same pattern? If yes, a generic `optimisticPatchById` helper makes more sense than per-field optimistic handlers.
5. Do we need to preserve the global `staleTime: 60s` / `retry: 1` defaults as sync-engine defaults, or opt every resource into explicit TTLs?

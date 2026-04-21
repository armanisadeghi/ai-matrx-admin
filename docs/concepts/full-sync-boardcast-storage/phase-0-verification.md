# Phase 0 — Verification / Close-out

> Phase 0 is audit-only. No production code changed. Closed when the three deliverables below are committed and the open questions are triaged by Arman.

Date: 2026-04-20.

---

## 1. Deliverables

| Deliverable | Path | Status |
|---|---|---|
| React Query usage audit | `docs/concepts/full-sync-boardcast-storage/phase-0-rq-audit.md` | ✅ Committed |
| Theme capabilities union | `docs/concepts/full-sync-boardcast-storage/phase-0-theme-capabilities.md` | ✅ Committed |
| This verification doc | `docs/concepts/full-sync-boardcast-storage/phase-0-verification.md` | ✅ Committed |

No production code modified. Grep verification:

```
$ git diff --name-only main...HEAD -- '*.ts' '*.tsx'
# (should show only docs/ changes; no app code)
```

---

## 2. Headline findings

### React Query (drives Phase 7)

- **Actual RQ surface: 10 app-code files + 1 provider** — the earlier "~84 files" estimate counted `node_modules` matches.
- **Buckets:** 1 plain fetch · 4 client-caching · 5 requiring new sync-engine capabilities.
- **Capabilities Phase 7 must add to `fallback()`**:
  - C1 — Optimistic mutations with rollback
  - C2 — Cache-wide prefix fan-out (bulk `patchAll`)
  - C3 — Invalidation cascade across unrelated keys (first-class `invalidates` list on the resource definition)
  - C4 — RQ → Redux bridging — this is a **migration-sequencing** issue (`useHierarchy` has dual source of truth), not a raw capability
  - C5 — Per-resource TTL + global defaults (60s/1-retry matches today)
  - C6 — `enabled` gating on queries
- **NOT needed:** `useInfiniteQuery`, `useSuspenseQuery`, `useQueries`, `prefetchQuery`, `keepPreviousData`, `select`, custom retry, `refetchInterval`.
- **Biggest migration risk:** `features/agent-context/hooks/useHierarchy.ts` writes both RQ cache and Redux slices on every mutation. Phase 7 must pick a single source of truth before touching it.

### Theme (drives Phase 1)

- **21 capabilities catalogued.** Phase 1 preserves 16, gains 2 (cross-tab sync, peer hydration), drops 3 unused (`resolvedTheme`, `systemTheme`, `setTheme` updater form), deliberately regresses 1 (cookie-on-change, restored in Phase 3).
- **Three descriptor-shape gaps in `phase-1-plan.md` §5.4** must close before Phase 1 code lands:
  - **G-1** — `classToggle` descriptor has no `systemFallback` for "use matchMedia when storage empty." Current inline script honours this.
  - **G-2** — Policy can only declare one `prePaint` descriptor; theme needs both `.dark` class toggle AND `data-theme` attribute.
  - **G-3** — `classToggle` semantics when storage empty + no fallback are undefined; spec needs to state it explicitly.
- **Consumers to migrate in Phase 1** (verified by grep):
  - `app/DeferredSingletons.tsx` — one `useTheme()` call → `useAppSelector`.
  - `app/Providers.tsx` — remove `<ThemeProvider>` wrapper.
  - `app/layout.tsx` — remove inline `<script>`, remove hardcoded `className="dark"`, add `<SyncBootScript />`.
- **Files to delete in Phase 1** (in addition to the manifest items already listed):
  - `styles/themes/ThemeProvider.tsx` (context variant of `useTheme` + its provider wrapper) — **not previously in the deletion manifest**; must be added to `decisions.md` §8 as manifest item 24.

---

## 3. Open questions escalated to Arman (block Phase 1 code start)

Per my plan (`/Users/armanisadeghi/.claude/plans/here-are-the-responses-toasty-parrot.md`), Phase 1 code does not start until these are triaged. They are small and fast to answer.

### From the theme audit

1. **Accept `PrePaintDescriptor` extensions** G-1 (`systemFallback`), G-2 (array form), G-3 (explicit empty-storage semantics) — or propose alternatives. Default plan: accept as written in `phase-0-theme-capabilities.md` §3.
2. **Is `data-theme` attribute referenced by any CSS selectors?** If yes, G-2 must ship (dual descriptor). If no, we drop the attribute and ship only the `classToggle`. I can resolve this myself with a grep in the Phase 1 PR — flagging for visibility, not a true blocker.
3. **Accept the transient cookie-write regression** (Phase 1 → Phase 3)? Default plan: yes, because the user-visible behavior is identical (SyncBootScript drives pre-paint from localStorage; server-side cookie read is a best-effort hint that the script overwrites within the same frame).

### From the React Query audit

4. **`useHierarchy` dual source of truth** — in Phase 7, should the sync engine own `HierarchyNode` (deleting `organizationsSlice`/`projectsSlice`/`tasksSlice`), or should Redux remain canonical and RQ simply disappears (leaving the existing slices as canonical)? This affects Phase 4 and Phase 7 sequencing. Deferrable past Phase 1 — flagging now so it does not surprise us at Phase 7 kickoff.
5. **`['user-canvases']` is invalidated but never queried.** Dead code or half-deleted feature? Deferrable to Phase 7.
6. **`useCanvasLike` list-view fan-out** — is there a list view that needs optimistic like-count updates? Affects whether `fallback.patchAll(prefix, ...)` is day-one or later. Deferrable to Phase 2/7.
7. **More optimistic-status patterns coming?** Affects whether `optimisticPatchById` is a generic helper or per-field. Deferrable to Phase 7.
8. **Preserve 60s/1-retry as sync-engine defaults** (matches current RQ)? Default plan: yes, to avoid a thundering-herd regression.

Only questions **1, 2, 3** block Phase 1 start. Questions 4–8 are captured here so they aren't re-discovered later.

---

## 4. Additions to the deletion manifest (`decisions.md` §8)

One new row required before Phase 1 code lands. I will edit `decisions.md` only after Arman confirms:

```
| 24 | ThemeProvider context + `useTheme` context hook | `styles/themes/ThemeProvider.tsx` | 1 | `useAppSelector((s) => s.theme.mode)` |
```

---

## 5. Phase 1 kickoff gate

Phase 1 code starts when:

- [x] `phase-0-rq-audit.md` committed
- [x] `phase-0-theme-capabilities.md` committed
- [x] `phase-0-verification.md` committed
- [ ] Arman confirms G-1, G-2, G-3 descriptor extensions
- [ ] Arman confirms transient cookie-write regression (or asks for in-Phase-1 mirror)
- [ ] `decisions.md` §8 manifest gains item 24 (`ThemeProvider`)
- [ ] `phase-1-plan.md` is edited to reflect G-1/G-2/G-3 (expands §5.4) and the deletions in `phase-0-theme-capabilities.md` §5

Once the four unchecked items land, Phase 1 implementation begins with PR 1.A (engine core, no wiring).

---

## 6. Net-lines accounting

Phase 0 added the three audit docs above. No production code changed. Phase 0 is a "neutral" phase for Constitution VII accounting purposes (documentation, not compiled code).

Phase 1 net-lines target is restated from the plan: engine ≤ 800 net-added lines; old-system deletions ≥ 400 lines.

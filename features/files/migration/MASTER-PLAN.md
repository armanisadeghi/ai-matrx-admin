# Cloud Files Migration — Master Plan

Phase-ordered plan. Each phase links to its own spec under [phases/](phases/) (filled in progressively as phases kick off). Track status at the phase level; per-task status lives in [INVENTORY.md](INVENTORY.md).

Full rationale and context: [../FEATURE.md](../FEATURE.md). Full approved plan: `/Users/armanisadeghi/.claude/plans/we-re-struggling-with-file-happy-snowflake.md`.

---

## Phase status

| # | Phase | Status | Est. | Phase doc |
|---|---|---|---|---|
| 0 | Foundation docs | ✅ complete | 1 day | — (this dir) |
| 1 | Types + API client | ✅ complete | 2 days | phases/phase-01-types-api.md |
| 2 | Redux slice + realtime middleware | ✅ complete | 3 days | phases/phase-02-redux-realtime.md |
| 3 | Core components | ✅ complete | 5 days | phases/phase-03-core-components.md |
| 4 | Surface wrappers | ✅ complete | 3 days | phases/phase-04-surfaces.md |
| 5 | Routes (`app/(a)/cloud-files/`) | ✅ complete | 2 days | phases/phase-05-routes.md |
| 6 | WindowPanel integration | ✅ complete | 2 days | phases/phase-06-window-panel.md |
| 7 | Hooks + pickers | ✅ complete | 2 days | phases/phase-07-hooks-pickers.md |
| 8 | First consumer migration | ✅ complete | 1–2 days | phases/phase-08-first-consumer.md |
| 9 | Progressive consumer migration | 🟡 in progress | 1–2 weeks | phases/phase-09-consumers.md |
| 10 | Validation soak | ⬜ not started | 2 weeks | phases/phase-10-soak.md |
| 11 | Legacy deletion | ⬜ not started | 1–3 days (many PRs) | phases/phase-11-deletion.md |
| 12 | Backend optimization follow-ups | ⬜ ongoing | — | phases/phase-12-backend-followups.md |

Legend: ⬜ not started · 🟡 in progress · ✅ complete · ⏸ paused · ❌ blocked.

---

## Phase summaries

### Phase 0 — Foundation docs ✅

Docs scaffold in place. No runtime code. Done.

Deliverables: [../FEATURE.md](../FEATURE.md), [../SKILL.md](../SKILL.md), [../PYTHON_TEAM_COMMS.md](../PYTHON_TEAM_COMMS.md), [README.md](README.md), [MASTER-PLAN.md](MASTER-PLAN.md), [INVENTORY.md](INVENTORY.md).

### Phase 1 — Types + API client

Typed, callable surface to the backend. Leaf, no UI.

Critical files:
- [../types.ts](../types.ts) — single source of truth for all file types.
- [../api/client.ts](../api/client.ts) — fetch wrapper with JWT, `X-Request-Id`, error mapping.
- [../api/{files,folders,versions,permissions,share-links,groups}.ts](../api/) — one module per endpoint group.

Exit criteria: `pnpm typecheck` green. Can upload/download/list in isolation from an ad-hoc test page.

### Phase 2 — Redux slice + realtime middleware

The state model and live-sync backbone.

Critical files:
- [../redux/slice.ts](../redux/slice.ts), [thunks.ts](../redux/thunks.ts), [selectors.ts](../redux/selectors.ts), [converters.ts](../redux/converters.ts).
- [../redux/realtime-middleware.ts](../redux/realtime-middleware.ts), [request-ledger.ts](../redux/request-ledger.ts), [tree-utils.ts](../redux/tree-utils.ts).
- [../providers/CloudFilesRealtimeProvider.tsx](../providers/CloudFilesRealtimeProvider.tsx).
- Edits to [lib/redux/rootReducer.ts](../../../lib/redux/rootReducer.ts) and [lib/redux/store.ts](../../../lib/redux/store.ts).

Exit criteria: slice registered; `loadUserFileTree()` dispatchable; realtime subscription attaches on login; optimistic rename round-trip works with rollback on simulated error.

### Phase 3 — Core components

Framework-agnostic, context-free building blocks.

Deliverables under `features/files/components/core/`: FileTree, FileList, FileIcon, FileMeta, FilePreview (+ registry), FileUploadDropzone, FileBreadcrumbs, FileActions (headless), FileContextMenu, ShareLinkDialog, PermissionsDialog.

Duplicate (don't import) from legacy: `components/ui/file-preview/` (preview registry), `utils/file-operations/constants.ts` (icon map), `components/file-system/draggable/FileTree.tsx` + `components/FileManager/` (tree render patterns).

Exit criteria: components storybook-rendered with mock Redux state; keyboard nav works; DnD works; no imports from `app/`, `features/window-panels/`, or `useIsMobile`.

### Phase 4 — Surface wrappers

Drop-in hosts: PageShell, WindowPanelShell, MobileStack, EmbeddedShell, DialogShell, DrawerShell.

Exit criteria: each surface renders core components; responsive branching works (`useIsMobile()` → Dialog↔Drawer, PageShell→MobileStack).

### Phase 5 — Routes

Next.js App Router under `app/(a)/cloud-files/` + public share under `app/(public)/share/[token]/`.

Must follow: `next-cache-components`, `nextjs-ssr-architecture`, `ssr-zero-layout-shift` skills. Server-rendered seeds, `'use cache'` + `cacheTag('cloudFiles:${userId}')`, loading skeletons match final DOM.

Exit criteria: end-to-end browse, upload, preview, share works from cold load; zero layout shift; reload on an expanded-tree URL preserves state.

### Phase 6 — WindowPanel integration

`CloudFilesWindow` in [features/window-panels/windows/](../../window-panels/windows/) + registry entry.

Exit criteria: opens from command palette; persists `activeFolderId`, `activeTab`, view prefs; mobile falls back to full-screen.

### Phase 7 — Hooks + pickers

Consumption-layer hooks (`useCloudTree`, `useFileUpload`, `useSignedUrl`, etc.) and picker dialogs (`FilePicker`, `FolderPicker`, `SaveAsDialog`).

Exit criteria: a quick test page can attach a file via `FilePicker` into any Redux context.

### Phase 8 — First consumer migration

Migrate one real caller end-to-end. Recommendation: Slack upload or task attachments.

Exit criteria: one legacy surface flipped to `replaced` in [INVENTORY.md](INVENTORY.md); production soak starts.

### Phase 9 — Progressive consumer migration

Walk [INVENTORY.md](INVENTORY.md) rows in blast-radius order (smallest first).

Exit criteria: every `status: legacy` row is `status: replaced`.

### Phase 10 — Validation soak

2 weeks of side-by-side production use with instrumentation.

Exit criteria: upload success >99%, API error distribution healthy, no realtime-dedup regressions reported.

### Phase 11 — Legacy deletion

1 PR per legacy surface. Must have zero callers in repo AND zero callers in production telemetry.

Exit criteria: every `status: replaced` row flipped to `status: deleted`. Legacy import paths grep to zero matches.

### Phase 12 — Backend optimization follow-ups

Track items in [../PYTHON_TEAM_COMMS.md](../PYTHON_TEAM_COMMS.md). Ongoing.

---

## Phase-doc template

When kicking off a new phase, create `phases/phase-NN-<slug>.md` with:

```md
# Phase NN — <title>

**Status:** 🟡 in progress | ✅ complete.
**Lead:** <name>.
**Started:** YYYY-MM-DD.
**Completed:** YYYY-MM-DD.

## Goal
(What "done" looks like.)

## Scope
- In:
- Out:

## Critical files
- `path/to/file.ts` — (note)

## Exit criteria
- [ ] …

## Change log
- YYYY-MM-DD — (what changed).
```

# FEATURE.md — `context-menu-host`

**Status:** `active`
**Last updated:** `2026-10-10`

The universal right-click / long-press menu is the npm package `@ai-matrx/context-menu`
(source `aidream/apps/shared/context-menu/src/engine/`; its contract is that folder's `FEATURE.md`).
This folder is only the app's side of it: the host registration and the app-only tests.

## Entries — which subpath to import

| Subpath | What | Shell-safe |
|---|---|---|
| `@ai-matrx/context-menu/react` | `EditableContextMenu`, `NonEditableContextMenu`, `ContextMenuV3`, `PageSurfaceMenu`, item binding, regroup, presence | yes |
| `@ai-matrx/context-menu/engine` | types, scope building, availability, record-menu registry, table-row items, grouping, the host port | yes |
| `@ai-matrx/context-menu/model` | menu model, `useContextMenuActions`, `useUnifiedAgentContextMenu`, Alchemy provider, value resolution, editor write-back | no — tests, dev pages, code inside an open menu |
| `@ai-matrx/context-menu/menu-content` | the lazy menu body (the engine imports it itself on first open) | no |

## The host

- `register.ts` — imported once at boot by `providers/ChatHostAdapter.tsx`. Light members only
  (`confirm`, `showManualCopy`, `listeningHomeSurface`, `selectRenderDefinitions`) plus `loadOnOpen`.
- `on-open.tsx` — loaded by the engine WITH the menu body on first open: `useBindings` (overlay
  openers, admin/debug flags, compare base, quick actions, active scopes), `getSurfaceManifest`
  (the surface-manifest registry, which must never be in the shell), the rich-document action
  handlers (side-effect import) and `DocumentAgentReview`.
- `host-types.ts` — augments `ContextMenuHostTypes { resourceType }` with the app's share vocabulary.

[`SECTIONS.md`](./SECTIONS.md) is the registry of the app's shared per-identity section builders
(`pnpm check:context-menu` reads it). Skill: `.claude/skills/context-menu-v3`.

## Change log

- `2026-10-10` — The in-repo copy `features/context-menu-v3/` is deleted; every import points at the
  package. The app-only integration tests (notes sections, rich-document handlers, root reducer,
  table-menu sections, inventory coverage) moved to `__tests__/` here.

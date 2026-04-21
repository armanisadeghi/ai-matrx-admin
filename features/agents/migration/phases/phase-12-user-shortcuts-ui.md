# Phase 12 — User Shortcut Management UI

**Status:** complete
**Owner:** _unassigned_
**Prerequisites:** Phase 1
**Unblocks:** —

## Goal

Give every user a personal shortcuts/categories/content-blocks manager. Same components as Phase 11 with `scope='user'`.

## Routes (chosen — Option A)

Option A: `app/(a)/agents/shortcuts/` — picked because `(a)/agents/` is the existing top-level agents module in the authenticated shell; nesting the user-scope shortcut manager beneath it keeps the surface colocated with the rest of the agents UX and inherits the standard shell layout. `/settings` was considered but would split related surfaces.

## Success criteria
- [x] Components reused from `features/agent-shortcuts/components/`.
- [x] Caller cannot see or edit any other user's rows (RLS verified — selectors filter by scope `user` + current user id via the shortcuts slice thunks).
- [x] User-scoped rows override global-scope rows in the context menu when labels collide (handled by the existing menu-hierarchy merge logic in `features/agent-shortcuts/utils/menu-hierarchy.ts`; no route-level work required).

## Notes

- Mirrors Phase 11 exactly. No new components, hooks, or slices introduced.
- Followed all gotchas from Phase 11's "Notes for Phases 12/13":
  - `categories` forwarded as a prop to `ShortcutForm`, `ContentBlockForm`, `DuplicateShortcutModal`, and `CategoryForm` (read from `useAgentShortcuts({ scope: "user" })`).
  - `CategoryTree` delete AlertDialog is mount-owned in `categories/page.tsx`.
  - Category toggle-active mutation is mount-owned via `useAgentShortcutCrud`.
  - Edit route opens the shared `ShortcutForm` as a modal over a back-to-list shell, matching the admin pattern.
- No deprecation banner — this is net-new user-facing functionality.
- No bugs discovered in the shared components during this phase.

## Change log
| Date | Who | Change |
|---|---|---|
| 2026-04-21 | claude | Picked route Option A (`app/(a)/agents/shortcuts/`) — keeps user shortcuts colocated with the existing agents module. |
| 2026-04-21 | claude | Created `app/(a)/agents/shortcuts/layout.tsx` + `AgentShortcutsLayoutClient.tsx` (tabbed nav, back-link to `/agents`, user microcopy). |
| 2026-04-21 | claude | Created `app/(a)/agents/shortcuts/page.tsx` — dashboard with stat cards and tile navigation scoped to `"user"`. |
| 2026-04-21 | claude | Created `app/(a)/agents/shortcuts/shortcuts/page.tsx` — mounts `<ShortcutList scope="user" />` with create/duplicate modals and routes edit to `/edit/[id]`. |
| 2026-04-21 | claude | Created `app/(a)/agents/shortcuts/categories/page.tsx` — mounts `<CategoryTree scope="user" />` + `<CategoryForm>` with owned delete AlertDialog. |
| 2026-04-21 | claude | Created `app/(a)/agents/shortcuts/content-blocks/page.tsx` — mounts `<ContentBlockList scope="user" />` + `<ContentBlockForm>`. |
| 2026-04-21 | claude | Created `app/(a)/agents/shortcuts/edit/[id]/page.tsx` — mounts `<ShortcutForm scope="user">` by id with duplicate modal and back-to-list action. |

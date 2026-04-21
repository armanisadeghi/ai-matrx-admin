# Phase 13 — Org Shortcut Management UI

**Status:** complete
**Owner:** _unassigned_
**Prerequisites:** Phase 1
**Unblocks:** —

## Goal

Mount the shared CRUD components at `app/(authenticated)/org/[slug]/shortcuts/` (and categories, content blocks). Members read; org admins write.

## Success criteria
- [x] Components reused from `features/agent-shortcuts/components/`.
- [x] Role-gated write: only `org_admin` members can create/update/delete.
- [x] Org-scoped rows appear in the context menu for every member.

## Scope resolution

- Layout is a client component (`OrgShortcutsLayoutClient`) mirroring the existing `OrgResourceLayout` pattern — resolves `params.slug` via `getOrganizationBySlug(slug)` and `getUserRole(orgId)` from `@/features/organizations`.
- Resolved `{ slug, organizationId, organizationName, role, canWrite }` is exposed through `OrgShortcutsContext` so every child page reads it without re-resolving.
- `useAgentShortcuts({ scope: "organization", scopeId: organizationId })` + `useAgentShortcutCrud({ scope: "organization", scopeId: organizationId })` throughout.
- Layout hides itself on the edit sub-route (same pattern as the admin layout) so the edit page owns its own chrome.

## Role-gating approach

- `canWrite = role === "owner" || role === "admin"` (matches `is_org_admin(org_id)` RLS helper).
- All shared list/tree components (`ShortcutList`, `CategoryTree`, `ContentBlockList`) accept a `readonly` prop — passed as `readonly={!canWrite}`. Create/edit/delete/toggle handlers are passed as `undefined` for members so the components cleanly hide affordances.
- Modals (`ShortcutForm`, `CategoryForm`, `ContentBlockForm`, `DuplicateShortcutModal`) are not mounted at all when `!canWrite`. The edit-by-id page renders a read-only details card for members instead of opening the form.
- Role badge (Shield / Eye icon) rendered in the tabbed header so members always see their permission level. Dashboard page shows a contextual "About organization-scope management" callout whose copy branches on write permission.
- Member-only users who somehow bypass the UI will still be rejected by RLS (`shortcut_categories_insert/update/delete` policies already gate on `is_org_admin`).

## Shared-component deltas

- None. The `readonly` prop already existed on `ShortcutList`, `CategoryTree`, and `ContentBlockList` from Phase 1 / Phase 11 work — no tweaks were needed.
- The same "ShortcutForm requires `categories` as a prop" note from Phase 11 applies here; the org pages forward categories from `useAgentShortcuts` exactly like the admin pages do.
- `ShortcutForm` has no built-in `readonly` mode, so members don't get to see the form at all on the edit page; they see a read-only details card instead. This is a deliberate UX choice rather than a shared-component change.

## Routes shipped

- `app/(authenticated)/org/[slug]/shortcuts/layout.tsx` — server shell → client layout.
- `app/(authenticated)/org/[slug]/shortcuts/OrgShortcutsLayoutClient.tsx` — slug/role resolver + tabbed nav + role badge.
- `app/(authenticated)/org/[slug]/shortcuts/OrgShortcutsContext.tsx` — provider/hook for `{ slug, organizationId, organizationName, role, canWrite }`.
- `app/(authenticated)/org/[slug]/shortcuts/page.tsx` — dashboard with stat cards + tile navigation.
- `app/(authenticated)/org/[slug]/shortcuts/shortcuts/page.tsx` — `<ShortcutList scope="organization" scopeId={orgId}>` + create/duplicate modals.
- `app/(authenticated)/org/[slug]/shortcuts/categories/page.tsx` — `<CategoryTree>` + `<CategoryForm>` + owned delete AlertDialog.
- `app/(authenticated)/org/[slug]/shortcuts/content-blocks/page.tsx` — `<ContentBlockList>` + `<ContentBlockForm>`.
- `app/(authenticated)/org/[slug]/shortcuts/edit/[id]/page.tsx` — shell + modal for admins, read-only details card for members.

## Change log
| Date | Who | Change |
|---|---|---|
| 2026-04-21 | claude | Created `OrgShortcutsContext` + `OrgShortcutsLayoutClient` — slug → organizationId/role resolver, tabbed sub-nav with role badge, mirrors admin layout shape. |
| 2026-04-21 | claude | Created `layout.tsx` — mounts client layout. |
| 2026-04-21 | claude | Created `page.tsx` — dashboard with stat cards, tile navigation, permission-aware callout. |
| 2026-04-21 | claude | Created `shortcuts/page.tsx` — mounts `<ShortcutList scope="organization">`; members get `readonly`, admins get create/duplicate modals. |
| 2026-04-21 | claude | Created `categories/page.tsx` — mounts `<CategoryTree>` + `<CategoryForm>` with owned delete AlertDialog; write handlers are `undefined` for members. |
| 2026-04-21 | claude | Created `content-blocks/page.tsx` — mounts `<ContentBlockList>` + `<ContentBlockForm>` with same role gating. |
| 2026-04-21 | claude | Created `edit/[id]/page.tsx` — admin path reuses the Phase 11 shell+modal pattern; member path renders a read-only details card (label, description, hotkey, active status) instead of opening the form. |

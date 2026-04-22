# FEATURE.md — `sharing`

**Status:** `stable`
**Tier:** `1` — foundation for every collaborative surface
**Last updated:** `2026-04-22`

> Single source of truth for the sharing and permissions system. For hands-on usage patterns (copy-paste snippets for wiring sharing into a new feature), see [`README.md`](./README.md). This doc covers the architecture, invariants, and agent-relevant internals.

---

## Purpose

One RLS-backed permissions system that makes any resource type shareable with users, organizations, or the public. Every collaborative feature in the app — prompts, notes, agents, canvases, tasks, chats, flashcards, and more — plugs into this system. There is one `permissions` table, one component set, one RPC surface.

---

## Entry points

**Components** (`features/sharing/components/`)
- `ShareButton.tsx` — self-contained button that opens `ShareModal`; shows Private/Shared/Public status
- `ShareModal.tsx` — three-tab dialog (Users / Organizations / Public), the only UI surface owners need
- `PermissionsList.tsx` — list of current grants with inline level edit + revoke
- `PermissionBadge.tsx` — visual permission-level badge (viewer / editor / admin)
- `tabs/ShareWithUserTab.tsx` — user search + invite form
- `tabs/ShareWithOrgTab.tsx` — org picker (constrained to caller's orgs)
- `tabs/PublicAccessTab.tsx` — toggle + link copy for `is_public = true`

**Hooks** (`utils/permissions/hooks.ts`)
- `useSharing(resourceType, resourceId, enabled)` — full CRUD used inside `ShareModal`
- `useSharingStatus(resourceType, resourceId)` — lightweight `is_public` check safe for list cards
- `useIsOwner(resourceType, resourceId)` — ownership check from the resource row
- `useCanEdit(resourceType, resourceId)` / `useCanAdmin(...)` — level gating for UX
- `usePermissionCheck({ resourceType, resourceId, requiredLevel })` — generic gate
- `useSharedWithMe(resourceType?)` — resources directly granted to the current user (no hierarchy)
- `usePermissions(...)` / `useResourcePermissions(...)` — raw permission lists

**Services**
- `utils/permissions/service.ts` — all DB calls; every write routes through a `SECURITY DEFINER` RPC
- `features/sharing/emailService.ts` — client-side resource-shared notification (legacy; prefer server route)
- `lib/email/exportService.ts` → `emailShareLink()` — email-link-to-self helper

**API routes**
- `POST /api/sharing/notify` — server-side sharing notification (used by `shareWithUser()` fire-and-forget)
- `POST /api/sharing/email-link` — email the share URL to the current user

**Public barrels**
- `features/sharing/index.ts` re-exports both the components and everything in `@/utils/permissions`
- Consumers should import from `@/features/sharing` or `@/utils/permissions` — never from internal paths

---

## Data model

### Database

| Table / object | Role |
|---|---|
| `permissions` | The single grants table. Row per (resource_type, resource_id, target). Target is exactly one of: `granted_to_user_id`, `granted_to_organization_id`, or `is_public` sentinel. Columns: `permission_level` (`viewer` / `editor` / `admin`), `created_at`, `created_by`. |
| `<resource>.is_public` | Public visibility lives on the **resource row**, not the permissions table. Owner-controlled, toggled via `make_resource_public` / `make_resource_private`. |
| `<resource>.user_id` | Ownership is always the resource row's `user_id`. No explicit "owner" permission row exists. |

### Key RPCs (all `SECURITY DEFINER`)

Writes:
- `share_resource_with_user(p_resource_type, p_resource_id, p_target_user_id, p_permission_level)`
- `share_resource_with_org(p_resource_type, p_resource_id, p_target_org_id, p_permission_level)` — also validates caller's org membership
- `update_permission_level(...)`
- `revoke_resource_access(...)` — user grant
- `revoke_resource_org_access(...)` — org grant
- `make_resource_public(...)` / `make_resource_private(...)` — flip `is_public` on the resource row

Reads:
- `get_resource_permissions(p_resource_type, p_resource_id)` — owner-only; returns rows with resolved user/org display data
- `is_resource_owner(p_resource_type, p_resource_id)` — universal ownership check
- `check_resource_access(...)` — single RLS engine; evaluates owner, assignee, direct grant, project / workspace / org hierarchy in one query
- `has_permission(resource_type, resource_id, level)` — the function every RLS policy calls

### RLS enforcement

Every shareable resource table has a SELECT policy of the form `user_id = auth.uid() OR is_public = true OR has_permission(<resource_type>, id, 'viewer')`. UPDATE / DELETE policies bump the required level to `'editor'` / `'admin'`. Child tables (e.g. `cx_message`) check the parent resource, not themselves.

### Key types (`utils/permissions/types.ts`)

- `ResourceType` — union of 20+ resource identifiers (see README table; includes `prompt`, `note`, `canvas_items`, `user_tables`, `user_lists`, `transcripts`, `quiz_sessions`, `sandbox_instances`, `user_files`, `prompt_actions`, `flashcard_data`, `flashcard_sets`, `cx_conversation`, `tasks`, `agent`, and legacy `workflow` / `recipe` / `conversation` / `applet` / `broker_value` / `message` / `organization` / `scrape_domain`)
- `PermissionLevel` — `'viewer' | 'editor' | 'admin'`, ordered via `satisfiesPermissionLevel()`
- `Permission` / `PermissionWithDetails` — raw row vs. RPC-enriched row with user/org info
- `ShareActionResult` — `{ success, message?, error?, permission? }` — uniform return shape for every write
- `PermissionError` + `PermissionErrorCode` enum — typed error boundary

### Resource-type aliases

Legacy aliases are mapped to table names inside `getTableName()` in `service.ts` (e.g., `prompt -> prompts`, `note -> notes`, `agent -> agx_agent`). New resource types should use the exact table name — no alias needed.

---

## Key flows

### 1. Sharing a resource with a user

1. Owner opens `ShareButton` → `ShareModal` mounts → `useSharing(resourceType, resourceId, isOpen)` fires `listPermissions()` via `get_resource_permissions` RPC.
2. Owner submits `ShareWithUserTab` form → `shareWithUser({ resourceType, resourceId, userId, permissionLevel })`.
3. `service.shareWithUser` calls `share_resource_with_user` RPC — RPC validates auth, ownership, level, duplicate.
4. On success, a fire-and-forget `fetch('/api/sharing/notify', ...)` kicks off the email. Notification failure does **not** fail the grant.
5. `useSharing.refresh()` re-fetches permissions; modal UI updates.

### 2. Making a resource public (or private)

1. Owner toggles in `PublicAccessTab`.
2. `makePublic()` / `makePrivate()` call `make_resource_public` / `make_resource_private` RPCs — both update `is_public` on the **resource row**, never the permissions table.
3. `useSharingStatus` re-reads `is_public` from the resource row on next mount (no cache busting needed).

### 3. Permission check at read time

1. Any authenticated client query on a shareable resource hits the table.
2. RLS policy invokes `has_permission(resource_type, id, 'viewer')` plus `is_public` / `user_id = auth.uid()` shortcuts.
3. Row is returned or silently omitted — no error, no client-side check required.
4. **UI-level checks** (`useCanEdit`, `useIsOwner`) only drive the UX: which buttons to disable, whether to show a "Save as Copy" warning. They are never the security boundary.

### 4. Surfacing shared items in list pages

Two supported patterns (see README for full snippets):

- **Custom RPC** — recommended. Define `get_<resources>_shared_with_me()` that joins `permissions` → resource table → `auth.users`, returning owner email + permission level. Call from a Server Component in parallel with the owned-items query.
- **Client hook** — `useSharedWithMe(resourceType)` returns a `Permission[]` from the permissions table; fetch resource details separately. Only reflects direct grants, **not** hierarchy-inherited access.

### 5. Email notifications

- **Resource shared with user** — server route `POST /api/sharing/notify` (called fire-and-forget from `shareWithUser()`). Uses `lib/email/client.ts` + `emailTemplates.resourceShared()`. Respects `user_email_preferences.sharing_notifications`.
- **Email link to self** — server route `POST /api/sharing/email-link`. User-initiated from `ShareModal` header button.
- `features/sharing/emailService.ts` is a parallel client-side path kept for legacy callers; new code should use the API routes (server owns `RESEND_API_KEY` + `EMAIL_FROM`).

### 6. Adding a new shareable resource type (the pattern)

1. Database: add `user_id` + `is_public` columns; add RLS policies using `has_permission(<new_type>, id, <level>)`.
2. `utils/permissions/types.ts`: append the new identifier to `ResourceType` and `getResourceTypeLabel()`.
3. `utils/permissions/service.ts`: if the identifier is not the exact table name, add it to `legacyMap` in `getTableName()`.
4. `ShareModal.getShareUrl()`: add the URL pattern (edit/view route) for the new type.
5. Drop `ShareButton` into the owner UI. That's the whole integration.
6. For the list page, create a `get_<resources>_shared_with_me()` RPC (preferred) or use `useSharedWithMe(resourceType)`. Render a "Shared with Me" section using the Collapsible pattern from `features/prompts/components/layouts/PromptsGrid.tsx`.
7. For detail/edit pages, create a `get_<resource>_access_level(id)` RPC returning `(is_owner, permission_level, owner_email, can_edit, can_delete)`, then gate the UI on it. Reference: `features/prompts/components/builder/SharedPromptWarningModal.tsx`.

---

## Invariants & gotchas

- **One permissions table. Always.** Never create a per-resource permissions/ACL table. The entire system collapses without the shared shape.
- **RLS is the security boundary.** `useIsOwner` / `useCanEdit` / etc. are UX only. A bypassed client check must not be a privilege escalation.
- **`is_public` lives on the resource row, not `permissions`.** Read via `getResourceVisibility()` / `useSharingStatus()`. Writing `is_public = true` rows into the permissions table is legacy and must not be done in new code.
- **Never write directly to the `permissions` table from the client.** Every mutation must go through a `SECURITY DEFINER` RPC. Direct writes bypass ownership validation.
- **`useSharingStatus()` is intentionally lightweight.** It does NOT call `get_resource_permissions` — safe to mount on every grid card. Full permission details are only loaded when `ShareModal` opens.
- **Permission changes are immediate; no cache invalidation needed.** RLS evaluates per-query. There is no Redux cache of permissions to invalidate. The only client state is the modal's in-memory list, refreshed by `useSharing.refresh()`.
- **Exactly one target per permission row.** `grantedToUserId`, `grantedToOrganizationId`, and `isPublic` are mutually exclusive — `validatePermission()` enforces this.
- **Child resources inherit via parent checks.** E.g., `cx_message` RLS calls `has_permission('cx_conversation', conversation_id, 'viewer')`, not `has_permission('cx_message', ...)`. Don't register child tables as separate resource types.
- **Owner can always delegate.** Non-owners with `admin` cannot currently re-share — only the resource `user_id` passes the RPC's ownership check. If delegation becomes a requirement, change the RPCs, not the client.
- **Shared users editing an original surface a "Save as My Copy" warning** before writes land. Feature-level concern — see `features/prompts/components/builder/SharedPromptWarningModal.tsx` for the canonical pattern.
- **Legacy resource-type names break silently.** Calling `ShareButton` with `resourceType="canvas"` (legacy) vs. `"canvas_items"` (current) resolves to different URLs and different RLS policies. When in doubt, use the exact table name.

---

## Related features

- **Depends on:** `utils/permissions/*` (lives outside `features/` — the core logic), `features/organizations/` (org-as-target for shares), `lib/email/*` (notification delivery)
- **Depended on by:** `features/prompts/` (gold-standard integration), `features/agents/components/sharing/`, `features/notes/`, `features/canvas/`, `features/cx-chat/`, `features/cx-conversation/`, `features/tasks/`, `features/window-panels/windows/ShareModalWindow.tsx`, and every other resource type listed under `ResourceType`
- **Cross-links:**
  - `features/scope-system/FEATURE.md` (forthcoming) — the broader project/workspace/org hierarchy that `check_resource_access` evaluates on top of direct grants
  - `features/invitations/` — org invitation flow; separate system, don't fold it in
  - `features/organizations/` — target source for org-level shares
  - Reference integration: `features/prompts/` — list page, shared cards, edit-page banner, save-warning modal

---

## Current work / migration state

Stable. Active areas:
- Migrating legacy resource-type aliases (`prompt`, `note`, `conversation`, …) to exact table names as each feature is touched. Both are supported indefinitely via `getTableName()` — no forced cutover.
- The `agent` resource type points at `agx_agent` and is newly added; cross-check with the agents migration (`features/agents/migration/`) before extending.
- `features/sharing/emailService.ts` is on a slow deprecation path — prefer the `/api/sharing/notify` server route for all new notification paths.

---

## Change log

- `2026-04-22` — claude: initial FEATURE.md extracted from README.md.

---

> **Keep-docs-live rule (CLAUDE.md):** after any substantive change to sharing — new `ResourceType`, new RPC, new component, changed invariant — update this file's Data model / Invariants / Change log and keep `README.md` in sync with any new integration pattern. A stale sharing doc cascades into every feature that plugs into it.

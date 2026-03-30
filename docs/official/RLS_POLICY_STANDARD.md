# AI Matrx — RLS Policy Standard

> The single source of truth for Row Level Security across the AI Matrx ecosystem.
> Every table that holds user-created data MUST follow this standard.

---

## Access Model

Three tiers. No exceptions.

| Tier | Who can access | How it's controlled |
|---|---|---|
| **Private** | Owner only | Default. `user_id = auth.uid()` |
| **Shared** | Specific users, orgs, or inherited via hierarchy | `permissions` table + org/workspace/project membership |
| **Public** | Anyone, including unauthenticated visitors | `is_public = true` on the resource row |

There is no "authenticated read" tier. Something is either private, shared with specific people/groups, or public.

---

## Required Columns

Every table under RLS must have these columns. The auto-fill trigger handles `organization_id` and `workspace_id` automatically when `project_id` is set.

| Column | Type | Default | Purpose |
|---|---|---|---|
| `user_id` | `uuid` | — | Owner. Always required. |
| `is_public` | `boolean` | `false` | Enables unauthenticated public read. |
| `project_id` | `uuid` (nullable) | `NULL` | Links to project for hierarchy inheritance. |
| `workspace_id` | `uuid` (nullable) | `NULL` | Auto-filled from project. Do not set manually. |
| `organization_id` | `uuid` (nullable) | `NULL` | Auto-filled from project. Do not set manually. |

Tables that have an assignee concept (like `tasks`) also have `assignee_id`.

---

## The Core Function: `check_resource_access()`

This is the single function that resolves ALL access. Every policy calls it. It checks the following in order, as a **single database query** using a CTE:

```
1. Owner          → user_id = current user           → full access (no DB hit)
2. Assignee       → assignee_id = current user       → editor access (no DB hit)
3. Permission     → permissions table grant           → viewer/editor/admin
4. Project        → project_members membership        → member=viewer, admin=full
5. Workspace      → workspace_members (recursive up)  → member=viewer, admin=full
6. Organization   → organization_members              → member=viewer, admin=full
```

Steps 1-2 are pure parameter comparisons. Steps 3-6 run as one unified CTE query.

**Signature:**
```sql
check_resource_access(
  p_resource_type text,       -- table name: 'tasks', 'prompts', etc.
  p_resource_id uuid,         -- the row's id
  p_required_level permission_level,  -- 'viewer', 'editor', or 'admin'
  p_owner_id uuid,            -- the row's user_id
  p_assignee_id uuid,         -- the row's assignee_id (or NULL)
  p_project_id uuid,          -- the row's project_id (or NULL)
  p_workspace_id uuid,        -- the row's workspace_id (or NULL)
  p_organization_id uuid      -- the row's organization_id (or NULL)
)
```

---

## Policy Template

Every table gets exactly **5 policies** (6 if it has an assignee). Copy this template and replace `{TABLE}` with your table name.

```sql
-- 1. Public read (unauthenticated access)
CREATE POLICY "{TABLE}_public_read" ON public.{TABLE}
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

-- 2. Authenticated select (full hierarchy resolution)
CREATE POLICY "{TABLE}_select" ON public.{TABLE}
  FOR SELECT TO authenticated
  USING (check_resource_access(
    '{TABLE}', id, 'viewer', user_id, NULL,
    project_id, workspace_id, organization_id
  ));

-- 3. Insert (owner only)
CREATE POLICY "{TABLE}_insert" ON public.{TABLE}
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. Update (editor access)
CREATE POLICY "{TABLE}_update" ON public.{TABLE}
  FOR UPDATE TO authenticated
  USING (check_resource_access(
    '{TABLE}', id, 'editor', user_id, NULL,
    project_id, workspace_id, organization_id
  ))
  WITH CHECK (check_resource_access(
    '{TABLE}', id, 'editor', user_id, NULL,
    project_id, workspace_id, organization_id
  ));

-- 5. Delete (owner or admin only)
CREATE POLICY "{TABLE}_delete" ON public.{TABLE}
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR check_resource_access(
      '{TABLE}', id, 'admin', user_id, NULL,
      project_id, workspace_id, organization_id
    )
  );
```

**For tables with an assignee** (like `tasks`), pass `assignee_id` as the 5th argument instead of `NULL`.

---

## Sub-Table Pattern

Tables that belong to a parent (e.g., `task_comments` → `tasks`) inherit access from the parent via `EXISTS`.

### Regular sub-tables (comments, attachments, assignments)

These tables allow user writes, gated on the parent's permission level:

```sql
CREATE POLICY "{CHILD}_public_read" ON public.{CHILD}
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM {PARENT} p
    WHERE p.id = {CHILD}.{parent_id_column} AND p.is_public = true
  ));

CREATE POLICY "{CHILD}_select" ON public.{CHILD}
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM {PARENT} p WHERE p.id = {CHILD}.{parent_id_column}
    AND check_resource_access(
      '{PARENT}', p.id, 'viewer', p.user_id, p.assignee_id,
      p.project_id, p.workspace_id, p.organization_id
    )
  ));

CREATE POLICY "{CHILD}_insert" ON public.{CHILD}
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM {PARENT} p WHERE p.id = {CHILD}.{parent_id_column}
    AND check_resource_access(
      '{PARENT}', p.id, 'editor', p.user_id, p.assignee_id,
      p.project_id, p.workspace_id, p.organization_id
    )
  ));

CREATE POLICY "{CHILD}_delete" ON public.{CHILD}
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM {PARENT} p WHERE p.id = {CHILD}.{parent_id_column}
    AND check_resource_access(
      '{PARENT}', p.id, 'admin', p.user_id, p.assignee_id,
      p.project_id, p.workspace_id, p.organization_id
    )
  ));
```

### Version tables (`_versions`)

Version tables are **append-only and managed exclusively by `SECURITY DEFINER` triggers**. Users must never write to them directly. Give them **SELECT-only policies** — no INSERT, UPDATE, or DELETE:

```sql
CREATE POLICY "{PARENT}_versions_public_read" ON public.{PARENT}_versions
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM {PARENT} p
    WHERE p.id = {PARENT}_versions.{parent_id_column} AND p.is_public = true
  ));

CREATE POLICY "{PARENT}_versions_select" ON public.{PARENT}_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM {PARENT} p WHERE p.id = {PARENT}_versions.{parent_id_column}
    AND check_resource_access(
      '{PARENT}', p.id, 'viewer', p.user_id, NULL,
      p.project_id, p.workspace_id, p.organization_id
    )
  ));
```

Because the versioning triggers run as `SECURITY DEFINER`, they bypass RLS when writing snapshot rows. Adding INSERT/UPDATE/DELETE policies for users is both incorrect and dangerous — it creates a path for clients to tamper with the audit trail. See `VERSIONING_RULES.md` for the full append-only contract.

---

## Permission Levels

```
viewer  →  can read
editor  →  can read + write
admin   →  can read + write + delete + manage sharing
```

The hierarchy is strict: `admin` satisfies `editor` and `viewer` checks. `editor` satisfies `viewer`. There are no other levels.

---

## Sharing RPCs

All sharing is done through validated RPC functions. **Never insert directly into the `permissions` table from the frontend.**

| RPC | Purpose |
|---|---|
| `share_resource_with_user(type, id, user_id, level)` | Share with a specific user |
| `share_resource_with_org(type, id, org_id, level)` | Share with an entire org |
| `update_permission_level(type, id, user_id?, org_id?, level)` | Change permission level |
| `revoke_resource_access(type, id, user_id)` | Remove a specific user's access |
| `revoke_resource_org_access(type, id, org_id)` | Remove an org's access |
| `make_resource_public(type, id)` | Make publicly readable |
| `make_resource_private(type, id)` | Revoke public access |
| `get_resource_permissions(type, id)` | List all grants (owner only) |
| `is_resource_owner(type, id)` | Check if calling user owns the resource |

All RPCs validate that the caller owns the resource before making changes.

---

## Hierarchy Inheritance

When a resource belongs to a project, access flows automatically:

```
Organization
  └─ Workspace (supports nesting via parent_workspace_id)
       └─ Project
            └─ Resource (task, prompt, note, etc.)
```

**Rules:**
- Org members → viewer on all resources in the org
- Org admins/owners → full access to all resources in the org
- Workspace members → viewer on all resources in projects under that workspace
- Workspace admins/owners → full access
- Project members → viewer on all resources in the project
- Project admins/owners → full access

Workspace nesting is recursive. A member of a parent workspace inherits access to all child workspaces and their projects.

**The auto-fill trigger** (`trg_auto_fill_hierarchy`) runs on INSERT and UPDATE of `project_id`. It copies `organization_id` and `workspace_id` from the project row. Do not set these manually.

---

## Performance Rules

1. **Never call `check_resource_access()` without passing the row values.** The function takes the values as parameters specifically to avoid a second table lookup. The policy's `USING` clause already has the row.

2. **Every column referenced in a policy must be indexed.** At minimum: `user_id`, `assignee_id`, `project_id`, `is_public`.

3. **`is_public` policies run first.** Postgres evaluates permissive policies with OR logic. The `is_public = true` check is an index scan that resolves instantly for public items, before `check_resource_access` ever runs.

4. **Owner check is free.** `check_resource_access` compares `p_owner_id = auth.uid()` as a parameter comparison — zero database cost. For the common case (user viewing their own data), the function returns `true` without ever hitting a table.

---

## What NOT To Do

- **Do not create `authenticated_read` columns.** This concept is removed from the ecosystem.
- **Do not use `has_permission()` directly in policies.** Use `check_resource_access()` — it calls `has_permission` internally as part of its CTE.
- **Do not write inline RLS logic.** All policies should call `check_resource_access()` to ensure consistent hierarchy resolution.
- **Do not grant `anon` INSERT/UPDATE/DELETE.** The `anon` role only gets SELECT on `is_public = true` rows.
- **Do not set `workspace_id` or `organization_id` manually.** Let the auto-fill trigger handle it from `project_id`.
- **Do not use `TO public` in policies.** Use `TO anon, authenticated` for public read, `TO authenticated` for everything else.
- **Do not add INSERT/UPDATE/DELETE policies to `_versions` tables.** Version rows are written exclusively by `SECURITY DEFINER` triggers. User-facing write policies on version tables would allow clients to tamper with the audit trail.

---

## Checklist for Adding RLS to a New Table

1. Ensure the table has: `user_id`, `is_public`, `project_id`, `workspace_id`, `organization_id`
2. Enable RLS: `ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY`
3. Create the 5 standard policies (copy the template above)
4. Verify the auto-fill trigger exists on the table (check `trg_auto_fill_hierarchy`)
5. Add indexes on `user_id`, `project_id`, and `is_public`
6. If the table has sub-tables, add inherited policies using the sub-table pattern above. For `_versions` tables specifically, use the SELECT-only version pattern — no write policies.
7. Test: owner can CRUD, shared viewer can read, shared editor can write, public read works, cross-org is blocked

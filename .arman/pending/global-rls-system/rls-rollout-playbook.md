# RLS Centralized Permissions -- Per-Feature Rollout Playbook

> **Purpose:** This is the repeatable process followed every time we adopt a feature (or set of related tables) into the centralized permissions system. It is designed to guarantee zero breaking changes.
>
> **Process:** Each feature goes through all phases below. After each feature is complete, the "Lessons Learned" section at the bottom is updated so the next rollout is smoother. Additionally, as lessoned are learned, this core document itself should be updated to make improvements, additions and modifications so each time it's used, we take a better and more direct approach with fewer roadblocks.

---

## Phase 1: Pre-Flight Audit

Before touching any SQL or code, gather everything.

### 1.1 Identify the Table Set

- [ ] List the parent table(s) and all child/junction tables
- [ ] For each table, document:
  - Column names relevant to access: `user_id`, `id`, `is_public`, `organization_id`, `shared_with`, etc.
  - Primary key column (usually `id`, but some tables use `set_id`, `user_id`, etc.)
  - Current RLS state (enabled/disabled)
  - Current policies (list every policy name, command, and qual expression)

### 1.2 Audit Database Functions

- [ ] Search for ALL database functions that reference these tables:
  ```sql
  SELECT proname, prosrc FROM pg_proc
  WHERE prosrc ILIKE '%table_name%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  ```
- [ ] For each function found, document:
  - Function name and purpose
  - Whether it uses `SECURITY DEFINER` (bypasses RLS) or `SECURITY INVOKER` (respects RLS)
  - Whether it will be affected by the new policies
  - Whether it needs to be updated

### 1.3 Audit Database Triggers

- [ ] Search for triggers on these tables:
  ```sql
  SELECT trigger_name, event_manipulation, action_statement
  FROM information_schema.triggers
  WHERE event_object_table IN ('table_name_here')
  AND event_object_schema = 'public';
  ```

### 1.4 Audit Codebase References

- [ ] Search the codebase for all references to these table names:
  - Supabase client queries (`.from('table_name')`)
  - RPC calls (`.rpc('function_name')`)
  - API routes that interact with these tables
  - React components that display/modify this data
  - Redux slices/selectors if applicable
  - Type definitions in `types/matrixDb.types.ts`
- [ ] For each reference, note:
  - File path and line
  - What operation it performs (select, insert, update, delete)
  - Whether it uses the anon key, authenticated key, or service role
  - Whether the current code relies on the existing policy behavior

### 1.5 Document Current Access Pattern

Write a plain-English summary:
- "Currently, user X can see rows where Y. They can edit rows where Z."
- "Child table access is determined by..."
- "Public/anonymous access works like..."

---

## Phase 2: Design the New Policies

### 2.1 Define the Target Access Pattern

Write the new plain-English summary:
- "Owner can do everything"
- "Users with viewer permission can SELECT"
- "Users with editor permission can SELECT + UPDATE"
- "Users with admin permission can SELECT + UPDATE + DELETE"
- "Organization members inherit permissions granted to their org"
- "Public access is granted via is_public flag or public permission row"

### 2.2 Write the SQL Migration (Draft)

For parent tables, the standard pattern is:

```sql
-- DROP existing policies
DROP POLICY IF EXISTS "old_policy_name" ON public.table_name;
-- ... drop all existing policies

-- CREATE new policies
CREATE POLICY "table_select_policy" ON public.table_name
  FOR SELECT USING (
    user_id = auth.uid()
    OR has_permission('resource_type'::text, id, 'viewer'::permission_level)
  );

CREATE POLICY "table_insert_policy" ON public.table_name
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "table_update_policy" ON public.table_name
  FOR UPDATE USING (
    user_id = auth.uid()
    OR has_permission('resource_type'::text, id, 'editor'::permission_level)
  );

CREATE POLICY "table_delete_policy" ON public.table_name
  FOR DELETE USING (
    user_id = auth.uid()
    OR has_permission('resource_type'::text, id, 'admin'::permission_level)
  );
```

For child tables (no `user_id`, access via parent):

```sql
CREATE POLICY "child_select_policy" ON public.child_table
  FOR SELECT USING (
    parent_id IN (
      SELECT id FROM parent_table
      WHERE user_id = auth.uid()
         OR has_permission('resource_type'::text, id, 'viewer'::permission_level)
    )
  );
```

### 2.3 Review for Edge Cases

- [ ] Does the table have an `is_public` column? Add `OR is_public = true` to SELECT policy
- [ ] Does the table have a `status` column (e.g., 'published')? Add status check to SELECT
- [ ] Are there admin-only operations? Add admin checks where needed
- [ ] Does the table use soft deletes (`deleted_at`)? Ensure policies filter appropriately
- [ ] Are there any `SECURITY DEFINER` functions that need to bypass the new policies?

---

## Phase 3: Execute the Migration

### 3.1 Apply the Migration

- [ ] Apply via `apply_migration` tool (single transaction -- if anything fails, nothing changes)
- [ ] Verify with: `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'table_name'`

### 3.2 Update Database Functions (if needed)

- [ ] If any functions identified in Phase 1.2 need changes, apply as a separate migration
- [ ] Test each updated function independently

### 3.3 Update Helper Functions (if this is the first rollout)

- [ ] Update `share_resource_with_user()` if the new resource type isn't supported
- [ ] Update `get_resource_permissions()` if needed
- [ ] Update `permissions` table policies if needed

### 3.4 Regenerate TypeScript Types

- [ ] Run `npx supabase gen types typescript --project-id txzxabzwovsujtloxrus --schema public > types/matrixDb.types.ts`

---

## Phase 4: Codebase Updates

### 4.1 Update Any Affected Code

- [ ] If any Supabase queries rely on old policy behavior (e.g., filtering by `shared_with` array), update them to use the new permissions-based approach
- [ ] If any RPC functions were updated, verify the calling code still sends correct parameters
- [ ] If any new sharing UI is needed, implement it (see Reusable Sharing Components below)

### 4.2 No Code Changes Needed For...

The beauty of RLS is that most code doesn't change. If the app does `.from('table').select()`, the new policies automatically filter results. The only code that changes is:
- Code that explicitly checked `shared_with` arrays
- Code that displayed sharing UI
- Code that called sharing-related RPCs

---

## Phase 5: Testing Checklist

### 5.1 Database-Level Tests (Agent Performs)

Run these SQL queries to verify policies work correctly:

```sql
-- Test as the table owner (should return data)
SET request.jwt.claims = '{"sub": "owner-user-id"}';
SELECT * FROM table_name WHERE id = 'test-id';

-- Test as unauthorized user (should return nothing)
SET request.jwt.claims = '{"sub": "random-user-id"}';
SELECT * FROM table_name WHERE id = 'test-id';
```

- [ ] Owner can SELECT their own rows
- [ ] Owner can INSERT new rows
- [ ] Owner can UPDATE their own rows
- [ ] Owner can DELETE their own rows
- [ ] Non-owner without permission gets 0 rows on SELECT
- [ ] Non-owner without permission cannot UPDATE
- [ ] Non-owner without permission cannot DELETE
- [ ] If is_public is supported: public rows visible to all authenticated users

### 5.2 Manual UI Tests (Arman Performs)

For each feature, a specific checklist is provided. The general pattern:

- [ ] **Basic CRUD:** Create, view, edit, and delete an item. Confirm all operations work exactly as before.
- [ ] **List views:** Confirm all items appear in list/grid views. No items are missing.
- [ ] **Detail views:** Confirm individual item pages load correctly.
- [ ] **Search/filter:** If the feature has search or filtering, confirm it still works.
- [ ] **API routes:** If the feature has API routes, test them (e.g., via the UI actions that trigger them).
- [ ] **RPC functions:** If the feature uses RPCs, confirm the UI still functions.
- [ ] **Public access:** If applicable, test that public items are accessible without login.
- [ ] **No new sharing yet:** At this stage, we're confirming zero regression. Sharing UI comes later.

---

## Phase 6: Sign-Off and Documentation

### 6.1 Arman Confirms

- [ ] All UI tests pass
- [ ] No regressions detected
- [ ] Feature works exactly as before

### 6.2 Update Tracking Documents

- [ ] Update `table-inventory.md` -- change RLS State to `on+centralized` for migrated tables
- [ ] Add entry to the Rollout Log below

### 6.3 Lessons Learned

- [ ] Document anything unexpected
- [ ] Document any process improvements for next time
- [ ] Update this playbook if the process should change

---

## Reusable Sharing Components (Future)

Once multiple features use the centralized system, we can build shared UI:

- **ShareDialog** -- Modal for sharing a resource with users/orgs. Takes `resourceType` and `resourceId` as props. Calls `share_resource_with_user()` RPC.
- **PermissionsList** -- Displays current permissions for a resource. Calls `get_resource_permissions()` RPC.
- **AccessBadge** -- Shows the current user's access level (owner/editor/viewer/public).
- **VisibilityToggle** -- Toggle for making a resource public/private.

These are built after 2-3 features are successfully migrated, when the pattern is proven.

---

## Rollout Log

| Date | Feature | Tables | Result | Notes |
|------|---------|--------|--------|-------|
| _TBD_ | _CX System (Pilot)_ | _cx_conversation, cx_message, cx_request, cx_user_request, cx_media_ | _Pending_ | _First rollout. Also upgrades helper functions._ |

---

## Lessons Learned

_Updated after each rollout._

1. _(None yet -- will be populated after pilot)_

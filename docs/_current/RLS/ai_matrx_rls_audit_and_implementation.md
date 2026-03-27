# AI Matrx — RLS & Sharing Infrastructure Audit + Gold Standard Implementation

## Executive Summary

This document is the result of a comprehensive audit of the AI Matrx Supabase database (`automation-matrx`). It identifies the current state of RLS across ~180 tables, defines the "gold standard" pattern, and provides the migration to bring the `tasks` table (and sub-tables) into full compliance. It also includes best practices for going live.

---

## 1. Audit Findings

### 1.1 Current RLS Landscape

Of the ~180 public tables, RLS is enabled on ~130. The remaining ~50 have it disabled (mostly reference/config tables like `ai_model`, `broker`, `category`, `recipe_message`, etc.).

**Three distinct RLS patterns exist today:**

| Pattern | Tables Using It | Description |
|---|---|---|
| **Simple Owner CRUD** | `conversation`, `message`, `recipe`, `cx_agent_memory` | `user_id = auth.uid()` — private to owner, no sharing |
| **Owner + has_permission()** | `prompts`, `notes`, `ai_runs`, `ai_tasks`, `canvas_items`, `user_tables`, `flashcard_data`, `cx_conversation`, `transcripts`, `sandbox_instances` | Owner has full access, others get access via the `permissions` table with `has_permission()` |
| **Owner + is_public + has_permission()** | `content_template`, `canvas_items`, `compiled_recipe`, `workflow`, `prompt_actions` | All three access layers: public read, owner CRUD, and permission-based sharing |

### 1.2 Gold Standard: `content_template` and `canvas_items`

These tables implement the most complete pattern today. Their SELECT policies follow this structure:

```
is_public = true                                    -- Public read (no auth needed)
OR user_id = auth.uid()                             -- Owner access
OR has_permission('table_name', id, 'viewer')       -- Explicit sharing
```

And for writes:
```
user_id = auth.uid()                                -- Owner can always write
OR has_permission('table_name', id, 'editor')       -- Shared editors
```

Delete:
```
user_id = auth.uid()                                -- Owner
OR has_permission('table_name', id, 'admin')        -- Shared admins
```

**What's missing from the current gold standard:** Hierarchy inheritance. None of the current tables walk up the Org → Workspace → Project chain. This is the gap we're filling.

### 1.3 Prompts Table Evaluation

The `prompts` table follows the **Owner + has_permission()** pattern but does NOT have:
- `is_public` flag (no unauthenticated public read)
- `authenticated_read` flag  
- Hierarchy inheritance (org/workspace/project resolution)

It needs to be upgraded to the new gold standard after tasks.

### 1.4 Core Permission Functions Found

| Function | Purpose |
|---|---|
| `has_permission(type, id, level)` | Checks permissions table for direct user, org, or public grants |
| `is_resource_owner(type, id)` | Dynamic ownership check via `user_id` column |
| `share_resource_with_user(type, id, user_id, level)` | Inserts a permission row (with ownership validation) |
| `get_resource_permissions(type, id)` | Returns all permissions for a resource (owner-only) |
| `auth_is_project_admin(id)` | Checks if caller is project admin |
| `auth_is_project_member(id)` | Checks if caller is project member |
| `auth_is_org_admin(id)` | Checks if caller is org admin |
| `auth_is_org_member(id)` | Checks if caller is org member |

### 1.5 Tasks Table — Before This Migration

The tasks table had 4 basic policies:
- Insert: `user_id = auth.uid()`
- Select: `user_id = auth.uid() OR assignee_id = auth.uid()`
- Update: same as select
- Delete: `user_id = auth.uid()`

**Problems:** No public access. No sharing. No hierarchy inheritance. No authenticated read. Sub-tables (`task_comments`, `task_assignments`, `task_attachments`) had either minimal or no RLS.

---

## 2. The Gold Standard Pattern

### 2.1 Access Hierarchy

```
User (owner)
  └─ Organization (org admins get admin, members get viewer)
       └─ Workspace (ws admins get admin, members get viewer)
            └─ Project (project admins get admin, members get viewer)
                 └─ Task (direct permissions, assignee = editor)
                      └─ Sub-items (inherit from parent task)
```

### 2.2 Access Resolution Order (for SELECT)

For every row, these checks run in order (first match wins):

1. **is_public = true** → Allow (anon + authenticated, no auth needed)
2. **authenticated_read = true** → Allow (any logged-in user)
3. **user_id = auth.uid()** → Allow (owner)
4. **assignee_id = auth.uid()** → Allow (for tasks specifically)
5. **has_permission('tasks', id, 'viewer')** → Check permissions table
6. **Project membership** → If task.project_id is set, project members get viewer
7. **Workspace membership** → Walk up from project, ws members get viewer, ws admins get full
8. **Organization membership** → Walk up from project, org admins get full

### 2.3 Policy Structure Per Table

Each table in the ecosystem should have these policies:

| Policy Name | Command | Role | Logic |
|---|---|---|---|
| `{table}_public_read` | SELECT | anon, authenticated | `is_public = true` |
| `{table}_authenticated_read` | SELECT | authenticated | `authenticated_read = true` |
| `{table}_select_hierarchy` | SELECT | authenticated | Owner OR assignee OR `has_{table}_access(id, 'viewer')` |
| `{table}_insert` | INSERT | authenticated | `user_id = auth.uid()` |
| `{table}_update` | UPDATE | authenticated | Owner OR assignee OR `has_{table}_access(id, 'editor')` |
| `{table}_delete` | DELETE | authenticated | Owner OR `has_{table}_access(id, 'admin')` |

Sub-tables (comments, attachments, assignments) inherit access from their parent via EXISTS subqueries.

---

## 3. What the Migration Does

The included SQL migration (`rls_gold_standard_migration.sql`) performs:

1. **Schema additions**: `is_public`, `organization_id`, `workspace_id` columns on tasks
2. **Performance indexes**: Composite indexes on all RLS-queried columns
3. **`has_task_access()` function**: The hierarchy resolver that walks User → Task → Project → Workspace → Org
4. **Drop old policies**: Removes the 4 naive policies on tasks and 4 on task_comments
5. **Create gold standard policies**: 6 policies on tasks, 5 on task_comments, 3 on task_assignments, 4 on task_attachments
6. **RPC functions**: `share_task()`, `make_task_public()`, `make_task_private()`, `revoke_task_access()`, `share_project_tasks()`
7. **Auto-fill trigger**: When a task gets a `project_id`, the trigger auto-populates `organization_id` and `workspace_id`
8. **Backfill**: Updates existing tasks with missing hierarchy data

---

## 4. Best Practices for Going Live

### 4.1 RLS Performance

**This is the #1 production concern.** Every SELECT, UPDATE, DELETE hits RLS policies. Slow policies = slow app.

- **Always index RLS-referenced columns.** Every column in a USING clause needs an index. The migration includes all necessary indexes.
- **Use `STABLE SECURITY DEFINER` on helper functions.** This tells Postgres the function returns the same result within a single statement, enabling plan caching. All our functions use this.
- **Avoid `SELECT *` in policies.** The `EXISTS (SELECT 1 ...)` pattern is far cheaper than loading full rows.
- **Monitor with `pg_stat_statements`.** After launch, watch for slow queries. Common culprits are missing indexes on `organization_members.user_id` or `workspace_members.user_id`.
- **Consider materialized views** for extremely hot paths if needed. A `user_accessible_tasks` view that pre-computes access could be an option at scale.

### 4.2 The `anon` Role

For public-facing features, you MUST configure Supabase correctly:

- Ensure your Supabase project has the `anon` key enabled.
- Public SELECT policies should target `TO anon, authenticated` (not just `TO public` which is a PostgreSQL meta-role).
- Never allow `anon` INSERT/UPDATE/DELETE unless you have rate limiting.
- Test public access by making a request with only the `anon` key (no JWT).

### 4.3 Service Role Bypass

The `service_role` key bypasses ALL RLS. This is correct and intentional for AI Dream (your Python backend). However:

- **Never expose the service_role key to the frontend.** It goes in server-side environment variables only.
- **Validate at the application layer** when using service_role. RLS won't protect you; your Python code must check permissions.
- Consider adding `service_role` ALL policies explicitly to critical tables for documentation clarity.

### 4.4 Permission Enum Best Practices

The current `permission_level` enum is `viewer | editor | admin`. This is solid. The hierarchy is:
- `viewer` ⊂ `editor` ⊂ `admin`

The `has_permission()` function correctly implements this (an `admin` permission satisfies a `viewer` check). **Do not add more enum values** unless absolutely necessary — each new level increases policy complexity.

### 4.5 Multi-Tenancy Considerations

Since companies will use AI Matrx, each company = one Organization. Key rules:

- **Organization isolation is enforced by RLS**, not application code. A user can only see data from orgs they're a member of.
- **Cross-org sharing** works through the `permissions` table (grant to a specific user, not an org). This is correct — you don't want to accidentally share Company A's data with all of Company B.
- **Personal orgs** (is_personal = true) should never have members besides the creator. Consider adding a check constraint or trigger.
- **Org deletion** should cascade properly. Review your ON DELETE actions.

### 4.6 Testing Checklist Before Go-Live

Run these scenarios with actual Supabase client calls (not service_role):

| # | Scenario | Expected |
|---|---|---|
| 1 | Unauthenticated user fetches a public task | ✅ Returns task |
| 2 | Unauthenticated user fetches a private task | ❌ Empty result |
| 3 | Authenticated user fetches own task | ✅ Returns task |
| 4 | Authenticated user fetches another user's private task | ❌ Empty result |
| 5 | User fetches task after `share_task()` with 'viewer' | ✅ Returns task |
| 6 | Shared viewer tries to UPDATE task | ❌ Denied |
| 7 | Shared editor tries to UPDATE task | ✅ Allowed |
| 8 | Project member fetches task in their project | ✅ Returns task |
| 9 | Workspace member fetches task in ws project | ✅ Returns task |
| 10 | Org admin fetches any task in org | ✅ Returns task |
| 11 | User from different org fetches task | ❌ Empty result |
| 12 | Assignee can update but not delete | ✅ Update works, ❌ Delete denied |
| 13 | Task comments visible to task viewers | ✅ Visible |
| 14 | Task attachments visible on public tasks | ✅ Visible |

### 4.7 Rollout Approach for Remaining Tables

After tasks, apply the same pattern to these tables in order of priority:

1. **prompts** — Already has `has_permission()`, needs `is_public`, hierarchy
2. **notes** — Same upgrade path
3. **workflows** — Already has `public_read` and `authenticated_read`, needs hierarchy  
4. **cx_conversation** — Already uses `has_permission()`, needs hierarchy
5. **canvas_items** — Already close to gold standard
6. **user_tables + table_data** — Already uses `has_permission()`

For each table, the pattern is:
1. Add `is_public`, `organization_id`, `workspace_id` columns
2. Create a `has_{table}_access()` function
3. Drop old policies
4. Create gold standard policies
5. Add auto-fill trigger
6. Backfill hierarchy data

### 4.8 Audit Logging

For enterprise customers, consider adding an audit log. The `context_access_log` table already exists. Extend it or create a general-purpose audit table:

```sql
CREATE TABLE IF NOT EXISTS access_audit_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  action text NOT NULL, -- 'read', 'create', 'update', 'delete', 'share'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

Log sharing events from your RPC functions. This is invaluable for compliance.

### 4.9 Rate Limiting for Public Endpoints

If you expose public tasks/agents/prompts on a public website, add rate limiting:

- Use Supabase Edge Functions or your AI Dream backend as a proxy
- The `prompt_app_rate_limits` table is a good pattern to follow
- Consider per-IP rate limiting for unauthenticated access

---

## 5. Tables Without RLS (Action Required)

These 50+ tables have RLS disabled. Before go-live, every table needs a decision:

**Safe to leave RLS off** (reference/config data, no user data):
`ai_model`, `ai_provider`, `ai_endpoint`, `ai_model_endpoint`, `ai_settings`, `ai_agent`, `category`, `subcategory`, `registered_node`, `node_category`, `broker`, `data_broker`, `data_input_component`, `data_output_component`, `display_option`, `processor`, `transformer`, `action`, `arg`, `tools`, `registered_function`, `system_function`

**Need RLS enabled** (contain user data or business logic):
`task_assignments`, `task_attachments` (handled in this migration), `custom_app_configs`, `custom_applet_configs`, `field_components`, `component_groups`, `recipe_message`, `message_template`, `workflow_data`, `workflow_edge`, `workflow_node_data`, `workflow_relay`, `workflow_user_input`

**Evaluate** (may contain sensitive data):
`api_request_log` (82K rows — sensitive), `scrape_parsed_page` (2.3K rows), `emails`, `invitation_requests`

---

## 6. Summary

The AI Matrx ecosystem now has a clearly defined "gold standard" for RLS:

1. **Three access tiers**: Public (anon), Authenticated Read, and Full Hierarchy
2. **One centralized permissions table** with consistent `has_permission()` checks
3. **Hierarchy inheritance**: Org → Workspace → Project → Task flows automatically
4. **RPC-driven sharing**: Simple function calls, no manual policy manipulation
5. **Auto-fill triggers**: Assign a task to a project, and the hierarchy resolves itself

This pattern scales to enterprise multi-tenancy while keeping the developer experience simple: call `share_task()` and the rest happens automatically.

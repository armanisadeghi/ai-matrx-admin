# Supabase RLS Policy

**Phase 1 is LIVE on your database.** It's purely additive — zero breaking changes. Here's what's now in your database that wasn't there before:

**5 new universal functions:**
- `check_resource_access()` — THE function. Every gold-standard policy calls it. Resolves Owner → Assignee → Direct Permission → Project Member → Workspace Member (recursive nesting) → Org Member. You pass in the row's values directly from the policy, no dynamic SQL.
- `get_workspace_ancestors()` — Recursive CTE that walks `parent_workspace_id` up the chain. This is what makes nested workspaces work.
- `auth_is_workspace_member()` / `auth_is_workspace_admin()` — Checks membership against the workspace AND all its ancestors.
- `auto_fill_hierarchy_from_project()` — Trigger function. When any row gets a `project_id`, it auto-fills `organization_id` and `workspace_id` from the project.

**4 universal RPC functions:**
- `make_resource_public(type, id)` — Works on any table
- `make_resource_private(type, id)` — Works on any table
- `revoke_resource_access(type, id, user_id)` — Works on any table
- `set_authenticated_read(type, id, enabled)` — Works on any table
- Plus the existing `share_resource_with_user()` you already had

**New columns** on ~15 tables: `is_public`, `authenticated_read`, `organization_id`, `workspace_id`, `project_id` (wherever they were missing). All default to `false`/`null`.

**17 auto-fill triggers** — any table with `project_id + organization_id + workspace_id` now auto-populates hierarchy on insert/update.

**~20 performance indexes** on permissions, membership tables, and key lookup columns.

**Existing data backfilled** — tasks, prompts, and notes that had `project_id` now have their `organization_id` and `workspace_id` filled in.

**No policies were touched.** Everything works exactly as it did 10 minutes ago.

---

**Phase 2 is the file you just downloaded.** It's the per-table activation SQL. The approach:

1. **You're working on tasks right now** — so you look at the tasks section in that file, review the 3 specific React concerns I noted (my tasks filter, task_assignments queries, task_attachments queries), update your React code, and then either tell me to run the tasks section or paste it into the Supabase SQL editor yourself.

2. **Then prompts, then notes, then cx_conversation** — each at your own pace, coordinated with the corresponding frontend update.

3. **The template at the bottom** works for any future table. It's literally a copy-paste with find/replace on the table name.

**My recommendation:** Do it one table at a time, starting with tasks since you're in that code right now. The infrastructure is ready — each table activation is a 2-minute SQL run once the React side is ready.

Want me to run the tasks activation now, or do you want to review your React code first?
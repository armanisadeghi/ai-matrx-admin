# User Hierarchy RPC Reference

> **For:** React / Frontend team
> **Status:** Deployed to production
> **Date:** April 7, 2026

---

## Overview

Two new Supabase RPCs provide the full user hierarchy as nested JSON. They replace the need to make multiple queries or manually stitch together orgs, workspaces, and projects.

| RPC | Use case | Includes tasks? | Weight |
|-----|----------|-----------------|--------|
| `get_user_nav_tree` | Sidebar, nav, org switcher, workspace picker | No | Lightweight |
| `get_user_full_context` | Dashboard, task boards, full context views | Yes — all non-completed tasks | Heavier |

Both are `SECURITY DEFINER` functions (bypass RLS) and derive access from **org membership** — if a user is a member of an org, they see all workspaces and projects in that org. No `workspace_members` or `project_members` rows required.

---

## 1. `get_user_nav_tree`

### When to use
- Sidebar / navigation tree
- Org switcher dropdown
- Workspace picker
- Any UI that needs the structure without task data

### Supabase client call

```typescript
// From authenticated client (uses auth.uid() automatically)
const { data, error } = await supabase.rpc('get_user_nav_tree');

// OR pass explicit user_id (e.g. from server/service role)
const { data, error } = await supabase.rpc('get_user_nav_tree', {
  p_user_id: 'some-uuid'
});
```

### Response shape

```typescript
interface NavTreeResponse {
  organizations: Organization[];
}

interface Organization {
  id: string;           // uuid
  name: string;
  slug: string;
  is_personal: boolean; // true = user's personal workspace org
  role: string;         // 'owner' | 'admin' | 'member'
  workspaces: Workspace[];
  projects: Project[];  // projects NOT inside any workspace (org-level)
}

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  depth: number;                    // 0 = root, 1 = nested, etc.
  hierarchy_level_id: string | null; // links to org_hierarchy_levels
  children: Workspace[];            // recursive — same shape
  projects: Project[];
}

interface Project {
  id: string;
  name: string;
  slug: string | null;
  is_personal: boolean;
}
```

### Example response (trimmed)

```json
{
  "organizations": [
    {
      "id": "3e790542-...",
      "name": "Arman Sadeghi's Workspace",
      "slug": "arman",
      "is_personal": true,
      "role": "owner",
      "workspaces": [],
      "projects": [
        { "id": "4e34e88a-...", "name": "AI Matrx", "slug": null, "is_personal": false },
        { "id": "2e18bb30-...", "name": "Matrx Bugs", "slug": null, "is_personal": false }
      ]
    },
    {
      "id": "5dc930e9-...",
      "name": "AI Matrx",
      "slug": "ai-matrx",
      "is_personal": false,
      "role": "owner",
      "workspaces": [
        {
          "id": "55c7d2cc-...",
          "name": "Application",
          "depth": 0,
          "hierarchy_level_id": null,
          "children": [],
          "projects": [
            { "id": "f20a7677-...", "name": "AI Dream", "slug": null, "is_personal": false },
            { "id": "effc1445-...", "name": "Matrx Admin", "slug": null, "is_personal": false }
          ]
        },
        {
          "id": "1276b852-...",
          "name": "Departments",
          "depth": 0,
          "hierarchy_level_id": null,
          "children": [],
          "projects": [
            { "id": "4120aac2-...", "name": "Prompt Management", "slug": null, "is_personal": false }
          ]
        }
      ],
      "projects": []
    }
  ]
}
```

### Key behaviors
- **Sorting:** Organizations are sorted with `is_personal` first, then alphabetically. Workspaces and projects are sorted alphabetically by name.
- **Recursive nesting:** Workspaces can nest infinitely via `children`. Currently max depth is 0 (no sub-workspaces in production yet), but the recursive CTE is ready.
- **Org-level projects:** Projects without a `workspace_id` appear in the org's `projects` array. Projects inside a workspace appear in that workspace's `projects` array. A project never appears in both.

---

## 2. `get_user_full_context`

### When to use
- Dashboards showing task counts / task lists
- "My work" views
- Full context loading on app startup
- Any view that needs tasks alongside the hierarchy

### Supabase client call

```typescript
const { data, error } = await supabase.rpc('get_user_full_context');

// OR with explicit user_id
const { data, error } = await supabase.rpc('get_user_full_context', {
  p_user_id: 'some-uuid'
});
```

### Response shape

Identical to `get_user_nav_tree` except `Project` gains two fields:

```typescript
interface ProjectWithTasks extends Project {
  open_task_count: number;
  open_tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  status: string;              // currently 'incomplete' (completed are excluded)
  priority: string | null;     // 'high' | 'medium' | 'low' | null
  due_date: string | null;     // ISO date (date only, no time)
  assignee_id: string | null;  // uuid
}
```

### Task sorting
Tasks are sorted within each project by:
1. **Priority:** high → medium → low → null
2. **Due date:** earliest first, nulls last
3. **Created date:** newest first (tiebreaker)

### Task filtering
- Only tasks where `status != 'completed'` are returned
- All other statuses (currently just `incomplete`) are included

### Example project with tasks

```json
{
  "id": "4e34e88a-...",
  "name": "AI Matrx",
  "slug": null,
  "is_personal": false,
  "open_task_count": 16,
  "open_tasks": [
    {
      "id": "543075a0-...",
      "title": "Text message features - text for tasks and pictures...",
      "status": "incomplete",
      "priority": null,
      "due_date": null,
      "assignee_id": null
    }
  ]
}
```

---

## Choosing between the two

```
Page load / sidebar mount → get_user_nav_tree (fast, small payload)

Dashboard / task board    → get_user_full_context (larger, includes tasks)

Lazy load tasks later?    → get_user_nav_tree on mount,
                            then fetch tasks per-project as needed
```

If a user has many projects with many open tasks, `get_user_full_context` payload will be significantly larger. Consider using `get_user_nav_tree` for initial render and loading tasks on demand per project.

---

## Flattening helpers (frontend)

The nested structure is great for tree rendering but you may need flat lists. Here are utility patterns:

```typescript
// Extract all projects as a flat array
function flattenProjects(data: NavTreeResponse) {
  const projects: (Project & { orgId: string; orgName: string; workspaceId?: string; workspaceName?: string })[] = [];

  for (const org of data.organizations) {
    // Org-level projects
    for (const p of org.projects) {
      projects.push({ ...p, orgId: org.id, orgName: org.name });
    }
    // Workspace projects (recursive)
    function walkWorkspaces(workspaces: Workspace[], orgId: string, orgName: string) {
      for (const ws of workspaces) {
        for (const p of ws.projects) {
          projects.push({ ...p, orgId, orgName, workspaceId: ws.id, workspaceName: ws.name });
        }
        walkWorkspaces(ws.children, orgId, orgName);
      }
    }
    walkWorkspaces(org.workspaces, org.id, org.name);
  }
  return projects;
}
```

---

## Legacy functions (deprecating)

These older RPCs still exist but are **superseded** by the new ones. Do not use for new features.

| Function | Problem | Replacement |
|----------|---------|-------------|
| `get_user_hierarchy()` | Flat orgs + projects, no workspaces, no nesting | `get_user_nav_tree` |
| `agx_get_user_context_tree()` | Returns 3 flat arrays, requires explicit `workspace_members` rows (always empty) | `get_user_nav_tree` |
| `get_user_organizations(user_id)` | Only returns orgs, no children | `get_user_nav_tree` |
| `get_user_projects(p_org_id)` | Flat project list, requires `project_members` rows | `get_user_nav_tree` |
| `get_workspace_ancestors(p_workspace_id)` | Single-workspace ancestor lookup — still useful as a utility | Keep as-is |

---

## Data integrity: auto-fill trigger

A `BEFORE INSERT OR UPDATE` trigger on the `projects` table (`trg_auto_fill_hierarchy_from_project`) now automatically resolves `organization_id`:

1. If `workspace_id` is set → inherits `organization_id` from the workspace
2. If still null → falls back to the creator's personal org

**This means the frontend never needs to explicitly set `organization_id` when creating a project inside a workspace.** Just set `workspace_id` and the trigger handles it.

---

## Notes

- Both RPCs accept an optional `p_user_id` parameter. When called from an authenticated Supabase client, it defaults to `auth.uid()` automatically. Only pass it explicitly from service-role / server contexts.
- The `hierarchy_level_id` on workspaces links to `org_hierarchy_levels` — use this for rendering semantic labels (e.g., "Client" instead of "Workspace" for depth 0 in Titanium).
- Workspace `depth` is 0-indexed from the org root. Currently all workspaces are depth 0 (no sub-workspaces yet), but the recursive structure is ready.

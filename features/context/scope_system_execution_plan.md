# Scope System — Execution Plan

**Status:** Ready to execute
**Database:** automation-matrx (`txzxabzwovsujtloxrus`)

---

## What We Are Building

Three new tables that give every organization flexible, many-to-many categorization of their work. An admin defines category types (Client, Department, Disease, Phase). Users create values within those types (Anthropic, SEO, Alzheimer's, Phase 2). Any entity (project, task, conversation, note, file) gets tagged with any combination of values. No duplication. No forced hierarchy. Full context for AI agents.

### The Tables

```
scope_types       "What kinds of categories does this org use?"
scopes            "What are the actual values within each category?"
scope_assignments "Which entities are tagged with which values?"
```

### The Hierarchy (Unchanged)

```
auth.users
  └── organizations
      └── projects
          └── tasks (nestable via parent_task_id)
              └── conversations / notes / files / agents / data / etc.

  [AT ANY LEVEL, entities get tagged via scope_assignments]
```

---

## Table 1: `scope_types`

Defines what categories an organization uses.

```sql
CREATE TABLE public.scope_types (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_type_id        uuid REFERENCES public.scope_types(id) ON DELETE SET NULL,
    label_singular        text NOT NULL,
    label_plural          text NOT NULL,
    icon                  text NOT NULL DEFAULT 'folder',
    description           text NOT NULL DEFAULT '',
    color                 text NOT NULL DEFAULT '',
    sort_order            smallint NOT NULL DEFAULT 0,
    default_variable_keys text[] NOT NULL DEFAULT '{}',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT unique_type_per_org UNIQUE (organization_id, label_singular)
);
```

**`parent_type_id`** defines type-level nesting rules:
- `NULL` = top-level or peer type (Client, Department, Safety Case)
- Set = must nest under this type (Site must nest under Study)

**Examples — Titanium Marketing (flat peers):**

| label_singular | parent_type_id | sort_order |
|----------------|----------------|------------|
| Client | null | 0 |
| Department | null | 1 |

**Examples — XYZ Clinical Research (nested hierarchy + peers):**

| label_singular | parent_type_id | sort_order |
|----------------|----------------|------------|
| Study | null | 0 |
| Site | → Study | 1 |
| Subject | → Site | 2 |
| Visit | → Subject | 3 |
| Safety Case | null | 10 |
| Monitoring Cycle | null | 11 |

---

## Table 2: `scopes`

The actual values within each type.

```sql
CREATE TABLE public.scopes (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    scope_type_id     uuid NOT NULL REFERENCES public.scope_types(id) ON DELETE CASCADE,
    parent_scope_id   uuid REFERENCES public.scopes(id) ON DELETE CASCADE,
    name              text NOT NULL,
    description       text NOT NULL DEFAULT '',
    settings          jsonb NOT NULL DEFAULT '{}',
    created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT unique_scope_name_per_type UNIQUE (organization_id, scope_type_id, name)
);
```

**Validation rule (enforced by trigger):**
- If this scope's type has `parent_type_id` set → `parent_scope_id` is REQUIRED and must point to a scope whose `scope_type_id` matches the parent type.
- If this scope's type has `parent_type_id = null` → `parent_scope_id` must be null.

**Examples — Titanium Marketing:**

| name | scope_type | parent_scope |
|------|-----------|-------------|
| Anthropic | Client | null |
| OpenAI | Client | null |
| Google | Client | null |
| Web Development | Department | null |
| SEO | Department | null |
| Content Writing | Department | null |
| Branding | Department | null |

**Examples — XYZ Clinical Research:**

| name | scope_type | parent_scope |
|------|-----------|-------------|
| Phase 2 Diabetes Trial | Study | null |
| UCLA | Site | → Phase 2 Diabetes Trial |
| Cedars-Sinai | Site | → Phase 2 Diabetes Trial |
| SUBJ-001 | Subject | → UCLA |
| SUBJ-002 | Subject | → UCLA |
| Week 4 Visit | Visit | → SUBJ-001 |
| SAE - Liver Event | Safety Case | null |
| Donor A | Funding Source | null |

---

## Table 3: `scope_assignments`

Many-to-many junction linking any entity to any combination of scope values.

```sql
CREATE TABLE public.scope_assignments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_id    uuid NOT NULL REFERENCES public.scopes(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id   uuid NOT NULL,
    created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT unique_assignment UNIQUE (scope_id, entity_type, entity_id)
);

CREATE INDEX idx_scope_asgn_entity ON public.scope_assignments(entity_type, entity_id);
CREATE INDEX idx_scope_asgn_scope ON public.scope_assignments(scope_id);
```

**Valid `entity_type` values:** `'project'`, `'task'`, `'conversation'`, `'note'`, `'file'`, `'transcript'`, `'data_table'`, `'workflow'`, `'agent'`, `'canvas_item'`, `'sandbox'`

**Examples — Titanium Marketing:**

| entity_type | entity (name) | scope tags |
|------------|--------------|------------|
| project | Anthropic Logo Redesign | Client: Anthropic + Dept: Branding |
| project | OpenAI SEO Audit | Client: OpenAI + Dept: SEO |
| task | Write Anthropic blog post | Client: Anthropic + Dept: Content Writing |
| conversation | "Review brand guidelines" | Client: Anthropic + Dept: Branding |

**Examples — XYZ Clinical Research:**

| entity_type | entity (name) | scope tags |
|------------|--------------|------------|
| project | UCLA Enrollment | Site: UCLA (inherits Study: Phase 2 Diabetes Trial via parent chain) |
| task | Complete SAE Report | Safety Case: SAE - Liver Event + Subject: SUBJ-001 |
| task | Week 4 Lab Results | Visit: Week 4 Visit (inherits Subject → Site → Study) |

---

## RLS Policies

### `scope_types`

```
SELECT  — org members can read
INSERT  — org admins/owners only
UPDATE  — org admins/owners only
DELETE  — org admins/owners only
```

### `scopes`

```
SELECT  — org members can read
INSERT  — org members can create (within their org)
UPDATE  — creator or org admins
DELETE  — creator or org admins
```

### `scope_assignments`

```
SELECT  — org members can read
INSERT  — authenticated users (validated: scope must be in an org the user belongs to)
DELETE  — creator or org admins
```

---

## Validation Trigger

On INSERT or UPDATE to `scopes`:

```
IF this scope's type has parent_type_id:
    REQUIRE parent_scope_id IS NOT NULL
    REQUIRE parent_scope's scope_type_id = this type's parent_type_id
ELSE (type has no parent_type_id):
    REQUIRE parent_scope_id IS NULL
```

This enforces: Sites can ONLY be children of Studies. Clients can NEVER be children of Departments. The admin's type-level rules are always respected.

---

## RPC Functions (15)

### Admin Setup (4)

| # | Function | Input | Output | Triggered by |
|---|----------|-------|--------|-------------|
| 1 | `create_scope_type` | org_id, label_singular, label_plural, parent_type_id?, icon?, description?, sort_order?, default_variable_keys? | Created type row | Admin adds a category in org settings |
| 2 | `update_scope_type` | type_id, label_singular?, label_plural?, icon?, description?, sort_order? | Updated type row | Admin edits a category |
| 3 | `delete_scope_type` | type_id | Deleted count (type + scopes + assignments) | Admin removes a category (confirmation required) |
| 4 | `list_scope_types` | org_id | Array of types with parent relationships, ordered by sort_order | Any page load needing org structure |

### Scope CRUD (5)

| # | Function | Input | Output | Triggered by |
|---|----------|-------|--------|-------------|
| 5 | `create_scope` | org_id, type_id, name, parent_scope_id?, description?, settings? | Created scope row with type label resolved | User clicks "Add Client", "Add Site", etc. |
| 6 | `update_scope` | scope_id, name?, description?, settings? | Updated scope row | User edits a scope value |
| 7 | `delete_scope` | scope_id | Deleted count (scope + children + assignments) | User removes a scope value (confirmation required) |
| 8 | `list_scopes` | org_id, type_id?, parent_scope_id? | Array of scopes with type label, child count, assignment count | Sidebar, filter dropdowns, scope picker |
| 9 | `get_scope_tree` | org_id, type_id? | Nested tree of all scopes following parent chain | Full tree views, nested selectors |

### Assignments (3)

| # | Function | Input | Output | Triggered by |
|---|----------|-------|--------|-------------|
| 10 | `set_entity_scopes` | entity_type, entity_id, scope_ids[] | Final list of assignments | User submits scope selection on any entity form |
| 11 | `get_entity_scopes` | entity_type, entity_id | Array of assigned scopes with type labels | Loading any entity to show its scope tags |
| 12 | `list_entities_by_scopes` | scope_ids[], entity_type?, match_all? (default true) | Array of entity_type + entity_id matching the filter | Filtering: "show me projects for Anthropic + SEO" |

### Navigation & Context (3)

| # | Function | Input | Output | Triggered by |
|---|----------|-------|--------|-------------|
| 13 | `get_org_structure` | org_id | Full types + scopes nested structure. One call for the sidebar. | Page load |
| 14 | `resolve_full_context` | user_id, entity_type, entity_id | Merged context dict: user vars + org vars + scope vars (by type precedence) + project vars + task vars. Sources attributed. | Every AI request |
| 15 | `search_scopes` | org_id, query, type_id? | Matching scopes with type labels | Typeahead / autocomplete when tagging |

---

## Context Resolution Logic (`resolve_full_context`)

### Input
A user_id and an entity (e.g., task: "Write Anthropic blog post")

### Steps

1. **Get entity's direct scope assignments** via `scope_assignments`
2. **For each assigned scope, walk `parent_scope_id` up** to collect the full chain
   - Example: Visit → Subject → Site → Study — all resolved automatically
3. **Collect `context_variables` from each scope** in the chain
4. **Merge with deterministic precedence:**
   - Task-level vars (highest priority)
   - Project-level vars
   - Scope vars, merged by type precedence (`sort_order` on `scope_types`):
     - Higher sort_order wins over lower for same key
     - Within a type chain, deeper scopes win (Subject > Site > Study)
   - Organization-level vars
   - User-level vars (lowest priority)
5. **Return:**
   ```json
   {
     "variables": { "key": { "value": "...", "source": "scope:Anthropic", ... } },
     "scope_labels": { "client": "Anthropic", "department": "SEO" },
     "context": { "user_id": "...", "organization_id": "...", "project_id": "...", "task_id": "..." }
   }
   ```

### What the agent sees

```xml
<agent_context>
  <scope>
    organization: Titanium Marketing
    client: Anthropic
    department: Content Writing
    project: Blog Content Calendar
    task: Write Anthropic blog post
  </scope>
  <variables>
    brand_voice: Bold and technical           [scope: Anthropic]
    target_audience: AI developers            [scope: Anthropic]
    department_lead: Sarah Chen               [scope: Content Writing]
    seo_tools: Ahrefs, Surfer SEO            [organization]
    response_style: concise, action-oriented  [user]
  </variables>
</agent_context>
```

---

## What Gets Dropped

### Tables to DROP

| Table | Reason |
|-------|--------|
| `org_hierarchy_levels` | Replaced by `scope_types` |
| `workspace_members` | No scope-level membership (access via org/project RLS) |
| `workspace_invitations` | Same reason |

### Tables to KEEP but modify

| Table | Change |
|-------|--------|
| `workspaces` | Drop all data, repurpose OR drop entirely after removing all FKs |

### Columns to DROP (from 26+ tables)

All `workspace_id` columns on:
`projects`, `tasks`, `cx_conversation`, `notes`, `user_tables`, `user_files`, `transcripts`, `workflow`, `prompts`, `canvas_items`, `app_instances`, `sandbox_instances`, `user_active_context`, `context_variables`, `agx_agent`, `agx_shortcut`, `ai_runs`, `ai_tasks`, `broker_values`, `content_template`, `context_items`, `flashcard_data`, `flashcard_sets`, `prompt_actions`, `prompt_apps`, `quiz_sessions`

### Functions to DROP

| Function | Reason |
|----------|--------|
| `resolve_context_variables` | Replaced by `resolve_full_context` |
| `resolve_active_context` | Replaced by `resolve_full_context` |
| `auth_is_workspace_admin` | No workspace membership model |
| `auth_is_workspace_member` | No workspace membership model |
| `get_workspace_ancestors` | Replaced by scope parent chain walking |

### Functions to UPDATE (workspace_id parameter removal)

| Function |
|----------|
| `agx_get_shortcuts_for_context` |
| `get_broker_values_for_context` (both overloads) |
| `get_complete_broker_data_for_context` (both overloads) |
| `get_context_item_value` |
| `get_context_items_by_fetch_hint` |
| `get_context_items_manifest` |
| `resolve_context_items_for_agent` |

### `context_variables` — Change the scope model

The `exactly_one_scope` CHECK constraint currently includes `workspace_id`. This needs to change to include `scope_id` instead:

```sql
-- New constraint:
CHECK (
    (CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN organization_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN scope_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN project_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END) = 1
)
```

Add `scope_id uuid FK → scopes` column, drop `workspace_id` column.

### `user_active_context` — Replace workspace_id

Drop `workspace_id`. The active context is now determined by the entity the user is working on + its scope assignments. No single workspace_id needed.

---

## AppContext (Python)

Remove `workspace_id`. The Python `AppContext` dataclass no longer carries a workspace_id. Scope information is resolved from the entity's `scope_assignments` at request time via `resolve_full_context`.

```python
# BEFORE:
organization_id: str | None = None
workspace_id: str | None = None      # ← REMOVE
project_id: str | None = None
task_id: str | None = None

# AFTER:
organization_id: str | None = None
project_id: str | None = None
task_id: str | None = None
```

Scope context is carried in `metadata["scope_context"]` after resolution, not as a first-class field.

---

## Execution Order

```
Phase 1: Create new tables
  1. scope_types
  2. scopes
  3. scope_assignments
  4. Validation trigger on scopes

Phase 2: Update context_variables
  5. Add scope_id column to context_variables
  6. Drop workspace_id column from context_variables
  7. Update exactly_one_scope CHECK constraint
  8. Update unique constraints

Phase 3: Drop workspace_id from ALL 26 referencing tables
  9. Drop FK constraints first (all 29 constraints)
  10. Drop the columns
  11. Drop workspace_members table
  12. Drop workspace_invitations table  
  13. Drop org_hierarchy_levels table

Phase 4: Update user_active_context
  14. Drop workspace_id column

Phase 5: Drop/repurpose workspaces table
  15. Drop workspaces table (after all FKs removed)

Phase 6: Create RPC functions
  16. All 15 RPC functions
  17. Updated context resolution functions

Phase 7: Update existing functions
  18. Remove workspace_id from all existing function signatures
  19. Drop obsolete functions

Phase 8: RLS policies on new tables
  20. scope_types policies
  21. scopes policies
  22. scope_assignments policies
```

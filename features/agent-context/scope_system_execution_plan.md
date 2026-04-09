# AI Matrx Scope System — Final Execution Plan

**Database:** `txzxabzwovsujtloxrus` (automation-matrx)
**Table prefix:** `ctx_`

---

## Three Tables

### `ctx_scope_types`

Defines what categories an organization uses. One row per category.

```sql
CREATE TABLE public.ctx_scope_types (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_type_id           uuid REFERENCES public.ctx_scope_types(id) ON DELETE SET NULL,
    label_singular           text NOT NULL,
    label_plural             text NOT NULL,
    icon                     text NOT NULL DEFAULT 'folder',
    description              text NOT NULL DEFAULT '',
    color                    text NOT NULL DEFAULT '',
    sort_order               smallint NOT NULL DEFAULT 0,
    max_assignments_per_entity smallint,  -- NULL = unlimited, 1 = exactly one per entity
    default_variable_keys    text[] NOT NULL DEFAULT '{}',
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT unique_type_per_org UNIQUE (organization_id, label_singular)
);
```

**`parent_type_id`:** NULL = top-level/peer. Set = scopes of this type must nest under scopes of the parent type.

**`max_assignments_per_entity`:** NULL = unlimited tags of this type. 1 = entity can only have one scope of this type (e.g., one Client per project). Enforced by `set_entity_scopes` RPC.

**`sort_order`:** Controls context merge precedence AND display order. Higher sort_order types override lower for the same variable key.

**Example — Titanium Marketing:**

| label_singular | parent_type_id | sort_order | max_assignments |
|----------------|----------------|------------|-----------------|
| Client | null | 0 | 1 |
| Department | null | 1 | null |

**Example — XYZ Clinical Research:**

| label_singular | parent_type_id | sort_order | max_assignments |
|----------------|----------------|------------|-----------------|
| Study | null | 0 | 1 |
| Site | → Study | 1 | 1 |
| Subject | → Site | 2 | 1 |
| Visit | → Subject | 3 | 1 |
| Safety Case | null | 10 | null |
| Monitoring Cycle | null | 11 | 1 |

---

### `ctx_scopes`

The actual values within each type. One row per value.

```sql
CREATE TABLE public.ctx_scopes (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    scope_type_id     uuid NOT NULL REFERENCES public.ctx_scope_types(id) ON DELETE CASCADE,
    parent_scope_id   uuid REFERENCES public.ctx_scopes(id) ON DELETE CASCADE,
    name              text NOT NULL,
    description       text NOT NULL DEFAULT '',
    settings          jsonb NOT NULL DEFAULT '{}',
    created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness: name is unique among siblings (same type + same parent)
-- For top-level scopes (null parent): partial unique index
CREATE UNIQUE INDEX idx_scope_unique_top
ON public.ctx_scopes (organization_id, scope_type_id, name)
WHERE parent_scope_id IS NULL;

-- For nested scopes: unique within same parent
CREATE UNIQUE INDEX idx_scope_unique_nested
ON public.ctx_scopes (organization_id, scope_type_id, parent_scope_id, name)
WHERE parent_scope_id IS NOT NULL;
```

**Validation trigger:** enforces that `parent_scope_id` follows the type-level nesting rules defined by `parent_type_id` on `ctx_scope_types`.

**Example — XYZ Clinical Research:**

| name | scope_type | parent_scope |
|------|-----------|-------------|
| Phase 2 Diabetes Trial | Study | null |
| Phase 3 Heart Failure Trial | Study | null |
| UCLA | Site | → Phase 2 Diabetes Trial |
| UCLA | Site | → Phase 3 Heart Failure Trial |
| SUBJ-001 | Subject | → UCLA (under Phase 2) |
| SUBJ-001 | Subject | → UCLA (under Phase 3) |
| Screening | Visit | → SUBJ-001 (under Phase 2, UCLA) |
| Screening | Visit | → SUBJ-001 (under Phase 3, UCLA) |

All valid. "UCLA" appears twice — once under each Study. "SUBJ-001" appears twice — once under each UCLA. "Screening" appears under each subject. No uniqueness violation because the parent is different.

---

### `ctx_scope_assignments`

Many-to-many junction. Links any entity to any combination of scope values.

```sql
CREATE TABLE public.ctx_scope_assignments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_id    uuid NOT NULL REFERENCES public.ctx_scopes(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id   uuid NOT NULL,
    created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT unique_assignment UNIQUE (scope_id, entity_type, entity_id)
);

CREATE INDEX idx_scope_asgn_entity ON public.ctx_scope_assignments(entity_type, entity_id);
CREATE INDEX idx_scope_asgn_scope ON public.ctx_scope_assignments(scope_id);
```

**Valid `entity_type` values:** `'project'`, `'task'`, `'conversation'`, `'note'`, `'file'`, `'transcript'`, `'data_table'`, `'workflow'`, `'agent'`, `'canvas_item'`, `'sandbox'`

**Assignment validation:** `set_entity_scopes` checks `max_assignments_per_entity` on the scope's type. If max is 1 and the caller tries to assign two Clients to one project, the RPC rejects it.

---

## Validation Trigger

```sql
CREATE OR REPLACE FUNCTION ctx_validate_scope_parent()
RETURNS TRIGGER AS $$
DECLARE
    type_parent_type_id uuid;
    parent_scope_type_id uuid;
BEGIN
    -- Get this scope's type's parent_type_id
    SELECT parent_type_id INTO type_parent_type_id
    FROM ctx_scope_types WHERE id = NEW.scope_type_id;

    IF type_parent_type_id IS NOT NULL THEN
        -- Type requires a parent scope
        IF NEW.parent_scope_id IS NULL THEN
            RAISE EXCEPTION 'Scopes of this type require a parent scope (type rule)';
        END IF;
        -- Parent scope must be of the correct type
        SELECT scope_type_id INTO parent_scope_type_id
        FROM ctx_scopes WHERE id = NEW.parent_scope_id;
        IF parent_scope_type_id != type_parent_type_id THEN
            RAISE EXCEPTION 'Parent scope must be of type %, got %',
                type_parent_type_id, parent_scope_type_id;
        END IF;
    ELSE
        -- Type does not allow nesting, but same-type nesting is still allowed
        -- (e.g., sub-departments under departments)
        IF NEW.parent_scope_id IS NOT NULL THEN
            SELECT scope_type_id INTO parent_scope_type_id
            FROM ctx_scopes WHERE id = NEW.parent_scope_id;
            IF parent_scope_type_id != NEW.scope_type_id THEN
                RAISE EXCEPTION 'Cross-type nesting not allowed for this type';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_scope_parent
BEFORE INSERT OR UPDATE ON ctx_scopes
FOR EACH ROW EXECUTE FUNCTION ctx_validate_scope_parent();
```

---

## RLS Policies

### `ctx_scope_types`

```sql
-- Org members can read
CREATE POLICY scope_types_select ON ctx_scope_types
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Org admins/owners can modify
CREATE POLICY scope_types_modify ON ctx_scope_types
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));
```

### `ctx_scopes`

```sql
-- Org members can read
CREATE POLICY scopes_select ON ctx_scopes
    FOR SELECT TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Org members can create within their org
CREATE POLICY scopes_insert ON ctx_scopes
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Creator or org admins can update/delete
CREATE POLICY scopes_modify ON ctx_scopes
    FOR ALL TO authenticated
    USING (
        created_by = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
```

### `ctx_scope_assignments`

```sql
-- Org members can read
CREATE POLICY scope_asgn_select ON ctx_scope_assignments
    FOR SELECT TO authenticated
    USING (scope_id IN (
        SELECT s.id FROM ctx_scopes s
        JOIN organization_members om ON om.organization_id = s.organization_id
        WHERE om.user_id = auth.uid()
    ));

-- Authenticated users can create (RPC validates org membership)
CREATE POLICY scope_asgn_insert ON ctx_scope_assignments
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Creator or org admins can delete
CREATE POLICY scope_asgn_delete ON ctx_scope_assignments
    FOR DELETE TO authenticated
    USING (
        created_by = auth.uid()
        OR scope_id IN (
            SELECT s.id FROM ctx_scopes s
            JOIN organization_members om ON om.organization_id = s.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
        )
    );
```

---

## RPC Functions (15)

### Admin Setup

**1. `create_scope_type`**
```
IN:  p_org_id uuid, p_label_singular text, p_label_plural text,
     p_parent_type_id uuid DEFAULT NULL, p_icon text DEFAULT 'folder',
     p_description text DEFAULT '', p_sort_order smallint DEFAULT 0,
     p_max_assignments smallint DEFAULT NULL, p_default_variable_keys text[] DEFAULT '{}'
OUT: jsonb (created type row with all fields)
```
Triggered by: Admin clicks "Add Category" in org settings.

**2. `update_scope_type`**
```
IN:  p_type_id uuid, p_label_singular text DEFAULT NULL,
     p_label_plural text DEFAULT NULL, p_icon text DEFAULT NULL,
     p_description text DEFAULT NULL, p_sort_order smallint DEFAULT NULL,
     p_max_assignments smallint DEFAULT NULL
OUT: jsonb (updated type row)
```
Triggered by: Admin edits a category.

**3. `delete_scope_type`**
```
IN:  p_type_id uuid
OUT: jsonb { deleted_scopes: int, deleted_assignments: int }
```
Triggered by: Admin removes a category (confirmation dialog).

**4. `list_scope_types`**
```
IN:  p_org_id uuid
OUT: jsonb[] (types ordered by sort_order, with parent_type relationships)
```
Triggered by: Any page that needs the org structure.

### Scope CRUD

**5. `create_scope`**
```
IN:  p_org_id uuid, p_type_id uuid, p_name text,
     p_parent_scope_id uuid DEFAULT NULL, p_description text DEFAULT '',
     p_settings jsonb DEFAULT '{}'
OUT: jsonb (created scope with type label resolved)
```
Triggered by: User clicks "Add Client", "Add Site", etc. Validation trigger enforces parent rules.

**6. `update_scope`**
```
IN:  p_scope_id uuid, p_name text DEFAULT NULL,
     p_description text DEFAULT NULL, p_settings jsonb DEFAULT NULL
OUT: jsonb (updated scope)
```
Triggered by: User edits a scope value.

**7. `delete_scope`**
```
IN:  p_scope_id uuid
OUT: jsonb { deleted_children: int, deleted_assignments: int }
```
Triggered by: User removes a scope value (confirmation dialog). Cascades child scopes.

**8. `list_scopes`**
```
IN:  p_org_id uuid, p_type_id uuid DEFAULT NULL,
     p_parent_scope_id uuid DEFAULT NULL
OUT: jsonb[] (scopes with type label, child count, assignment count)
```
Triggered by: Sidebar, filter dropdowns, scope picker.

**9. `get_scope_tree`**
```
IN:  p_org_id uuid, p_type_id uuid DEFAULT NULL
OUT: jsonb (nested tree following parent_scope_id chain)
```
Triggered by: Full tree views, nested selectors.

### Assignments

**10. `set_entity_scopes`**
```
IN:  p_entity_type text, p_entity_id uuid, p_scope_ids uuid[]
OUT: jsonb[] (final assignment list with type labels)
```
Triggered by: User submits scope selection on any entity form.
Validates `max_assignments_per_entity` per type. Replaces all existing assignments for this entity.

**11. `get_entity_scopes`**
```
IN:  p_entity_type text, p_entity_id uuid
OUT: jsonb[] (assigned scopes with type labels and parent chain)
```
Triggered by: Loading any entity detail page to show its scope tags.

**12. `list_entities_by_scopes`**
```
IN:  p_scope_ids uuid[], p_entity_type text DEFAULT NULL,
     p_match_all boolean DEFAULT true
OUT: jsonb[] (entity_type + entity_id pairs matching filter)
```
Triggered by: Filtering views: "show me all projects for Client: Anthropic + Dept: SEO."
`match_all = true` → intersection (must have ALL scopes). `false` → union (any of them).

### Navigation & Context

**13. `get_org_structure`**
```
IN:  p_org_id uuid
OUT: jsonb { types: [...], scopes_by_type: { type_id: [...] } }
```
Triggered by: Page load, sidebar rendering. One call for the entire org tree.

**14. `resolve_full_context`**
```
IN:  p_user_id uuid, p_entity_type text, p_entity_id uuid
OUT: jsonb {
       scope_labels: { client: "Anthropic", department: "SEO" },
       variables: { key: { value, type, inject_as, source } },
       context: { user_id, organization_id, project_id, task_id }
     }
```
Triggered by: Every AI request — the master context resolution function.

Resolution logic:
1. Get entity's scope assignments. For each, walk `parent_scope_id` up to collect full chain.
2. Collect `context_variables` scoped to each scope in the chain.
3. If entity has no direct assignments, inherit from parent (task inherits project's scopes).
4. Merge all variables with precedence:
   - Task vars (highest)
   - Project vars
   - Scope vars, merged by `sort_order` (higher wins). Within a type chain, deeper scopes win.
   - Organization vars
   - User vars (lowest)
5. Build `scope_labels` dict: for each type with `max_assignments = 1`, resolve the single value's name. For types with multiple assignments, return an array.

**15. `search_scopes`**
```
IN:  p_org_id uuid, p_query text, p_type_id uuid DEFAULT NULL
OUT: jsonb[] (matching scopes with type labels)
```
Triggered by: Typeahead/autocomplete when tagging entities.

---

## `context_variables` Changes

Replace `workspace_id` with `scope_id`:

```sql
-- Add scope_id
ALTER TABLE context_variables
ADD COLUMN scope_id uuid REFERENCES ctx_scopes(id) ON DELETE CASCADE;

-- Drop workspace_id FK constraint, then column
ALTER TABLE context_variables DROP CONSTRAINT context_variables_workspace_id_fkey;
ALTER TABLE context_variables DROP COLUMN workspace_id;

-- Replace CHECK constraint
ALTER TABLE context_variables DROP CONSTRAINT exactly_one_scope;
ALTER TABLE context_variables ADD CONSTRAINT exactly_one_scope CHECK (
    (CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN organization_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN scope_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN project_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- Replace unique constraint
ALTER TABLE context_variables DROP CONSTRAINT unique_key_per_ws;
ALTER TABLE context_variables ADD CONSTRAINT unique_key_per_scope UNIQUE (scope_id, key);

-- Index
CREATE INDEX idx_ctx_var_scope ON context_variables(scope_id) WHERE scope_id IS NOT NULL;
```

---

## What Gets Dropped

### Tables to DROP

```
org_hierarchy_levels
workspace_members
workspace_invitations
workspaces
```

### Columns to DROP: `workspace_id` from all 26 tables

```
agx_agent, agx_shortcut, ai_runs, ai_tasks, app_instances,
broker_values, canvas_items, content_template, context_items,
cx_conversation, flashcard_data, flashcard_sets, notes, projects,
prompt_actions, prompt_apps, prompts, quiz_sessions,
sandbox_instances, tasks, transcripts, user_active_context,
user_files, user_tables, workflow
```

Plus `context_variables` (handled separately above).

### Functions to DROP

```
resolve_context_variables
resolve_active_context
auth_is_workspace_admin
auth_is_workspace_member
get_workspace_ancestors
auto_fill_hierarchy_from_project
```

### Functions to UPDATE (remove workspace_id parameter)

```
agx_get_shortcuts_for_context
get_broker_values_for_context (both overloads)
get_complete_broker_data_for_context (both overloads)
get_context_item_value
get_context_items_by_fetch_hint
get_context_items_manifest
resolve_context_items_for_agent
```

### `user_active_context` — drop `workspace_id` column

### `AppContext` (Python) — remove `workspace_id` field

---

## Execution Phases

```
Phase 1 — Create new tables
  ctx_scope_types
  ctx_scopes
  ctx_scope_assignments
  Validation trigger (ctx_validate_scope_parent)

Phase 2 — RLS on new tables
  All policies listed above

Phase 3 — Update context_variables
  Add scope_id column
  Drop workspace_id FK + column
  Update CHECK constraint
  Update unique constraints

Phase 4 — Drop workspace_id from all 26 tables
  Drop 29 FK constraints
  Drop 26 columns
  Drop user_active_context.workspace_id

Phase 5 — Drop old tables
  workspace_members
  workspace_invitations
  org_hierarchy_levels
  workspaces

Phase 6 — Drop/update old functions
  Drop 6 obsolete functions
  Update 8 functions (remove workspace_id params)

Phase 7 — Create 15 RPC functions

Phase 8 — Seed Titanium Marketing test data
  Types: Client, Department
  Scopes: All Green, Cosmetics Injectables, Data Destruction
```

---

## React Team Instructions

### New pages/components to build

1. **Org Settings → Scope Types Manager**
   - List all scope types for the org (`list_scope_types`)
   - Add/edit/delete types with label, icon, color, sort_order, max_assignments, parent_type_id
   - Only visible to org admins/owners

2. **Sidebar → Scope Navigation**
   - Call `get_org_structure` on page load
   - Render each type as a section header (using `label_plural`)
   - Render scopes as items under each section (nested if type has parent_type_id)
   - "Add [label_singular]" button per section

3. **Scope Picker Component** (reusable)
   - Used on project forms, task forms, conversation creation, note creation
   - Calls `list_scopes` to populate options, grouped by type
   - Respects `max_assignments_per_entity` — if 1, render as single-select; if null, render as multi-select
   - On submit, calls `set_entity_scopes`

4. **Scope Tags Display** (reusable)
   - Renders colored pills showing scope assignments on any entity
   - Each pill shows `[type label]: [scope name]` with the type's icon and color
   - Calls `get_entity_scopes` on entity load

5. **Entity Filter Bar**
   - Scope-based filtering on project lists, task lists, conversation lists
   - Select scopes → calls `list_entities_by_scopes`
   - Toggle between "match all" (intersection) and "match any" (union)

6. **Scope Detail Page**
   - Shows a scope's description, settings, context variables
   - Lists all entities assigned to this scope
   - Calls `list_entities_by_scopes` with single scope_id

7. **Breadcrumb Component Update**
   - Calls `get_entity_scopes` for the current entity
   - Renders scope labels in the breadcrumb: `Titanium Marketing / Client: Anthropic / Dept: SEO / Project: Logo Redesign`

### What to remove

- All references to "workspace" in UI code, component names, route paths, labels
- Workspace picker/selector components
- Workspace creation/editing forms
- Any `workspace_id` fields in API request/response types
- Sidebar workspace navigation

### API changes

- Every endpoint that accepted `workspace_id` in the request body → remove it
- Use `set_entity_scopes` RPC instead of setting `workspace_id` on entity creation
- Use `get_entity_scopes` RPC to display scope tags on entities

---

## Python Team Instructions

### `AppContext` change

```python
# REMOVE:
workspace_id: str | None = None

# Scope context is resolved at request time and stored in metadata:
# ctx.metadata["scope_context"] = resolve_full_context(user_id, entity_type, entity_id)
```

### Agent pipeline change

```python
# In the agent router, after resolving agent config:
scope_context = await supabase.rpc('resolve_full_context', {
    'p_user_id': ctx.user_id,
    'p_entity_type': 'conversation',  # or 'task', etc.
    'p_entity_id': ctx.conversation_id,
}).execute()

# Tier 1 (direct): merge scope_labels + direct variables into inline vars
# Tier 2 (tool_accessible): merge into context dict for apply_context_objects
```

### Functions to update

Every Python function that passes `workspace_id` to a Supabase RPC → remove the parameter. The affected RPC functions are listed in the "Functions to UPDATE" section above.

### Functions/modules to remove

Any Python code that calls `auth_is_workspace_admin`, `auth_is_workspace_member`, `get_workspace_ancestors`, or stores/reads `workspace_id` on `AppContext`.
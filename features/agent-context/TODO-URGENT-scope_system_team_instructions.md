# AI Matrx Scope System — What Was Done & Team Instructions

**Date:** April 7, 2026
**Database:** automation-matrx (txzxabzwovsujtloxrus)

---

## What Changed

### Created

| Item | Details |
|------|---------|
| `ctx_scope_types` table | 13 columns, RLS enabled, 4 policies |
| `ctx_scopes` table | 10 columns, RLS enabled, 4 policies, validation trigger |
| `ctx_scope_assignments` table | 6 columns, RLS enabled, 3 policies |
| `ctx_validate_scope_parent` trigger | Enforces type-level nesting rules on ctx_scopes |
| 15 RPC functions | Listed below |
| `context_variables.scope_id` column | Replaces old workspace_id, with updated CHECK constraint |

### Dropped

| Item | Count |
|------|-------|
| `workspaces` table | Dropped entirely |
| `workspace_members` table | Dropped entirely |
| `workspace_invitations` table | Dropped entirely |
| `org_hierarchy_levels` table | Dropped entirely |
| `workspace_role` enum type | Dropped |
| `workspace_id` columns across tables | 26 columns removed |
| FK constraints to workspaces | 29 constraints removed |
| `context_items_manifest` view | Dropped (referenced workspace_id) |
| Old functions | `resolve_context_variables`, `resolve_active_context`, `auth_is_workspace_admin`, `auth_is_workspace_member`, `get_workspace_ancestors`, `auto_fill_hierarchy_from_project` |
| Auto-fill triggers | `trg_auto_fill_hierarchy` removed from 19 tables |

### Test Data Seeded (Titanium Marketing)

| Type | Values |
|------|--------|
| Client (max 1 per entity) | All Green Electronics Recycling, Cosmetics Injectables Medspa, Data Destruction Inc |
| Department (unlimited) | SEO, Web Development, Content Writing, Branding |

Project "All Green Region Pages" is tagged with Client: All Green + Department: SEO.

---

## The 15 RPC Functions

### Admin Setup (org admins only)

| Function | Purpose |
|----------|---------|
| `create_scope_type(p_org_id, p_label_singular, p_label_plural, ...)` | Define a new category (Client, Department, Study, Phase) |
| `update_scope_type(p_type_id, ...)` | Edit a category's label, icon, sort_order, max_assignments |
| `delete_scope_type(p_type_id)` | Remove a category + all its scopes + all their assignments |
| `list_scope_types(p_org_id)` | Get all categories for an org with scope counts |

### Scope Values (org members)

| Function | Purpose |
|----------|---------|
| `create_scope(p_org_id, p_type_id, p_name, ...)` | Create a value (Anthropic, SEO, UCLA). Trigger validates parent rules |
| `update_scope(p_scope_id, ...)` | Edit name/description/settings |
| `delete_scope(p_scope_id)` | Remove a value + children + all assignments |
| `list_scopes(p_org_id, p_type_id?, p_parent_scope_id?)` | List values filtered by type and/or parent |
| `get_scope_tree(p_org_id, p_type_id?)` | Full flat list with parent refs (frontend builds tree) |

### Assignments (tagging entities)

| Function | Purpose |
|----------|---------|
| `set_entity_scopes(p_entity_type, p_entity_id, p_scope_ids[])` | Replace all tags on an entity. Validates max_assignments per type |
| `get_entity_scopes(p_entity_type, p_entity_id)` | Get all tags on an entity with type labels |
| `list_entities_by_scopes(p_scope_ids[], p_entity_type?, p_match_all?)` | Find entities by tag intersection or union |

### Navigation & Context

| Function | Purpose |
|----------|---------|
| `get_org_structure(p_org_id)` | Full types + scopes in one call (sidebar) |
| `resolve_full_context(p_user_id, p_entity_type, p_entity_id)` | Master context resolution for AI agents |
| `search_scopes(p_org_id, p_query, p_type_id?)` | Typeahead search across scope names |

---

## Known Limitation

`context_variables` can be scoped to one scope at a time, not an intersection. For "the SEO approach we use specifically for Anthropic," put the variable on the project that sits at that intersection. A future `scope_ids uuid[]` column could enable multi-scope targeting.

---

## Dropped View: `context_items_manifest`

This view referenced `workspace_id` and was dropped. The Python team needs to recreate it without the workspace_id column. The original definition selected from `context_items` joined to `context_item_values` — just remove the `workspace_id` from the SELECT list.

---

## React Team Instructions

### Remove everything "workspace"

Search the entire codebase for `workspace` (case-insensitive). Remove or replace:
- All `workspace_id` fields in TypeScript types/interfaces
- All `workspace_id` parameters in API calls
- All workspace picker/selector components
- All workspace creation/editing forms
- All sidebar sections that say "Workspace"
- All route paths containing "workspace"

### New Components to Build

**1. Scope Type Manager** (Org Settings page)

Location: `/org/[orgId]/settings/scope-types`

```typescript
// Load types
const { data } = await supabase.rpc('list_scope_types', { p_org_id: orgId });

// Create type
await supabase.rpc('create_scope_type', {
  p_org_id: orgId,
  p_label_singular: 'Client',
  p_label_plural: 'Clients',
  p_icon: 'building-2',
  p_max_assignments: 1,
  p_default_variable_keys: ['brand_voice', 'target_audience']
});
```

Only visible to org admins/owners. Form fields: label_singular, label_plural, icon, description, color, sort_order, max_assignments_per_entity, parent_type_id (dropdown of other types), default_variable_keys.

**2. Sidebar Scope Navigation**

```typescript
// One call on page load
const { data } = await supabase.rpc('get_org_structure', { p_org_id: orgId });
// data.types = [{ label_plural: "Clients", icon: "building-2", ... }, ...]
// data.scopes = [{ name: "Anthropic", type_label: "Client", ... }, ...]
```

Render each type as a collapsible section header (using `label_plural`). Render scopes as items. "Add [label_singular]" button per section.

**3. Scope Picker Component** (reusable, used everywhere)

```typescript
interface ScopePickerProps {
  orgId: string;
  entityType: string;  // 'project' | 'task' | 'conversation' | etc.
  entityId: string;
  onChange?: (scopes: ScopeAssignment[]) => void;
}
```

- Load types via `list_scope_types`
- Load values via `list_scopes` per type
- If `max_assignments_per_entity = 1` → render as single-select dropdown
- If `max_assignments_per_entity = null` → render as multi-select chips
- On submit: call `set_entity_scopes(entity_type, entity_id, selected_scope_ids)`

**4. Scope Tags Display** (reusable badge/pill component)

```typescript
// Load on entity detail page
const { data } = await supabase.rpc('get_entity_scopes', {
  p_entity_type: 'project',
  p_entity_id: projectId
});
// Render: [Client: Anthropic] [Department: SEO]
```

Each pill shows `[type_label]: [scope_name]` with the type's icon and color.

**5. Entity Filter Bar**

```typescript
// User selects scopes to filter by
const { data } = await supabase.rpc('list_entities_by_scopes', {
  p_scope_ids: [anthropicScopeId, seoScopeId],
  p_entity_type: 'project',
  p_match_all: true  // intersection
});
```

Toggle between "Match all" (AND) and "Match any" (OR).

**6. Scope Detail Page**

Shows scope name, description, settings, context variables scoped to it, and all entities assigned to it.

**7. Breadcrumb Update**

Call `get_entity_scopes` for the current entity. Render as: `Org Name / Client: Anthropic / Dept: SEO / Project Name / Task Name`

### When Creating Entities

When creating a project, task, conversation, note, etc., add the scope picker to the creation form. After the entity is created, call `set_entity_scopes` with the selected scope IDs.

---

## Python Team Instructions

### AppContext Change

```python
# REMOVE this field:
workspace_id: str | None = None

# Scope context lives in metadata after resolution:
# ctx.metadata["scope_context"] = { "scope_labels": {...}, "variables": {...} }
```

### Agent Pipeline Change

```python
# After resolving agent config, before apply_context_objects:
scope_result = await supabase.rpc('resolve_full_context', {
    'p_user_id': ctx.user_id,
    'p_entity_type': 'conversation',
    'p_entity_id': ctx.conversation_id,
}).execute()

scope_context = scope_result.data
ctx.metadata["scope_context"] = scope_context

# Tier 1: scope_labels and direct variables go into inline vars
inline_vars = {}
for key, var_data in scope_context.get('variables', {}).items():
    if var_data.get('inject_as') == 'direct':
        inline_vars[key] = var_data['value']

# Add scope labels as inline vars too
for label_key, label_value in scope_context.get('scope_labels', {}).items():
    inline_vars[f"{label_key}_name"] = label_value

# Merge into existing variables
merged_variables = {**(request.variables or {}), **inline_vars}

# Tier 2: tool_accessible variables go into context dict
deferred_ctx = {}
for key, var_data in scope_context.get('variables', {}).items():
    if var_data.get('inject_as') == 'tool_accessible':
        deferred_ctx[key] = var_data['value']

# Merge with caller's context
deferred_ctx.update(request.context or {})

# Then call apply_context_objects as before
apply_context_objects(config, ctx, deferred_ctx, agent_context_slots)
```

### Recreate `context_items_manifest` View

The old view was dropped because it referenced `workspace_id`. Recreate it without that column:

```sql
CREATE OR REPLACE VIEW public.context_items_manifest AS
SELECT
    ci.id,
    ci.key,
    ci.display_name,
    ci.description,
    ci.category,
    ci.status,
    ci.value_type,
    ci.fetch_hint,
    ci.sensitivity,
    ci.tags,
    ci.user_id,
    ci.organization_id,
    ci.project_id,
    ci.task_id,
    ci.depends_on,
    civ.char_count,
    civ.data_point_count,
    civ.has_nested_objects,
    civ.source_type AS value_source_type,
    civ.created_at AS value_last_updated,
    ci.last_verified_at,
    ci.next_review_at,
    (ci.next_review_at IS NOT NULL AND ci.next_review_at < now()) AS is_overdue_review
FROM context_items ci
LEFT JOIN context_item_values civ ON civ.id = ci.current_value_id
WHERE ci.is_active = true
  AND ci.status NOT IN ('archived', 'deprecated');
```

### Functions to Update (remove workspace_id parameter)

These existing functions had `p_workspace_id` parameters that need to be removed:

| Function | Change |
|----------|--------|
| `agx_get_shortcuts_for_context` | Remove p_workspace_id param |
| `get_broker_values_for_context` (both overloads) | Remove p_workspace_id param |
| `get_complete_broker_data_for_context` (both overloads) | Remove p_workspace_id param |
| `get_context_item_value` | Remove p_workspace_id param |
| `get_context_items_by_fetch_hint` | Remove p_workspace_id param |
| `get_context_items_manifest` | Remove p_workspace_id param |
| `resolve_context_items_for_agent` | Remove p_workspace_id param |

### Functions That Were Dropped

| Function | Replacement |
|----------|-------------|
| `resolve_context_variables` | `resolve_full_context` |
| `resolve_active_context` | `resolve_full_context` |
| `auth_is_workspace_admin` | Use org membership checks instead |
| `auth_is_workspace_member` | Use org membership checks instead |
| `get_workspace_ancestors` | Scope parent chain is walked by `resolve_full_context` |
| `auto_fill_hierarchy_from_project` | No longer needed — scoping is via assignments, not FK columns |

### What the Agent Sees

For a conversation tagged with Client: Anthropic + Department: SEO, `resolve_full_context` returns:

```json
{
  "scope_labels": {
    "client": "All Green Electronics Recycling",
    "department": "SEO"
  },
  "variables": {
    "brand_voice": {
      "value": "Professional, eco-conscious",
      "inject_as": "direct",
      "source": "scope:All Green Electronics Recycling"
    }
  },
  "context": {
    "user_id": "...",
    "organization_id": "...",
    "project_id": "...",
    "task_id": null
  }
}
```

Build the `<agent_context>` block from `scope_labels` + `variables`:

```xml
<agent_context>
  <scope>
    organization: Titanium Marketing
    client: All Green Electronics Recycling
    department: SEO
    project: All Green Region Pages
  </scope>
  <variables>
    brand_voice: Professional, eco-conscious  [scope: All Green]
    ...
  </variables>
</agent_context>
```

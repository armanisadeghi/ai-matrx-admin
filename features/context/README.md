# Context & Scope System

Org-scoped context management with a flexible tagging/categorization system. Manages the hierarchy (Org -> Project -> Task), context variables, context items, and the new scope system.

## Architecture

### Database Tables (all `ctx_` prefixed)

| Table | Purpose |
|---|---|
| `ctx_projects` | Projects belonging to an org |
| `ctx_tasks` | Tasks belonging to a project |
| `ctx_task_assignments` | User-task assignments |
| `ctx_context_items` | Key-value context entries |
| `ctx_context_type_settings` | Per-type configuration |
| `ctx_context_scope_map` | Links context items to scopes |
| `ctx_scope_types` | Category definitions per org (e.g. "Department", "Region") |
| `ctx_scopes` | Instances of scope types (e.g. "Engineering", "West Coast") |
| `ctx_scope_assignments` | Links entities to scopes (many-to-many) |

### Redux Slices

- **`appContextSlice`** — Active org/project/task selection (no workspace layer)
- **`hierarchySlice`** — Normalized org -> project -> task tree
- **`scopeTypesSlice`** — `ctx_scope_types` CRUD
- **`scopesSlice`** — `ctx_scopes` CRUD
- **`scopeAssignmentsSlice`** — `ctx_scope_assignments` CRUD
- **`scopeContextSlice`** — Resolved context from `resolve_full_context` RPC

### Key RPCs

- `resolve_full_context` — Returns merged scope context for an entity
- `set_entity_scopes` — Assigns scopes to an entity (replaces existing for that type)
- `get_entity_scopes` — Fetches all scope assignments for an entity

### Hooks

| Hook | Purpose |
|---|---|
| `useNavTree` | Builds sidebar navigation tree (org -> project -> task) |
| `useHierarchy` | Manages hierarchy CRUD operations |
| `useContextScope` | Current scope level and entity context |
| `useContextVariables` | Context variable CRUD |
| `useContextItems` | Context item list with filtering |
| `useScopeAssignment` | Assigns scopes to entities via `ScopePicker` |

### Components

- **`ScopePicker`** — Multi-select scope assignment UI
- **`ScopeTagsDisplay`** — Read-only scope tag badges
- **`EntityFilterBar`** — Filter entities by scope assignments
- **`HierarchyExplorer`** — Tree view of org hierarchy
- **`ContextSwitcherCore`** — Active context selection dropdown
- **`ContextVariablesPanel`** — Variable editor for current scope

## Migration Notes (April 2025)

- Removed the `workspaces` table and all workspace-related code
- Hierarchy flattened from Org -> Workspace -> Project -> Task to Org -> Project -> Task
- All 9 tables renamed with `ctx_` prefix
- Legacy views (`context_items_manifest`) replaced with direct joins
- ~150 files updated across services, hooks, components, API routes, agents, and brokers

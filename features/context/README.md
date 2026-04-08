# Context & Scope System

Org-scoped context management with a flexible tagging/categorization system. Manages the hierarchy (Org -> Project -> Task), context variables, context items, and the scope system.

## Hierarchy Selection System

**Single source of truth** for org/project/task selection. All UI that lets users pick organizational context MUST use one of the 5 standardized variants from `features/context/components/hierarchy-selection/`.

### Variants

| Variant | Import | Use When |
|---|---|---|
| `HierarchyTree` | Expandable tree with search | Full-page sidebars, admin/explorer views |
| `HierarchyCascade` | Cascading dependent dropdowns | Top-of-page context bars, forms (horizontal or vertical) |
| `HierarchyBreadcrumb` | Clickable breadcrumb trail | Displaying current scope path in headers |
| `HierarchyCommand` | Searchable command palette popover | Compact forms, inline selection, sidebar triggers |
| `HierarchyPills` | Compact filter pills with dropdowns | List pages, tables, filter bars |

### Shared API

All variants share the same props interface:

```typescript
interface HierarchySelectionProps {
  levels?: ("organization" | "project" | "task")[];
  value: HierarchySelection;
  onChange: (selection: HierarchySelection) => void;
  disabled?: boolean;
  className?: string;
}
```

### Data Hook

`useHierarchySelection` — wraps `useNavTree` + `useProjectTasks` with a unified state model. Supports both controlled and uncontrolled modes.

### Redux Bridge

`useHierarchyReduxBridge()` — syncs `HierarchySelection` state with the global `appContextSlice`. Returns `{ value, onChange }` that can be spread directly into any variant:

```tsx
const { value, onChange } = useHierarchyReduxBridge();
<HierarchyCascade levels={["organization", "project"]} value={value} onChange={onChange} />
```

### Demo Page

`/ssr/context/hierarchy/selection-demo` — shows all 5 variants side by side with live state debugging.

### Consumers (exhaustive as of Apr 2026)

All non-admin org/project/task selection UI uses the standardized hierarchy system:

| File | Variant | Levels |
|---|---|---|
| `QuickTasksWorkspace` sidebar | `HierarchyCascade` | org, project, task |
| `TaskContentNew` top bar | `HierarchyCascade` + Redux bridge | org, project |
| `TaskContentNew` quick-add | `HierarchyCascade` | org, project |
| `TaskDetailsPanel` project field | `HierarchyCascade` | org, project |
| `TaskDetailPage` project field | `HierarchyCascade` | org, project |
| `TaskContent` project selector | `HierarchyCascade` | org, project |
| `ImportTasksModal` project target | `HierarchyCascade` | org, project |
| `MobileProjectSelector` | `HierarchyCascade` | org, project |
| `ProjectsWorkspace` | `HierarchyCascade` | org |
| `ResearchInitForm` step 0 | `HierarchyCascade` | org, project |
| `TopicSettingsPanel` | `HierarchyCascade` | org, project |
| `TopicSettingsPage` | `HierarchyCascade` | org, project |
| `TopicList` | `HierarchyPills` | org, project |
| `SidebarContextSelector` | `HierarchyCommand` | org, project, task |
| `ContextSwitcher` (notes) | `HierarchyCommand` + Redux bridge | org, project, task |
| `ContextSwitcherWindow` | `HierarchyTree` + Redux bridge | org, project, task |
| `SSR context layout` | `HierarchyBreadcrumb` + `HierarchyTree` | org, project, task |
| `ContextScopeModal` (demo) | `HierarchyCascade` | org, project, task |
| `ProjectFormSheet` org picker | `useNavTree` data (DropdownMenu) | org (create target) |
| `ShareWithOrgTab` | `useNavTree` data (`<Select>`) | org (share target) |

Legacy components (`HierarchyContextBar`, `ContextSwitcherCore`, `HierarchyContextSelector`) have been deleted.

## Architecture

### Database Tables (all `ctx_` prefixed)

| Table | Purpose |
|---|---|
| `ctx_projects` | Projects belonging to an org |
| `ctx_tasks` | Tasks belonging to a project |
| `ctx_task_assignments` | User-task assignments |
| `ctx_context_items` | Key-value context entries |
| `ctx_context_item_values` | Values for context items |
| `ctx_context_templates` | Industry template definitions |
| `ctx_context_access_log` | Context item access tracking |
| `ctx_context_type_settings` | Per-type configuration |
| `ctx_context_scope_map` | Links context items to scopes |
| `ctx_scope_types` | Category definitions per org (e.g. "Department", "Region") |
| `ctx_scopes` | Instances of scope types (e.g. "Engineering", "West Coast") |
| `ctx_scope_assignments` | Links entities to scopes (many-to-many) |

### Redux Slices

- **`appContextSlice`** — Active org/project/task selection (global state)
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
| `useHierarchySelection` | Standardized hierarchy selection state (controlled/uncontrolled) |
| `useHierarchyReduxBridge` | Syncs selection with global appContextSlice |
| `useNavTree` | Builds sidebar navigation tree (org -> project -> task) |
| `useHierarchy` | Manages hierarchy CRUD operations |
| `useContextScope` | Current scope level and entity context |
| `useContextVariables` | Context variable CRUD |
| `useContextItems` | Context item list with filtering |
| `useScopeAssignment` | Assigns scopes to entities via `ScopePicker` |

### Components

- **Hierarchy Selection** — 5 variants (see above)
- **`ContextHubDetail`** — Unified workspace for managing context per entity
- **`HierarchyTreePage`** — Full admin tree with scope-aware navigation
- **`ScopePicker`** — Multi-select scope assignment UI
- **`EntityFilterBar`** — Filter entities by scope assignments
- **`ContextTemplateBrowser`** — Browse and apply industry templates
- **`ContextVariablesPanel`** — Variable editor for current scope

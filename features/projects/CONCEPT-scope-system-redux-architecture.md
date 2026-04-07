# Scope System — Redux Architecture

## One Flaw in the Execution Plan

Before we build: the `context_variables` change replaces `workspace_id` with `scope_id`, which works for variables that belong to a single scope. But there's no way to store a variable at the **intersection** of two scopes — like "the SEO approach we use specifically for Anthropic." That variable isn't an Anthropic variable and isn't an SEO variable — it's an Anthropic+SEO variable.

**Decision:** Not a blocker. Context variables attach to a single scope. Intersection-specific variables live on the project or task (which is already tagged with both scopes). Document this as a known limitation.

---

## Redux Design Principles

1. **Normalized state.** Entities stored by ID in flat maps. No nested objects duplicating data.
2. **Single source of truth.** Scope types, scopes, and assignments each own their data. Other slices reference by ID.
3. **Thunks fetch. Selectors derive.** Thunks call RPCs. Selectors combine data across slices. Components never compute relationships.
4. **Optimistic where safe.** Assignments (tagging) can be optimistic. Scope creation waits for server confirmation.
5. **Consistent patterns.** Every slice uses the same loading/error/entity adapter shape.

---

## Slice Map

```
store/
  scopeTypes/         — scope_types rows (Client, Department, Study, Site...)
  scopes/             — scopes rows (Anthropic, SEO, UCLA, SUBJ-001...)
  scopeAssignments/   — scope_assignments junction rows
  scopeContext/       — resolved context for the current entity (from resolve_full_context)
```

These integrate with your existing slices:

```
store/
  auth/               — current user
  organizations/      — orgs the user belongs to
  projects/           — projects (already exist)
  tasks/              — tasks (already exist)
  conversations/      — cx_conversation (already exist)
  notes/              — notes (already exist)
  files/              — files (already exist)
  agents/             — agents (already exist)
  scopeTypes/         — NEW
  scopes/             — NEW
  scopeAssignments/   — NEW
  scopeContext/       — NEW
```

---

## Slice 1: `scopeTypes`

### State Shape

```typescript
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

interface ScopeType {
  id: string;
  organization_id: string;
  parent_type_id: string | null;
  label_singular: string;
  label_plural: string;
  icon: string;
  description: string;
  color: string;
  sort_order: number;
  default_variable_keys: string[];
  created_at: string;
  updated_at: string;
}

const scopeTypesAdapter = createEntityAdapter<ScopeType>({
  sortComparer: (a, b) => a.sort_order - b.sort_order,
});

interface ScopeTypesState extends ReturnType<typeof scopeTypesAdapter.getInitialState> {
  loading: boolean;
  error: string | null;
  loadedOrgs: string[]; // track which orgs we've fetched for
}
```

### Thunks

```typescript
// Fetch all scope types for an org
export const fetchScopeTypes = createAsyncThunk(
  'scopeTypes/fetch',
  async (orgId: string) => {
    const { data, error } = await supabase.rpc('list_scope_types', {
      p_org_id: orgId,
    });
    if (error) throw error;
    return data;
  }
);

// Create a new scope type
export const createScopeType = createAsyncThunk(
  'scopeTypes/create',
  async (params: {
    org_id: string;
    label_singular: string;
    label_plural: string;
    parent_type_id?: string;
    icon?: string;
    description?: string;
    sort_order?: number;
    default_variable_keys?: string[];
  }) => {
    const { data, error } = await supabase.rpc('create_scope_type', {
      p_org_id: params.org_id,
      p_label_singular: params.label_singular,
      p_label_plural: params.label_plural,
      p_parent_type_id: params.parent_type_id ?? null,
      p_icon: params.icon ?? 'folder',
      p_description: params.description ?? '',
      p_sort_order: params.sort_order ?? 0,
      p_default_variable_keys: params.default_variable_keys ?? [],
    });
    if (error) throw error;
    return data;
  }
);

// Update a scope type
export const updateScopeType = createAsyncThunk(
  'scopeTypes/update',
  async (params: { type_id: string } & Partial<Omit<ScopeType, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase.rpc('update_scope_type', {
      p_type_id: params.type_id,
      p_label_singular: params.label_singular,
      p_label_plural: params.label_plural,
      p_icon: params.icon,
      p_description: params.description,
      p_sort_order: params.sort_order,
    });
    if (error) throw error;
    return data;
  }
);

// Delete a scope type
export const deleteScopeType = createAsyncThunk(
  'scopeTypes/delete',
  async (typeId: string) => {
    const { data, error } = await supabase.rpc('delete_scope_type', {
      p_type_id: typeId,
    });
    if (error) throw error;
    return { id: typeId, ...data };
  }
);
```

### Selectors

```typescript
// Base entity adapter selectors
export const {
  selectAll: selectAllScopeTypes,
  selectById: selectScopeTypeById,
  selectIds: selectScopeTypeIds,
} = scopeTypesAdapter.getSelectors((state: RootState) => state.scopeTypes);

// All scope types for a specific org
export const selectScopeTypesByOrg = createSelector(
  [selectAllScopeTypes, (_state: RootState, orgId: string) => orgId],
  (types, orgId) => types.filter((t) => t.organization_id === orgId)
);

// Top-level types (no parent) for an org — these are the "peer" dimensions
export const selectTopLevelScopeTypes = createSelector(
  [selectScopeTypesByOrg],
  (types) => types.filter((t) => t.parent_type_id === null)
);

// Child types for a given parent type
export const selectChildScopeTypes = createSelector(
  [selectAllScopeTypes, (_state: RootState, parentTypeId: string) => parentTypeId],
  (types, parentTypeId) => types.filter((t) => t.parent_type_id === parentTypeId)
);

// The full type hierarchy as a tree (for admin settings display)
export const selectScopeTypeTree = createSelector(
  [selectScopeTypesByOrg],
  (types) => {
    const buildTree = (parentId: string | null): (ScopeType & { children: any[] })[] =>
      types
        .filter((t) => t.parent_type_id === parentId)
        .map((t) => ({ ...t, children: buildTree(t.id) }));
    return buildTree(null);
  }
);

// Map from type ID to label_singular (for quick label resolution)
export const selectScopeTypeLabelMap = createSelector(
  [selectScopeTypesByOrg],
  (types) => Object.fromEntries(types.map((t) => [t.id, t.label_singular]))
);
```

---

## Slice 2: `scopes`

### State Shape

```typescript
interface Scope {
  id: string;
  organization_id: string;
  scope_type_id: string;
  parent_scope_id: string | null;
  name: string;
  description: string;
  settings: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Denormalized from RPC response for convenience (not source of truth)
  _type_label?: string;
  _child_count?: number;
  _assignment_count?: number;
}

const scopesAdapter = createEntityAdapter<Scope>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

interface ScopesState extends ReturnType<typeof scopesAdapter.getInitialState> {
  loading: boolean;
  error: string | null;
  loadedFilters: string[]; // track which org+type combos we've fetched
}
```

### Thunks

```typescript
// Fetch scopes for an org, optionally filtered by type or parent
export const fetchScopes = createAsyncThunk(
  'scopes/fetch',
  async (params: { org_id: string; type_id?: string; parent_scope_id?: string }) => {
    const { data, error } = await supabase.rpc('list_scopes', {
      p_org_id: params.org_id,
      p_type_id: params.type_id ?? null,
      p_parent_scope_id: params.parent_scope_id ?? null,
    });
    if (error) throw error;
    return data;
  }
);

// Fetch full tree for an org (or one type)
export const fetchScopeTree = createAsyncThunk(
  'scopes/fetchTree',
  async (params: { org_id: string; type_id?: string }) => {
    const { data, error } = await supabase.rpc('get_scope_tree', {
      p_org_id: params.org_id,
      p_type_id: params.type_id ?? null,
    });
    if (error) throw error;
    // Flatten the tree into individual scope entities for the adapter
    const flatten = (nodes: any[]): Scope[] =>
      nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
    return flatten(data);
  }
);

// Create a scope
export const createScope = createAsyncThunk(
  'scopes/create',
  async (params: {
    org_id: string;
    type_id: string;
    name: string;
    parent_scope_id?: string;
    description?: string;
    settings?: Record<string, unknown>;
  }) => {
    const { data, error } = await supabase.rpc('create_scope', {
      p_org_id: params.org_id,
      p_type_id: params.type_id,
      p_name: params.name,
      p_parent_scope_id: params.parent_scope_id ?? null,
      p_description: params.description ?? '',
      p_settings: params.settings ?? {},
    });
    if (error) throw error;
    return data;
  }
);

// Update a scope
export const updateScope = createAsyncThunk(
  'scopes/update',
  async (params: { scope_id: string; name?: string; description?: string; settings?: Record<string, unknown> }) => {
    const { data, error } = await supabase.rpc('update_scope', {
      p_scope_id: params.scope_id,
      p_name: params.name,
      p_description: params.description,
      p_settings: params.settings,
    });
    if (error) throw error;
    return data;
  }
);

// Delete a scope
export const deleteScope = createAsyncThunk(
  'scopes/delete',
  async (scopeId: string) => {
    const { data, error } = await supabase.rpc('delete_scope', {
      p_scope_id: scopeId,
    });
    if (error) throw error;
    return { id: scopeId, ...data };
  }
);

// Search scopes (typeahead)
export const searchScopes = createAsyncThunk(
  'scopes/search',
  async (params: { org_id: string; query: string; type_id?: string }) => {
    const { data, error } = await supabase.rpc('search_scopes', {
      p_org_id: params.org_id,
      p_query: params.query,
      p_type_id: params.type_id ?? null,
    });
    if (error) throw error;
    return data;
  }
);
```

### Selectors

```typescript
export const {
  selectAll: selectAllScopes,
  selectById: selectScopeById,
  selectIds: selectScopeIds,
} = scopesAdapter.getSelectors((state: RootState) => state.scopes);

// All scopes for a specific org
export const selectScopesByOrg = createSelector(
  [selectAllScopes, (_state: RootState, orgId: string) => orgId],
  (scopes, orgId) => scopes.filter((s) => s.organization_id === orgId)
);

// Scopes filtered by type
export const selectScopesByType = createSelector(
  [selectAllScopes, (_state: RootState, typeId: string) => typeId],
  (scopes, typeId) => scopes.filter((s) => s.scope_type_id === typeId)
);

// Children of a specific scope (for tree rendering)
export const selectChildScopes = createSelector(
  [selectAllScopes, (_state: RootState, parentScopeId: string) => parentScopeId],
  (scopes, parentScopeId) => scopes.filter((s) => s.parent_scope_id === parentScopeId)
);

// Root scopes for a type (no parent)
export const selectRootScopesByType = createSelector(
  [selectScopesByType],
  (scopes) => scopes.filter((s) => s.parent_scope_id === null)
);

// Build scope tree for a type
export const selectScopeTreeByType = createSelector(
  [selectScopesByType],
  (scopes) => {
    const buildTree = (parentId: string | null): (Scope & { children: any[] })[] =>
      scopes
        .filter((s) => s.parent_scope_id === parentId)
        .map((s) => ({ ...s, children: buildTree(s.id) }));
    return buildTree(null);
  }
);

// Walk up parent chain to get full breadcrumb for a scope
export const selectScopeBreadcrumb = createSelector(
  [selectAllScopes, (_state: RootState, scopeId: string) => scopeId],
  (scopes, scopeId) => {
    const scopeMap = new Map(scopes.map((s) => [s.id, s]));
    const chain: Scope[] = [];
    let current = scopeMap.get(scopeId);
    while (current) {
      chain.unshift(current);
      current = current.parent_scope_id ? scopeMap.get(current.parent_scope_id) : undefined;
    }
    return chain;
  }
);

// Scope name map (for quick label resolution anywhere)
export const selectScopeNameMap = createSelector(
  [selectScopesByOrg],
  (scopes) => Object.fromEntries(scopes.map((s) => [s.id, s.name]))
);
```

---

## Slice 3: `scopeAssignments`

### State Shape

```typescript
interface ScopeAssignment {
  id: string;
  scope_id: string;
  entity_type: string;
  entity_id: string;
  created_by: string | null;
  created_at: string;
}

const scopeAssignmentsAdapter = createEntityAdapter<ScopeAssignment>();

interface ScopeAssignmentsState extends ReturnType<typeof scopeAssignmentsAdapter.getInitialState> {
  loading: boolean;
  error: string | null;
  // Track which entities we've loaded assignments for
  loadedEntities: string[]; // "project:uuid", "task:uuid", etc.
}
```

### Thunks

```typescript
// Get all scopes assigned to an entity
export const fetchEntityScopes = createAsyncThunk(
  'scopeAssignments/fetchForEntity',
  async (params: { entity_type: string; entity_id: string }) => {
    const { data, error } = await supabase.rpc('get_entity_scopes', {
      p_entity_type: params.entity_type,
      p_entity_id: params.entity_id,
    });
    if (error) throw error;
    return { ...params, assignments: data };
  }
);

// Replace all scope assignments for an entity (the primary write operation)
export const setEntityScopes = createAsyncThunk(
  'scopeAssignments/setForEntity',
  async (params: { entity_type: string; entity_id: string; scope_ids: string[] }) => {
    const { data, error } = await supabase.rpc('set_entity_scopes', {
      p_entity_type: params.entity_type,
      p_entity_id: params.entity_id,
      p_scope_ids: params.scope_ids,
    });
    if (error) throw error;
    return { ...params, assignments: data };
  }
);

// Find entities matching scope filter
export const fetchEntitiesByScopes = createAsyncThunk(
  'scopeAssignments/fetchByScopes',
  async (params: { scope_ids: string[]; entity_type?: string; match_all?: boolean }) => {
    const { data, error } = await supabase.rpc('list_entities_by_scopes', {
      p_scope_ids: params.scope_ids,
      p_entity_type: params.entity_type ?? null,
      p_match_all: params.match_all ?? true,
    });
    if (error) throw error;
    return data;
  }
);
```

### Selectors

```typescript
export const {
  selectAll: selectAllAssignments,
  selectById: selectAssignmentById,
} = scopeAssignmentsAdapter.getSelectors((state: RootState) => state.scopeAssignments);

// All assignments for a specific entity
export const selectAssignmentsForEntity = createSelector(
  [
    selectAllAssignments,
    (_state: RootState, entityType: string, _entityId: string) => entityType,
    (_state: RootState, _entityType: string, entityId: string) => entityId,
  ],
  (assignments, entityType, entityId) =>
    assignments.filter((a) => a.entity_type === entityType && a.entity_id === entityId)
);

// Scope IDs for an entity (the raw ID list for form state)
export const selectScopeIdsForEntity = createSelector(
  [selectAssignmentsForEntity],
  (assignments) => assignments.map((a) => a.scope_id)
);

// All assignments for a specific scope (what's tagged with "Anthropic"?)
export const selectAssignmentsForScope = createSelector(
  [selectAllAssignments, (_state: RootState, scopeId: string) => scopeId],
  (assignments, scopeId) => assignments.filter((a) => a.scope_id === scopeId)
);

// Entity count per scope (for sidebar badge numbers)
export const selectAssignmentCountByScope = createSelector(
  [selectAllAssignments],
  (assignments) => {
    const counts: Record<string, number> = {};
    assignments.forEach((a) => {
      counts[a.scope_id] = (counts[a.scope_id] ?? 0) + 1;
    });
    return counts;
  }
);
```

---

## Slice 4: `scopeContext`

This is the **derived/resolved** state — the output of `resolve_full_context`. It doesn't own source data; it caches the merged result for the current working entity.

### State Shape

```typescript
interface ResolvedContext {
  variables: Record<string, { value: string; source: string }>;
  scope_labels: Record<string, string>; // { client: "Anthropic", department: "SEO" }
  context: {
    user_id: string;
    organization_id: string;
    project_id?: string;
    task_id?: string;
  };
}

interface ScopeContextState {
  current: ResolvedContext | null;
  currentEntityKey: string | null; // "task:uuid" or "project:uuid"
  loading: boolean;
  error: string | null;
}
```

### Thunks

```typescript
// Resolve full context for an entity (called on every entity focus/page load)
export const resolveContext = createAsyncThunk(
  'scopeContext/resolve',
  async (params: { user_id: string; entity_type: string; entity_id: string }) => {
    const { data, error } = await supabase.rpc('resolve_full_context', {
      p_user_id: params.user_id,
      p_entity_type: params.entity_type,
      p_entity_id: params.entity_id,
    });
    if (error) throw error;
    return {
      entityKey: `${params.entity_type}:${params.entity_id}`,
      context: data,
    };
  }
);
```

### Selectors

```typescript
// The full resolved context
export const selectResolvedContext = (state: RootState) => state.scopeContext.current;

// Just the scope labels (for breadcrumbs, headers)
export const selectScopeLabels = createSelector(
  [selectResolvedContext],
  (ctx) => ctx?.scope_labels ?? {}
);

// Just the variables (for agent injection)
export const selectContextVariables = createSelector(
  [selectResolvedContext],
  (ctx) => ctx?.variables ?? {}
);

// A specific variable value
export const selectContextVariable = createSelector(
  [selectContextVariables, (_state: RootState, key: string) => key],
  (variables, key) => variables[key]?.value ?? null
);

// Whether context is stale (entity changed but context not yet resolved)
export const selectContextIsStale = createSelector(
  [
    (state: RootState) => state.scopeContext.currentEntityKey,
    (_state: RootState, entityType: string, entityId: string) => `${entityType}:${entityId}`,
  ],
  (currentKey, requestedKey) => currentKey !== requestedKey
);
```

---

## Cross-Slice Selectors

These combine data from multiple slices — the real power of normalized state.

```typescript
// file: store/selectors/scopeSelectors.ts

// For an entity, get its assigned scopes with full type labels resolved
// This is what the UI renders as scope tags on a project/task card
export const selectEntityScopesWithLabels = createSelector(
  [
    (state: RootState) => selectAllAssignments(state),
    (state: RootState) => selectAllScopes(state),
    (state: RootState) => selectAllScopeTypes(state),
    (_state: RootState, entityType: string, _entityId: string) => entityType,
    (_state: RootState, _entityType: string, entityId: string) => entityId,
  ],
  (assignments, scopes, types, entityType, entityId) => {
    const entityAssignments = assignments.filter(
      (a) => a.entity_type === entityType && a.entity_id === entityId
    );
    const scopeMap = new Map(scopes.map((s) => [s.id, s]));
    const typeMap = new Map(types.map((t) => [t.id, t]));

    return entityAssignments.map((a) => {
      const scope = scopeMap.get(a.scope_id);
      const type = scope ? typeMap.get(scope.scope_type_id) : undefined;
      return {
        assignment_id: a.id,
        scope_id: a.scope_id,
        scope_name: scope?.name ?? 'Unknown',
        type_id: scope?.scope_type_id ?? '',
        type_label: type?.label_singular ?? 'Unknown',
        type_color: type?.color ?? '',
        type_icon: type?.icon ?? 'folder',
      };
    });
  }
);

// Full sidebar structure: types → scopes (nested) with counts
// One selector call to render the entire sidebar
export const selectOrgSidebarStructure = createSelector(
  [
    (state: RootState, orgId: string) => selectScopeTypesByOrg(state, orgId),
    (state: RootState, _orgId: string) => selectAllScopes(state),
    (state: RootState) => selectAssignmentCountByScope(state),
  ],
  (types, allScopes, countMap) => {
    return types.map((type) => {
      const typeScopes = allScopes.filter((s) => s.scope_type_id === type.id);

      const buildTree = (parentId: string | null): any[] =>
        typeScopes
          .filter((s) => s.parent_scope_id === parentId)
          .map((s) => ({
            id: s.id,
            name: s.name,
            assignment_count: countMap[s.id] ?? 0,
            children: buildTree(s.id),
          }));

      return {
        type_id: type.id,
        label_singular: type.label_singular,
        label_plural: type.label_plural,
        icon: type.icon,
        color: type.color,
        parent_type_id: type.parent_type_id,
        scopes: buildTree(null),
      };
    });
  }
);

// For scope picker (multi-select dropdown grouped by type)
export const selectScopePickerOptions = createSelector(
  [
    (state: RootState, orgId: string) => selectScopeTypesByOrg(state, orgId),
    (state: RootState, _orgId: string) => selectAllScopes(state),
  ],
  (types, allScopes) => {
    return types.map((type) => ({
      type_id: type.id,
      label: type.label_plural,
      icon: type.icon,
      color: type.color,
      options: allScopes
        .filter((s) => s.scope_type_id === type.id)
        .map((s) => ({
          value: s.id,
          label: s.name,
          parent_scope_id: s.parent_scope_id,
        })),
    }));
  }
);

// Projects filtered by active scope selection
// Used when user clicks a scope in the sidebar to filter the project list
export const selectProjectsByScopes = createSelector(
  [
    selectAllAssignments,
    (_state: RootState, scopeIds: string[]) => scopeIds,
    (_state: RootState, _scopeIds: string[], matchAll: boolean) => matchAll,
  ],
  (assignments, scopeIds, matchAll) => {
    const projectAssignments = assignments.filter((a) => a.entity_type === 'project');

    // Group by entity_id
    const projectScopeMap = new Map<string, Set<string>>();
    projectAssignments.forEach((a) => {
      if (!projectScopeMap.has(a.entity_id)) {
        projectScopeMap.set(a.entity_id, new Set());
      }
      projectScopeMap.get(a.entity_id)!.add(a.scope_id);
    });

    // Filter
    const matchingProjectIds: string[] = [];
    projectScopeMap.forEach((scopeSet, projectId) => {
      const matches = matchAll
        ? scopeIds.every((id) => scopeSet.has(id))
        : scopeIds.some((id) => scopeSet.has(id));
      if (matches) matchingProjectIds.push(projectId);
    });

    return matchingProjectIds;
  }
);
```

---

## Store Configuration

```typescript
// file: store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import scopeTypesReducer from './scopeTypes/slice';
import scopesReducer from './scopes/slice';
import scopeAssignmentsReducer from './scopeAssignments/slice';
import scopeContextReducer from './scopeContext/slice';
// ... existing reducers

export const store = configureStore({
  reducer: {
    // Existing slices
    auth: authReducer,
    organizations: organizationsReducer,
    projects: projectsReducer,
    tasks: tasksReducer,
    conversations: conversationsReducer,
    notes: notesReducer,
    files: filesReducer,
    agents: agentsReducer,

    // New scope slices
    scopeTypes: scopeTypesReducer,
    scopes: scopesReducer,
    scopeAssignments: scopeAssignmentsReducer,
    scopeContext: scopeContextReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## Data Flow Patterns

### Pattern 1: Page Load (fetch org structure)

```
Component mounts
  → dispatch(fetchScopeTypes(orgId))
  → dispatch(fetchScopes({ org_id: orgId }))
  → Sidebar renders via selectOrgSidebarStructure(state, orgId)
```

### Pattern 2: Open a project detail page

```
Project page mounts
  → dispatch(fetchEntityScopes({ entity_type: 'project', entity_id: projectId }))
  → dispatch(resolveContext({ user_id, entity_type: 'project', entity_id: projectId }))
  → Scope tags render via selectEntityScopesWithLabels(state, 'project', projectId)
  → Context panel renders via selectScopeLabels(state)
```

### Pattern 3: User tags a project with scopes

```
User selects scopes in picker, clicks save
  → dispatch(setEntityScopes({ entity_type: 'project', entity_id: projectId, scope_ids: [...] }))
  → On fulfilled: assignments slice updates, tags re-render automatically
  → dispatch(resolveContext(...)) to refresh the context cache
```

### Pattern 4: Sidebar filter (click "Anthropic" to see its projects)

```
User clicks scope in sidebar
  → selectProjectsByScopes(state, ['anthropic-scope-id'], true)
  → Project list filters in place, no API call needed (data already in Redux)
```

### Pattern 5: AI request (agent needs context)

```
User sends message in conversation
  → selectResolvedContext(state) provides the full merged context
  → Agent pipeline injects scope_labels + variables into <agent_context>
  → If context is stale: dispatch(resolveContext(...)) first
```

---

## How Existing Slices Connect

Your existing slices (projects, tasks, notes, files, etc.) do NOT need a `scope_ids` field. The relationship lives entirely in `scopeAssignments`. To render scope tags on a project card:

```typescript
// In a ProjectCard component:
const scopeTags = useAppSelector((state) =>
  selectEntityScopesWithLabels(state, 'project', project.id)
);

// Returns:
// [
//   { scope_name: "Anthropic", type_label: "Client", type_color: "#3b82f6", type_icon: "building" },
//   { scope_name: "Branding", type_label: "Department", type_color: "#8b5cf6", type_icon: "briefcase" },
// ]
```

No changes to the project slice. No `workspace_id` field anywhere. The junction table and the cross-slice selector handle everything.

---

## File Structure

```
store/
├── index.ts                          # configureStore
├── hooks.ts                          # useAppSelector, useAppDispatch
│
├── scopeTypes/
│   ├── slice.ts                      # adapter, reducers, extraReducers
│   ├── thunks.ts                     # createAsyncThunk calls
│   ├── selectors.ts                  # entity adapter + derived selectors
│   └── types.ts                      # ScopeType interface
│
├── scopes/
│   ├── slice.ts
│   ├── thunks.ts
│   ├── selectors.ts
│   └── types.ts
│
├── scopeAssignments/
│   ├── slice.ts
│   ├── thunks.ts
│   ├── selectors.ts
│   └── types.ts
│
├── scopeContext/
│   ├── slice.ts
│   ├── thunks.ts
│   ├── selectors.ts
│   └── types.ts
│
├── selectors/
│   └── scopeSelectors.ts            # Cross-slice selectors
│
└── ... (existing slices unchanged)
```

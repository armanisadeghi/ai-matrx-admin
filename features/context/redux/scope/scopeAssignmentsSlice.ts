"use client";

import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { ScopeAssignment } from "./types";

const scopeAssignmentsAdapter = createEntityAdapter<ScopeAssignment>();

interface ScopeAssignmentsExtraState {
  loading: boolean;
  error: string | null;
  loadedEntities: string[];
}

const initialState =
  scopeAssignmentsAdapter.getInitialState<ScopeAssignmentsExtraState>({
    loading: false,
    error: null,
    loadedEntities: [],
  });

export const fetchEntityScopes = createAsyncThunk(
  "scopeAssignments/fetchForEntity",
  async (params: { entity_type: string; entity_id: string }) => {
    const { data, error } = await supabase.rpc("get_entity_scopes", {
      p_entity_type: params.entity_type,
      p_entity_id: params.entity_id,
    });
    if (error) throw error;
    return { ...params, assignments: data as ScopeAssignment[] };
  },
);

export const setEntityScopes = createAsyncThunk(
  "scopeAssignments/setForEntity",
  async (params: {
    entity_type: string;
    entity_id: string;
    scope_ids: string[];
  }) => {
    const { data, error } = await supabase.rpc("set_entity_scopes", {
      p_entity_type: params.entity_type,
      p_entity_id: params.entity_id,
      p_scope_ids: params.scope_ids,
    });
    if (error) throw error;
    return { ...params, assignments: data as ScopeAssignment[] };
  },
);

export const fetchEntitiesByScopes = createAsyncThunk(
  "scopeAssignments/fetchByScopes",
  async (params: {
    scope_ids: string[];
    entity_type?: string;
    match_all?: boolean;
  }) => {
    const { data, error } = await supabase.rpc("list_entities_by_scopes", {
      p_scope_ids: params.scope_ids,
      p_entity_type: params.entity_type ?? undefined,
      p_match_all: params.match_all ?? true,
    });
    if (error) throw error;
    return data as { entity_type: string; entity_id: string }[];
  },
);

const scopeAssignmentsSlice = createSlice({
  name: "scopeAssignments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntityScopes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEntityScopes.fulfilled, (state, action) => {
        state.loading = false;
        const entityKey = `${action.payload.entity_type}:${action.payload.entity_id}`;
        const existingForEntity = Object.values(state.entities).filter(
          (a) =>
            a &&
            a.entity_type === action.payload.entity_type &&
            a.entity_id === action.payload.entity_id,
        );
        const idsToRemove = existingForEntity.map((a) => a!.id);
        scopeAssignmentsAdapter.removeMany(state, idsToRemove);
        scopeAssignmentsAdapter.upsertMany(state, action.payload.assignments);
        if (!state.loadedEntities.includes(entityKey)) {
          state.loadedEntities.push(entityKey);
        }
      })
      .addCase(fetchEntityScopes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch entity scopes";
      })
      .addCase(setEntityScopes.fulfilled, (state, action) => {
        const existingForEntity = Object.values(state.entities).filter(
          (a) =>
            a &&
            a.entity_type === action.payload.entity_type &&
            a.entity_id === action.payload.entity_id,
        );
        const idsToRemove = existingForEntity.map((a) => a!.id);
        scopeAssignmentsAdapter.removeMany(state, idsToRemove);
        scopeAssignmentsAdapter.upsertMany(state, action.payload.assignments);
      });
  },
});

export default scopeAssignmentsSlice.reducer;

type StateWithAssignments = {
  scopeAssignments: ReturnType<typeof scopeAssignmentsSlice.reducer>;
};

const adapterSelectors = scopeAssignmentsAdapter.getSelectors(
  (state: StateWithAssignments) => state.scopeAssignments,
);

export const selectAllAssignments = adapterSelectors.selectAll;
export const selectAssignmentById = adapterSelectors.selectById;

export const selectAssignmentsLoading = (state: StateWithAssignments) =>
  state.scopeAssignments.loading;

export const selectAssignmentsForEntity = createSelector(
  [
    selectAllAssignments,
    (_state: StateWithAssignments, entityType: string) => entityType,
    (_state: StateWithAssignments, _entityType: string, entityId: string) =>
      entityId,
  ],
  (assignments, entityType, entityId) =>
    assignments.filter(
      (a) => a.entity_type === entityType && a.entity_id === entityId,
    ),
);

export const selectScopeIdsForEntity = createSelector(
  [
    selectAllAssignments,
    (_state: StateWithAssignments, entityType: string) => entityType,
    (_state: StateWithAssignments, _entityType: string, entityId: string) =>
      entityId,
  ],
  (assignments, entityType, entityId) =>
    assignments
      .filter((a) => a.entity_type === entityType && a.entity_id === entityId)
      .map((a) => a.scope_id),
);

export const selectAssignmentsForScope = createSelector(
  [
    selectAllAssignments,
    (_state: StateWithAssignments, scopeId: string) => scopeId,
  ],
  (assignments, scopeId) => assignments.filter((a) => a.scope_id === scopeId),
);

export const selectAssignmentCountByScope = createSelector(
  [selectAllAssignments],
  (assignments) => {
    const counts: Record<string, number> = {};
    assignments.forEach((a) => {
      counts[a.scope_id] = (counts[a.scope_id] ?? 0) + 1;
    });
    return counts;
  },
);

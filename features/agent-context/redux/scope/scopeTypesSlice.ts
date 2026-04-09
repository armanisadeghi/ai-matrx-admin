"use client";

import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { ScopeType } from "./types";

const scopeTypesAdapter = createEntityAdapter<ScopeType>({
  sortComparer: (a, b) => a.sort_order - b.sort_order,
});

interface ScopeTypesExtraState {
  loading: boolean;
  error: string | null;
  loadedOrgs: string[];
}

const initialState = scopeTypesAdapter.getInitialState<ScopeTypesExtraState>({
  loading: false,
  error: null,
  loadedOrgs: [],
});

export const fetchScopeTypes = createAsyncThunk(
  "scopeTypes/fetch",
  async (orgId: string) => {
    const { data, error } = await supabase.rpc("list_scope_types", {
      p_org_id: orgId,
    });
    if (error) throw error;
    return { orgId, types: data as ScopeType[] };
  },
);

export const createScopeType = createAsyncThunk(
  "scopeTypes/create",
  async (params: {
    org_id: string;
    label_singular: string;
    label_plural: string;
    parent_type_id?: string;
    icon?: string;
    description?: string;
    sort_order?: number;
    max_assignments?: number;
    default_variable_keys?: string[];
  }) => {
    const { data, error } = await supabase.rpc("create_scope_type", {
      p_org_id: params.org_id,
      p_label_singular: params.label_singular,
      p_label_plural: params.label_plural,
      p_parent_type_id: params.parent_type_id ?? undefined,
      p_icon: params.icon ?? "folder",
      p_description: params.description ?? "",
      p_sort_order: params.sort_order ?? 0,
      p_max_assignments: params.max_assignments ?? undefined,
      p_default_variable_keys: params.default_variable_keys ?? [],
    });
    if (error) throw error;
    return data as ScopeType;
  },
);

export const updateScopeType = createAsyncThunk(
  "scopeTypes/update",
  async (params: {
    type_id: string;
    label_singular?: string;
    label_plural?: string;
    icon?: string;
    description?: string;
    sort_order?: number;
    max_assignments?: number;
  }) => {
    const { data, error } = await supabase.rpc("update_scope_type", {
      p_type_id: params.type_id,
      p_label_singular: params.label_singular,
      p_label_plural: params.label_plural,
      p_icon: params.icon,
      p_description: params.description,
      p_sort_order: params.sort_order,
      p_max_assignments: params.max_assignments,
    });
    if (error) throw error;
    return data as ScopeType;
  },
);

export const deleteScopeType = createAsyncThunk(
  "scopeTypes/delete",
  async (typeId: string) => {
    const { data, error } = await supabase.rpc("delete_scope_type", {
      p_type_id: typeId,
    });
    if (error) throw error;
    return { id: typeId, ...(data as Record<string, unknown>) };
  },
);

const scopeTypesSlice = createSlice({
  name: "scopeTypes",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchScopeTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScopeTypes.fulfilled, (state, action) => {
        state.loading = false;
        scopeTypesAdapter.upsertMany(state, action.payload.types);
        if (!state.loadedOrgs.includes(action.payload.orgId)) {
          state.loadedOrgs.push(action.payload.orgId);
        }
      })
      .addCase(fetchScopeTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch scope types";
      })
      .addCase(createScopeType.fulfilled, (state, action) => {
        scopeTypesAdapter.addOne(state, action.payload);
      })
      .addCase(updateScopeType.fulfilled, (state, action) => {
        scopeTypesAdapter.upsertOne(state, action.payload);
      })
      .addCase(deleteScopeType.fulfilled, (state, action) => {
        scopeTypesAdapter.removeOne(state, action.payload.id);
      });
  },
});

export default scopeTypesSlice.reducer;

type StateWithScopeTypes = {
  scopeTypes: ReturnType<typeof scopeTypesSlice.reducer>;
};

const adapterSelectors = scopeTypesAdapter.getSelectors(
  (state: StateWithScopeTypes) => state.scopeTypes,
);

export const selectAllScopeTypes = adapterSelectors.selectAll;
export const selectScopeTypeById = adapterSelectors.selectById;
export const selectScopeTypeIds = adapterSelectors.selectIds;

export const selectScopeTypesLoading = (state: StateWithScopeTypes) =>
  state.scopeTypes.loading;
export const selectScopeTypesError = (state: StateWithScopeTypes) =>
  state.scopeTypes.error;

export const selectScopeTypesByOrg = createSelector(
  [selectAllScopeTypes, (_state: StateWithScopeTypes, orgId: string) => orgId],
  (types, orgId) => types.filter((t) => t.organization_id === orgId),
);

export const selectTopLevelScopeTypes = createSelector(
  [selectAllScopeTypes, (_state: StateWithScopeTypes, orgId: string) => orgId],
  (types, orgId) =>
    types.filter(
      (t) => t.organization_id === orgId && t.parent_type_id === null,
    ),
);

export const selectChildScopeTypes = createSelector(
  [
    selectAllScopeTypes,
    (_state: StateWithScopeTypes, parentTypeId: string) => parentTypeId,
  ],
  (types, parentTypeId) =>
    types.filter((t) => t.parent_type_id === parentTypeId),
);

export const selectScopeTypeLabelMap = createSelector(
  [selectAllScopeTypes, (_state: StateWithScopeTypes, orgId: string) => orgId],
  (types, orgId) =>
    Object.fromEntries(
      types
        .filter((t) => t.organization_id === orgId)
        .map((t) => [t.id, t.label_singular]),
    ),
);

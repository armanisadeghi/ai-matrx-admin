"use client";

import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { ResolvedScopeContext, ScopeContextState } from "./types";

const initialState: ScopeContextState = {
  current: null,
  currentEntityKey: null,
  loading: false,
  error: null,
};

/** Stable selector fallbacks when context is null — never mutate. */
export const EMPTY_SCOPE_CONTEXT_LABELS: Record<string, string> = {};
export const EMPTY_SCOPE_CONTEXT_VARIABLES: ResolvedScopeContext["variables"] =
  {};

export const resolveContext = createAsyncThunk(
  "scopeContext/resolve",
  async (params: {
    user_id: string;
    entity_type: string;
    entity_id: string;
  }) => {
    const { data, error } = await supabase.rpc("resolve_full_context", {
      p_user_id: params.user_id,
      p_entity_type: params.entity_type,
      p_entity_id: params.entity_id,
    });
    if (error) throw error;
    return {
      entityKey: `${params.entity_type}:${params.entity_id}`,
      context: data as ResolvedScopeContext,
    };
  },
);

const scopeContextSlice = createSlice({
  name: "scopeContext",
  initialState,
  reducers: {
    clearScopeContext: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(resolveContext.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resolveContext.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.context;
        state.currentEntityKey = action.payload.entityKey;
      })
      .addCase(resolveContext.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to resolve context";
      });
  },
});

export const { clearScopeContext } = scopeContextSlice.actions;
export default scopeContextSlice.reducer;

type StateWithScopeContext = { scopeContext: ScopeContextState };

export const selectResolvedContext = (state: StateWithScopeContext) =>
  state.scopeContext.current;
export const selectScopeContextLoading = (state: StateWithScopeContext) =>
  state.scopeContext.loading;
export const selectScopeContextError = (state: StateWithScopeContext) =>
  state.scopeContext.error;

export const selectScopeLabels = createSelector(
  [selectResolvedContext],
  (ctx) => ctx?.scope_labels ?? EMPTY_SCOPE_CONTEXT_LABELS,
);

export const selectContextVariables = createSelector(
  [selectResolvedContext],
  (ctx) => ctx?.variables ?? EMPTY_SCOPE_CONTEXT_VARIABLES,
);

export const selectContextVariable = createSelector(
  [selectContextVariables, (_state: StateWithScopeContext, key: string) => key],
  (variables, key) => variables[key]?.value ?? null,
);

export const selectContextIsStale = createSelector(
  [
    (state: StateWithScopeContext) => state.scopeContext.currentEntityKey,
    (_state: StateWithScopeContext, entityType: string, entityId: string) =>
      `${entityType}:${entityId}`,
  ],
  (currentKey, requestedKey) => currentKey !== requestedKey,
);

import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import { sklActions } from "./slice";
import {
  rowToShortcutCategory,
  rowToSklCategory,
  rowToSklDefinition,
  rowToSklRenderComponent,
  rowToSklRenderDefinition,
  rowToSklResource,
  sklDefinitionToInsert,
  sklDefinitionToUpdate,
  sklRenderDefinitionToInsert,
  sklRenderDefinitionToUpdate,
} from "./converters";
import type { Scope } from "../../types";
import type { SklDefinition, SklRenderDefinition, SklSkillType } from "./types";

// ─── Scope filter builder ────────────────────────────────────────────────────

interface ScopedQueryArgs {
  scope: Scope;
  scopeId: string | null;
}

/**
 * Apply scope filter to a Supabase select query.
 * - user scope: rows where user_id = current user, plus is_system rows
 * - organization scope: rows where organization_id = scopeId
 * - project scope: rows where project_id = scopeId
 * - task scope: rows where task_id = scopeId
 */
function applyScopeFilter<Q extends { eq: Function; is: Function }>(
  query: Q,
  args: ScopedQueryArgs,
  userId: string | null,
): Q {
  if (args.scope === "user") {
    // RLS handles the "owned + system" logic; explicit filter on user_id ensures
    // we don't return other users' rows even if RLS would allow it.
    return userId ? (query.eq("user_id", userId) as Q) : (query.is("user_id", null) as Q);
  }
  if (!args.scopeId) return query;
  const column =
    args.scope === "organization"
      ? "organization_id"
      : args.scope === "project"
        ? "project_id"
        : "task_id";
  return query.eq(column, args.scopeId) as Q;
}

// ─── Skill Definitions ──────────────────────────────────────────────────────

interface FetchSkillsArgs extends ScopedQueryArgs {
  types?: SklSkillType[];
}

export const fetchSkillDefinitions = createAsyncThunk(
  "skl/fetchSkillDefinitions",
  async (args: FetchSkillsArgs, { dispatch }) => {
    dispatch(sklActions.definitionsLoading());
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      let query = supabase
        .from("skl_definitions")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      query = applyScopeFilter(query, args, userId);
      if (args.types && args.types.length > 0) {
        query = query.in("skill_type", args.types);
      }
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []).map(rowToSklDefinition);
      dispatch(sklActions.definitionsReceived(rows));
      return rows;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dispatch(sklActions.definitionsError(msg));
      throw err;
    }
  },
);

export const createSkillDefinition = createAsyncThunk(
  "skl/createSkillDefinition",
  async (
    args: {
      draft: Partial<SklDefinition> &
        Pick<SklDefinition, "skillId" | "label" | "description">;
    },
    { dispatch },
  ) => {
    const payload = sklDefinitionToInsert(args.draft);
    const { data, error } = await supabase
      .from("skl_definitions")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    const row = rowToSklDefinition(data);
    dispatch(sklActions.definitionUpserted(row));
    return row;
  },
);

export const updateSkillDefinition = createAsyncThunk(
  "skl/updateSkillDefinition",
  async (
    args: { id: string; patch: Partial<SklDefinition> },
    { dispatch },
  ) => {
    const payload = sklDefinitionToUpdate(args.patch);
    const { data, error } = await supabase
      .from("skl_definitions")
      .update(payload)
      .eq("id", args.id)
      .select()
      .single();
    if (error) throw error;
    const row = rowToSklDefinition(data);
    dispatch(sklActions.definitionUpserted(row));
    return row;
  },
);

export const deleteSkillDefinition = createAsyncThunk(
  "skl/deleteSkillDefinition",
  async (args: { id: string }, { dispatch }) => {
    const { error } = await supabase
      .from("skl_definitions")
      .delete()
      .eq("id", args.id);
    if (error) throw error;
    dispatch(sklActions.definitionRemoved(args.id));
    return args.id;
  },
);

export const duplicateSkillDefinition = createAsyncThunk(
  "skl/duplicateSkillDefinition",
  async (args: { id: string }, { getState, dispatch }) => {
    const state = getState() as { skl: { definitions: { byId: Record<string, SklDefinition> } } };
    const source = state.skl.definitions.byId[args.id];
    if (!source) throw new Error(`Skill ${args.id} not found`);
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source;
    const copy: Partial<SklDefinition> &
      Pick<SklDefinition, "skillId" | "label" | "description"> = {
      ...rest,
      skillId: `${source.skillId}-copy`,
      label: `${source.label} (copy)`,
    };
    const result = await dispatch(
      createSkillDefinition({ draft: copy }),
    ).unwrap();
    return result;
  },
);

// ─── Render Definitions ─────────────────────────────────────────────────────

export const fetchRenderDefinitions = createAsyncThunk(
  "skl/fetchRenderDefinitions",
  async (args: ScopedQueryArgs, { dispatch }) => {
    dispatch(sklActions.renderDefinitionsLoading());
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      let query = supabase
        .from("skl_render_definitions")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      query = applyScopeFilter(query, args, userId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []).map(rowToSklRenderDefinition);
      dispatch(sklActions.renderDefinitionsReceived(rows));
      return rows;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dispatch(sklActions.renderDefinitionsError(msg));
      throw err;
    }
  },
);

export const createRenderDefinition = createAsyncThunk(
  "skl/createRenderDefinition",
  async (
    args: {
      draft: Partial<SklRenderDefinition> &
        Pick<
          SklRenderDefinition,
          "blockId" | "label" | "iconName" | "template"
        >;
    },
    { dispatch },
  ) => {
    const payload = sklRenderDefinitionToInsert(args.draft);
    const { data, error } = await supabase
      .from("skl_render_definitions")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    const row = rowToSklRenderDefinition(data);
    dispatch(sklActions.renderDefinitionUpserted(row));
    return row;
  },
);

export const updateRenderDefinition = createAsyncThunk(
  "skl/updateRenderDefinition",
  async (
    args: { id: string; patch: Partial<SklRenderDefinition> },
    { dispatch },
  ) => {
    const payload = sklRenderDefinitionToUpdate(args.patch);
    const { data, error } = await supabase
      .from("skl_render_definitions")
      .update(payload)
      .eq("id", args.id)
      .select()
      .single();
    if (error) throw error;
    const row = rowToSklRenderDefinition(data);
    dispatch(sklActions.renderDefinitionUpserted(row));
    return row;
  },
);

export const deleteRenderDefinition = createAsyncThunk(
  "skl/deleteRenderDefinition",
  async (args: { id: string }, { dispatch }) => {
    const { error } = await supabase
      .from("skl_render_definitions")
      .delete()
      .eq("id", args.id);
    if (error) throw error;
    dispatch(sklActions.renderDefinitionRemoved(args.id));
    return args.id;
  },
);

// ─── Render Components ──────────────────────────────────────────────────────

export const fetchRenderComponents = createAsyncThunk(
  "skl/fetchRenderComponents",
  async (_args: void, { dispatch }) => {
    const { data, error } = await supabase
      .from("skl_render_components")
      .select("*");
    if (error) throw error;
    const rows = (data ?? []).map(rowToSklRenderComponent);
    dispatch(sklActions.renderComponentsReceived(rows));
    return rows;
  },
);

// ─── Categories (skl_categories) ────────────────────────────────────────────

export const fetchCategories = createAsyncThunk(
  "skl/fetchCategories",
  async (_args: ScopedQueryArgs, { dispatch }) => {
    const { data, error } = await supabase.from("skl_categories").select("*");
    if (error) throw error;
    const rows = (data ?? []).map(rowToSklCategory);
    dispatch(sklActions.categoriesReceived(rows));
    return rows;
  },
);

// ─── Render-block categories (shortcut_categories) ─────────────────────────

export const fetchRenderBlockCategories = createAsyncThunk(
  "skl/fetchRenderBlockCategories",
  async (args: ScopedQueryArgs, { dispatch }) => {
    dispatch(sklActions.renderBlockCategoriesLoading());
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      let query = supabase
        .from("shortcut_categories")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("label", { ascending: true });
      query = applyScopeFilter(query, args, userId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []).map(rowToShortcutCategory);
      dispatch(sklActions.renderBlockCategoriesReceived(rows));
      return rows;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dispatch(sklActions.renderBlockCategoriesError(msg));
      throw err;
    }
  },
);

// ─── Resources ──────────────────────────────────────────────────────────────

export const fetchResources = createAsyncThunk(
  "skl/fetchResources",
  async (args: { skillId?: string }, { dispatch }) => {
    dispatch(sklActions.resourcesLoading());
    try {
      let query = supabase.from("skl_resources").select("*");
      if (args.skillId) query = query.eq("skill_id", args.skillId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []).map(rowToSklResource);
      dispatch(sklActions.resourcesReceived(rows));
      return rows;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dispatch(sklActions.resourcesError(msg));
      throw err;
    }
  },
);

export const deleteResource = createAsyncThunk(
  "skl/deleteResource",
  async (args: { id: string }, { dispatch }) => {
    const { error } = await supabase
      .from("skl_resources")
      .delete()
      .eq("id", args.id);
    if (error) throw error;
    dispatch(sklActions.resourceRemoved(args.id));
    return args.id;
  },
);

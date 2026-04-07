"use client";

import { supabase } from "@/utils/supabase/client";
import type { ContextScopeLevel } from "../types";
import type { Database } from "@/types/database.types";

// ─── Types ──────────────────────────────────────────────────────────

export type ContextVariable =
  Database["public"]["Tables"]["ctx_context_variables"]["Row"];

export type ResolvedVariable = {
  value: unknown;
  type: string;
  inject_as: string;
  source: string;
  description: string;
};

export type ResolvedContext = {
  variables: Record<string, ResolvedVariable>;
  sources: Record<string, string>;
  context: {
    user_id: string | null;
    organization_id: string | null;
    project_id: string | null;
    task_id: string | null;
  };
  resolved_at: number;
};

export type ContextVariableFormData = {
  key: string;
  value: unknown;
  value_type: string;
  inject_as: string;
  description?: string;
  tags?: string[];
  is_secret?: boolean;
};

// ─── Service ────────────────────────────────────────────────────────

type ScopeColumn =
  | "user_id"
  | "organization_id"
  | "project_id"
  | "task_id";

function scopeColumn(scopeType: ContextScopeLevel): ScopeColumn {
  return scopeType === "user"
    ? "user_id"
    : scopeType === "organization"
      ? "organization_id"
      : scopeType === "project"
        ? "project_id"
        : "task_id";
}

export const contextVariableService = {
  // ─── Fetch variables defined at exactly this scope ────────────────
  async fetchScopeVariables(
    scopeType: ContextScopeLevel,
    scopeId: string,
  ): Promise<ContextVariable[]> {
    const col = scopeColumn(scopeType);
    const { data, error } = await supabase
      .from("ctx_context_variables")
      .select("*")
      .eq(col, scopeId)
      .order("key");
    if (error) throw error;
    return (data ?? []) as ContextVariable[];
  },

  // ─── Resolve full context via RPC (uses most specific scope entity) ─
  async resolveVariables(opts: {
    userId: string;
    organizationId?: string | null;
    projectId?: string | null;
    taskId?: string | null;
  }): Promise<ResolvedContext> {
    let entityType: string;
    let entityId: string;

    if (opts.taskId) {
      entityType = "task";
      entityId = opts.taskId;
    } else if (opts.projectId) {
      entityType = "project";
      entityId = opts.projectId;
    } else if (opts.organizationId) {
      entityType = "organization";
      entityId = opts.organizationId;
    } else {
      entityType = "user";
      entityId = opts.userId;
    }

    const { data, error } = await supabase.rpc("resolve_full_context", {
      p_user_id: opts.userId,
      p_entity_type: entityType,
      p_entity_id: entityId,
    });
    if (error) throw error;
    return data as unknown as ResolvedContext;
  },

  // ─── Create a variable at a scope ─────────────────────────────────
  async createVariable(
    scopeType: ContextScopeLevel,
    scopeId: string,
    formData: ContextVariableFormData,
  ): Promise<ContextVariable> {
    const col = scopeColumn(scopeType);
    const { data, error } = await supabase
      .from("ctx_context_variables")
      .insert({
        [col]: scopeId,
        key: formData.key,
        value: formData.value,
        value_type: formData.value_type,
        inject_as: formData.inject_as,
        description: formData.description ?? null,
        tags: formData.tags ?? [],
        is_secret: formData.is_secret ?? false,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ContextVariable;
  },

  // ─── Update a variable ────────────────────────────────────────────
  async updateVariable(
    id: string,
    updates: Partial<ContextVariableFormData>,
  ): Promise<ContextVariable> {
    const { data, error } = await supabase
      .from("ctx_context_variables")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as ContextVariable;
  },

  // ─── Delete a variable ────────────────────────────────────────────
  async deleteVariable(id: string): Promise<void> {
    const { error } = await supabase
      .from("ctx_context_variables")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

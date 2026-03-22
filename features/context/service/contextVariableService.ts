'use client';

import { supabase } from '@/utils/supabase/client';
import type { ContextScopeLevel } from '../types';

// ─── Types ──────────────────────────────────────────────────────────

export type ContextVariable = {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  workspace_id: string | null;
  project_id: string | null;
  task_id: string | null;
  key: string;
  value: unknown;
  value_type: string;
  inject_as: string;
  description: string | null;
  is_system: boolean | null;
  is_secret: boolean | null;
  is_active: boolean | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

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
    workspace_id: string | null;
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

function scopeColumn(scopeType: ContextScopeLevel): string {
  return scopeType === 'user' ? 'user_id'
    : scopeType === 'organization' ? 'organization_id'
    : scopeType === 'workspace' ? 'workspace_id'
    : scopeType === 'project' ? 'project_id'
    : 'task_id';
}

export const contextVariableService = {

  // ─── Fetch variables defined at exactly this scope ────────────────
  async fetchScopeVariables(scopeType: ContextScopeLevel, scopeId: string): Promise<ContextVariable[]> {
    const col = scopeColumn(scopeType);
    const { data, error } = await supabase
      .from('context_variables')
      .select('*')
      .eq(col, scopeId)
      .order('key');
    if (error) throw error;
    return (data ?? []) as ContextVariable[];
  },

  // ─── Resolve all variables with cascade (calls RPC) ───────────────
  async resolveVariables(opts: {
    userId: string;
    organizationId?: string | null;
    workspaceId?: string | null;
    projectId?: string | null;
    taskId?: string | null;
    injectAs?: string | null;
  }): Promise<ResolvedContext> {
    const { data, error } = await supabase.rpc('resolve_context_variables', {
      p_user_id: opts.userId,
      p_organization_id: opts.organizationId ?? null,
      p_workspace_id: opts.workspaceId ?? null,
      p_project_id: opts.projectId ?? null,
      p_task_id: opts.taskId ?? null,
      p_inject_as: opts.injectAs ?? null,
      p_include_secrets: false,
    });
    if (error) throw error;
    return data as ResolvedContext;
  },

  // ─── Create a variable at a scope ─────────────────────────────────
  async createVariable(scopeType: ContextScopeLevel, scopeId: string, formData: ContextVariableFormData): Promise<ContextVariable> {
    const col = scopeColumn(scopeType);
    const { data, error } = await supabase
      .from('context_variables')
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
  async updateVariable(id: string, updates: Partial<ContextVariableFormData>): Promise<ContextVariable> {
    const { data, error } = await supabase
      .from('context_variables')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ContextVariable;
  },

  // ─── Delete a variable ────────────────────────────────────────────
  async deleteVariable(id: string): Promise<void> {
    const { error } = await supabase
      .from('context_variables')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

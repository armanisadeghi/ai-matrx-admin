'use client';

import { supabase } from '@/utils/supabase/client';
import type {
  ContextItem,
  ContextItemManifest,
  ContextItemValue,
  ContextTemplate,
  ContextAccessLogEntry,
  ContextAccessSummary,
  ContextItemFormData,
  ContextValueFormData,
  ContextItemStatus,
  ContextDashboardStats,
  ContextCategoryHealth,
  ContextIndustryGroup,
  ContextScopeLevel,
} from '../types';
import { ATTENTION_STATUSES } from '../constants';

function scopeFilter(query: ReturnType<typeof supabase.from>, scopeType: ContextScopeLevel, scopeId: string) {
  const column = scopeType === 'user' ? 'user_id'
    : scopeType === 'organization' ? 'organization_id'
    : scopeType === 'workspace' ? 'workspace_id'
    : scopeType === 'project' ? 'project_id'
    : 'task_id';
  return query.eq(column, scopeId);
}

export const contextService = {
  // ─── Manifest (lightweight list) ───────────────────────────────────
  async fetchManifest(scopeType: ContextScopeLevel, scopeId: string): Promise<ContextItemManifest[]> {
    let query = supabase
      .from('context_items_manifest')
      .select('*')
      .order('category', { ascending: true, nullsFirst: true })
      .order('display_name', { ascending: true });

    query = scopeFilter(query, scopeType, scopeId);
    const { data, error } = await query;
    if (error) throw error;
    return data as ContextItemManifest[];
  },

  // ─── Full item detail ─────────────────────────────────────────────
  async fetchItem(itemId: string): Promise<ContextItem> {
    const { data, error } = await supabase
      .from('context_items')
      .select('*')
      .eq('id', itemId)
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Current value for an item ────────────────────────────────────
  async fetchCurrentValue(itemId: string): Promise<ContextItemValue | null> {
    const { data, error } = await supabase
      .from('context_item_values')
      .select('*')
      .eq('context_item_id', itemId)
      .eq('is_current', true)
      .maybeSingle();
    if (error) throw error;
    return data as ContextItemValue | null;
  },

  // ─── Version history ──────────────────────────────────────────────
  async fetchVersionHistory(itemId: string): Promise<ContextItemValue[]> {
    const { data, error } = await supabase
      .from('context_item_values')
      .select('*')
      .eq('context_item_id', itemId)
      .order('version', { ascending: false });
    if (error) throw error;
    return data as ContextItemValue[];
  },

  // ─── Create item ──────────────────────────────────────────────────
  async createItem(
    scopeType: ContextScopeLevel,
    scopeId: string,
    formData: ContextItemFormData
  ): Promise<ContextItem> {
    const scopeColumn = scopeType === 'user' ? 'user_id'
      : scopeType === 'organization' ? 'organization_id'
      : scopeType === 'workspace' ? 'workspace_id'
      : scopeType === 'project' ? 'project_id'
      : 'task_id';

    const { data, error } = await supabase
      .from('context_items')
      .insert({ ...formData, [scopeColumn]: scopeId })
      .select()
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Update item metadata ─────────────────────────────────────────
  async updateItem(itemId: string, updates: Partial<ContextItemFormData>): Promise<ContextItem> {
    const { data, error } = await supabase
      .from('context_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Update status (optimistic-friendly) ──────────────────────────
  async updateStatus(itemId: string, status: ContextItemStatus, statusNote?: string): Promise<ContextItem> {
    const { data, error } = await supabase
      .from('context_items')
      .update({
        status,
        status_note: statusNote ?? null,
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Create new value version ─────────────────────────────────────
  async createValue(
    itemId: string,
    valueData: ContextValueFormData,
    sourceType: string = 'manual'
  ): Promise<ContextItemValue> {
    const { data, error } = await supabase
      .from('context_item_values')
      .insert({
        context_item_id: itemId,
        ...valueData,
        source_type: sourceType,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ContextItemValue;
  },

  // ─── Archive / soft delete ────────────────────────────────────────
  async archiveItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('context_items')
      .update({ status: 'archived', is_active: false })
      .eq('id', itemId);
    if (error) throw error;
  },

  // ─── Dashboard stats ──────────────────────────────────────────────
  async fetchDashboardStats(scopeType: ContextScopeLevel, scopeId: string): Promise<ContextDashboardStats> {
    let query = supabase
      .from('context_items')
      .select('id, status, current_value_id, is_active')
      .eq('is_active', true);

    query = scopeFilter(query, scopeType, scopeId);
    const { data, error } = await query;
    if (error) throw error;

    const items = data ?? [];
    return {
      totalItems: items.length,
      activeVerified: items.filter(i => i.status === 'active').length,
      needsAttention: items.filter(i => ATTENTION_STATUSES.includes(i.status as ContextItemStatus)).length,
      emptyStub: items.filter(i => !i.current_value_id).length,
    };
  },

  // ─── Category health breakdown ────────────────────────────────────
  async fetchCategoryHealth(scopeType: ContextScopeLevel, scopeId: string): Promise<ContextCategoryHealth[]> {
    let query = supabase
      .from('context_items')
      .select('category, status')
      .eq('is_active', true);

    query = scopeFilter(query, scopeType, scopeId);
    const { data, error } = await query;
    if (error) throw error;

    const items = data ?? [];
    const categoryMap = new Map<string, ContextCategoryHealth>();

    for (const item of items) {
      const cat = item.category || 'Uncategorized';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { category: cat, total: 0, active: 0, partial: 0, stub: 0, needsAttention: 0 });
      }
      const h = categoryMap.get(cat)!;
      h.total++;
      if (item.status === 'active') h.active++;
      if (item.status === 'partial') h.partial++;
      if (item.status === 'stub' || item.status === 'idea') h.stub++;
      if (ATTENTION_STATUSES.includes(item.status as ContextItemStatus)) h.needsAttention++;
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  },

  // ─── Attention queue ──────────────────────────────────────────────
  async fetchAttentionQueue(scopeType: ContextScopeLevel, scopeId: string): Promise<ContextItemManifest[]> {
    let query = supabase
      .from('context_items_manifest')
      .select('*')
      .in('status', ATTENTION_STATUSES)
      .order('updated_at' as never, { ascending: true })
      .limit(20);

    query = scopeFilter(query, scopeType, scopeId);
    const { data, error } = await query;
    if (error) throw error;
    return data as ContextItemManifest[];
  },

  // ─── Recent access log ────────────────────────────────────────────
  async fetchRecentAccessLog(scopeType: ContextScopeLevel, scopeId: string, limit = 10): Promise<ContextAccessLogEntry[]> {
    const { data, error } = await supabase
      .from('context_access_log')
      .select('*')
      .order('accessed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as ContextAccessLogEntry[];
  },

  // ─── Access summary per item ──────────────────────────────────────
  async fetchAccessSummary(itemId: string): Promise<ContextAccessSummary | null> {
    const { data, error } = await supabase
      .from('context_access_log')
      .select('id, was_useful, accessed_at')
      .eq('context_item_id', itemId);
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const useful = data.filter(d => d.was_useful === true).length;
    const total = data.length;
    return {
      context_item_id: itemId,
      total_fetches: total,
      last_fetched: data[0]?.accessed_at ?? null,
      useful_rate: total > 0 ? useful / total : null,
    };
  },

  // ─── Templates ────────────────────────────────────────────────────
  async fetchTemplates(): Promise<ContextTemplate[]> {
    const { data, error } = await supabase
      .from('context_templates')
      .select('*')
      .order('industry_category', { ascending: true })
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data as ContextTemplate[];
  },

  async fetchTemplatesByIndustry(industryCategory: string): Promise<ContextTemplate[]> {
    const { data, error } = await supabase
      .from('context_templates')
      .select('*')
      .eq('industry_category', industryCategory)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data as ContextTemplate[];
  },

  // ─── Apply template ───────────────────────────────────────────────
  async applyTemplate(
    scopeType: ContextScopeLevel,
    scopeId: string,
    templateItems: ContextTemplate[],
    existingKeys: Set<string>
  ): Promise<{ created: number; skipped: number }> {
    const scopeColumn = scopeType === 'user' ? 'user_id'
      : scopeType === 'organization' ? 'organization_id'
      : scopeType === 'workspace' ? 'workspace_id'
      : scopeType === 'project' ? 'project_id'
      : 'task_id';

    const toCreate = templateItems.filter(t => !existingKeys.has(t.item_key));
    const skipped = templateItems.length - toCreate.length;

    if (toCreate.length > 0) {
      const rows = toCreate.map(t => ({
        key: t.item_key,
        display_name: t.item_display_name,
        description: t.item_description,
        value_type: t.default_value_type,
        fetch_hint: t.default_fetch_hint,
        sensitivity: t.default_sensitivity,
        status: 'stub' as const,
        template_item_key: t.item_key,
        review_interval_days: t.suggested_review_interval_days,
        [scopeColumn]: scopeId,
      }));

      const { error } = await supabase.from('context_items').insert(rows);
      if (error) throw error;
    }

    return { created: toCreate.length, skipped };
  },

  // ─── Fetch existing keys in scope (for template dedup) ────────────
  async fetchExistingKeys(scopeType: ContextScopeLevel, scopeId: string): Promise<Set<string>> {
    let query = supabase
      .from('context_items')
      .select('key');

    query = scopeFilter(query, scopeType, scopeId);
    const { data, error } = await query;
    if (error) throw error;
    return new Set((data ?? []).map(d => d.key));
  },

  // ─── Duplicate item ───────────────────────────────────────────────
  async duplicateItem(itemId: string): Promise<ContextItem> {
    const original = await this.fetchItem(itemId);
    const { id, created_at, updated_at, current_value_id, status_updated_at, ...rest } = original;

    const { data, error } = await supabase
      .from('context_items')
      .insert({
        ...rest,
        key: `${rest.key}_copy`,
        display_name: `${rest.display_name} (Copy)`,
        status: 'stub' as const,
        current_value_id: null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Analytics: fetch volume over time ────────────────────────────
  async fetchAccessVolume(scopeType: ContextScopeLevel, scopeId: string, days = 30): Promise<{ date: string; count: number }[]> {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase
      .from('context_access_log')
      .select('accessed_at')
      .gte('accessed_at', since)
      .order('accessed_at', { ascending: true });
    if (error) throw error;

    const buckets = new Map<string, number>();
    for (const row of data ?? []) {
      const day = row.accessed_at.slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  },

  // ─── Analytics: item usage rankings ───────────────────────────────
  async fetchItemUsageRankings(scopeType: ContextScopeLevel, scopeId: string): Promise<(ContextItemManifest & ContextAccessSummary)[]> {
    const [items, logs] = await Promise.all([
      this.fetchManifest(scopeType, scopeId),
      supabase
        .from('context_access_log')
        .select('context_item_id, was_useful, accessed_at')
        .then(({ data, error }) => {
          if (error) throw error;
          return data ?? [];
        }),
    ]);

    const accessMap = new Map<string, { total: number; useful: number; last: string | null }>();
    for (const log of logs) {
      const entry = accessMap.get(log.context_item_id) ?? { total: 0, useful: 0, last: null };
      entry.total++;
      if (log.was_useful) entry.useful++;
      if (!entry.last || log.accessed_at > entry.last) entry.last = log.accessed_at;
      accessMap.set(log.context_item_id, entry);
    }

    return items.map(item => {
      const access = accessMap.get(item.id);
      return {
        ...item,
        context_item_id: item.id,
        total_fetches: access?.total ?? 0,
        last_fetched: access?.last ?? null,
        useful_rate: access ? (access.total > 0 ? access.useful / access.total : null) : null,
      };
    });
  },
};

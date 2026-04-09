"use client";

import { supabase } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";
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
  ContextScopeLevel,
} from "../types";
import { ATTENTION_STATUSES } from "../constants";

function scopeColumn(
  scopeType: ContextScopeLevel,
): "user_id" | "organization_id" | "project_id" | "task_id" | null {
  switch (scopeType) {
    case "user":
      return "user_id";
    case "organization":
      return "organization_id";
    case "project":
      return "project_id";
    case "task":
      return "task_id";
    case "scope":
      return null;
  }
}

function scopeFilter(
  query: any,
  scopeType: ContextScopeLevel,
  scopeId: string,
) {
  const col = scopeColumn(scopeType);
  if (!col) {
    throw new Error(
      "scopeFilter cannot be used with dynamic scopes — use fetchManifestByScope instead",
    );
  }
  return query.eq(col, scopeId);
}

export const contextService = {
  // ─── Manifest (lightweight list) ───────────────────────────────────
  async fetchManifest(
    scopeType: ContextScopeLevel,
    scopeId: string,
  ): Promise<ContextItemManifest[]> {
    if (scopeType === "scope") {
      return this.fetchManifestByScope(scopeId);
    }

    let query = supabase
      .from("ctx_context_items")
      .select(
        "*, ctx_context_item_values!current_value_id(text_value, updated_at)",
      )
      .order("category", { ascending: true, nullsFirst: true })
      .order("display_name", { ascending: true });

    query = scopeFilter(query, scopeType, scopeId);
    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      ...row,
      current_text_value: row.ctx_context_item_values?.text_value ?? null,
      value_last_updated: row.ctx_context_item_values?.updated_at ?? null,
    })) as ContextItemManifest[];
  },

  // ─── Manifest via dynamic scope (ctx_scope_assignments) ────────────
  async fetchManifestByScope(scopeId: string): Promise<ContextItemManifest[]> {
    const { data: assignments, error: aErr } = await supabase
      .from("ctx_scope_assignments")
      .select("entity_id")
      .eq("scope_id", scopeId)
      .eq("entity_type", "context_item");
    if (aErr) throw aErr;

    const itemIds = (assignments ?? []).map((a) => a.entity_id);
    if (itemIds.length === 0) return [];

    const { data, error } = await supabase
      .from("ctx_context_items")
      .select(
        "*, ctx_context_item_values!current_value_id(text_value, updated_at)",
      )
      .in("id", itemIds)
      .order("category", { ascending: true, nullsFirst: true })
      .order("display_name", { ascending: true });
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      ...row,
      current_text_value: row.ctx_context_item_values?.text_value ?? null,
      value_last_updated: row.ctx_context_item_values?.updated_at ?? null,
    })) as ContextItemManifest[];
  },

  // ─── Full item detail ─────────────────────────────────────────────
  async fetchItem(itemId: string): Promise<ContextItem> {
    const { data, error } = await supabase
      .from("ctx_context_items")
      .select("*")
      .eq("id", itemId)
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Current value for an item ────────────────────────────────────
  async fetchCurrentValue(itemId: string): Promise<ContextItemValue | null> {
    const { data, error } = await supabase
      .from("ctx_context_item_values")
      .select("*")
      .eq("context_item_id", itemId)
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw error;
    return data as ContextItemValue | null;
  },

  // ─── Version history ──────────────────────────────────────────────
  async fetchVersionHistory(itemId: string): Promise<ContextItemValue[]> {
    const { data, error } = await supabase
      .from("ctx_context_item_values")
      .select("*")
      .eq("context_item_id", itemId)
      .order("version", { ascending: false });
    if (error) throw error;
    return data as ContextItemValue[];
  },

  // ─── Create item ──────────────────────────────────────────────────
  async createItem(
    scopeType: ContextScopeLevel,
    scopeId: string,
    formData: ContextItemFormData,
    orgId?: string,
  ): Promise<ContextItem> {
    if (scopeType === "scope") {
      return this.createItemForScope(scopeId, formData, orgId);
    }

    const col = scopeColumn(scopeType)!;
    const { data, error } = await supabase
      .from("ctx_context_items")
      .insert({ ...formData, [col]: scopeId })
      .select()
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Create item and link to dynamic scope ─────────────────────────
  async createItemForScope(
    scopeId: string,
    formData: ContextItemFormData,
    orgId?: string,
  ): Promise<ContextItem> {
    const insertPayload: Record<string, unknown> = { ...formData };
    if (orgId) insertPayload.organization_id = orgId;

    const { data: item, error: itemErr } = await supabase
      .from("ctx_context_items")
      .insert(insertPayload)
      .select()
      .single();
    if (itemErr) throw itemErr;

    const { error: assignErr } = await supabase
      .from("ctx_scope_assignments")
      .insert({
        scope_id: scopeId,
        entity_type: "context_item",
        entity_id: (item as ContextItem).id,
      });
    if (assignErr) throw assignErr;

    return item as ContextItem;
  },

  // ─── Update item metadata ─────────────────────────────────────────
  async updateItem(
    itemId: string,
    updates: Partial<ContextItemFormData>,
  ): Promise<ContextItem> {
    const { data, error } = await supabase
      .from("ctx_context_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Update status (optimistic-friendly) ──────────────────────────
  async updateStatus(
    itemId: string,
    status: ContextItemStatus,
    statusNote?: string,
  ): Promise<ContextItem> {
    const { data, error } = await supabase
      .from("ctx_context_items")
      .update({
        status,
        status_note: statusNote ?? null,
        status_updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .select()
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Create new value version ─────────────────────────────────────
  async createValue(
    itemId: string,
    valueData: ContextValueFormData,
    sourceType: Database["public"]["Enums"]["context_source_type"] = "manual",
  ): Promise<ContextItemValue> {
    const { data, error } = await supabase
      .from("ctx_context_item_values")
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
      .from("ctx_context_items")
      .update({ status: "archived", is_active: false })
      .eq("id", itemId);
    if (error) throw error;
  },

  // ─── Dashboard stats ──────────────────────────────────────────────
  async fetchDashboardStats(
    scopeType: ContextScopeLevel,
    scopeId: string,
  ): Promise<ContextDashboardStats> {
    if (scopeType === "scope") {
      const manifest = await this.fetchManifestByScope(scopeId);
      const active = manifest.filter((i) => i.status === "active");
      return {
        totalItems: manifest.length,
        activeVerified: active.length,
        needsAttention: manifest.filter((i) =>
          ATTENTION_STATUSES.includes(i.status as ContextItemStatus),
        ).length,
        emptyStub: manifest.filter(
          (i) => !i.has_nested_objects && !i.char_count,
        ).length,
      };
    }

    let query = supabase
      .from("ctx_context_items")
      .select("id, status, current_value_id, is_active")
      .eq("is_active", true);

    query = scopeFilter(query, scopeType, scopeId);
    const { data, error } = await query;
    if (error) throw error;

    const items = data ?? [];
    return {
      totalItems: items.length,
      activeVerified: items.filter((i) => i.status === "active").length,
      needsAttention: items.filter((i) =>
        ATTENTION_STATUSES.includes(i.status as ContextItemStatus),
      ).length,
      emptyStub: items.filter((i) => !i.current_value_id).length,
    };
  },

  // ─── Category health breakdown ────────────────────────────────────
  async fetchCategoryHealth(
    scopeType: ContextScopeLevel,
    scopeId: string,
  ): Promise<ContextCategoryHealth[]> {
    let items: { category: string | null; status: string }[];

    if (scopeType === "scope") {
      const manifest = await this.fetchManifestByScope(scopeId);
      items = manifest.map((m) => ({ category: m.category, status: m.status }));
    } else {
      let query = supabase
        .from("ctx_context_items")
        .select("category, status")
        .eq("is_active", true);

      query = scopeFilter(query, scopeType, scopeId);
      const { data, error } = await query;
      if (error) throw error;
      items = data ?? [];
    }
    const categoryMap = new Map<string, ContextCategoryHealth>();

    for (const item of items) {
      const cat = item.category || "Uncategorized";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, {
          category: cat,
          total: 0,
          active: 0,
          partial: 0,
          stub: 0,
          needsAttention: 0,
        });
      }
      const h = categoryMap.get(cat)!;
      h.total++;
      if (item.status === "active") h.active++;
      if (item.status === "partial") h.partial++;
      if (item.status === "stub" || item.status === "idea") h.stub++;
      if (ATTENTION_STATUSES.includes(item.status as ContextItemStatus))
        h.needsAttention++;
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  },

  // ─── Attention queue (sorted by urgency: stale-overdue → needs_review → ai_enriched → needs_update → partial) ──
  async fetchAttentionQueue(
    scopeType: ContextScopeLevel,
    scopeId: string,
  ): Promise<ContextItemManifest[]> {
    let mapped: ContextItemManifest[];

    if (scopeType === "scope") {
      const all = await this.fetchManifestByScope(scopeId);
      mapped = all
        .filter((i) =>
          ATTENTION_STATUSES.includes(i.status as ContextItemStatus),
        )
        .slice(0, 20);
    } else {
      let query = supabase
        .from("ctx_context_items")
        .select(
          "*, ctx_context_item_values!current_value_id(text_value, updated_at)",
        )
        .in("status", ATTENTION_STATUSES)
        .limit(20);

      query = scopeFilter(query, scopeType, scopeId);
      const { data, error } = await query;
      if (error) throw error;

      mapped = (data ?? []).map((row: any) => ({
        ...row,
        current_text_value: row.ctx_context_item_values?.text_value ?? null,
        value_last_updated: row.ctx_context_item_values?.updated_at ?? null,
      })) as ContextItemManifest[];
    }

    const priorityOrder: Record<string, number> = {
      stale: 1,
      needs_review: 2,
      ai_enriched: 3,
      needs_update: 4,
      partial: 5,
    };

    return mapped.sort((a, b) => {
      const pa = priorityOrder[a.status] ?? 99;
      const pb = priorityOrder[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      // Within same priority, older items first
      return (a.value_last_updated ?? "").localeCompare(
        b.value_last_updated ?? "",
      );
    });
  },

  // ─── Recent access log ────────────────────────────────────────────
  async fetchRecentAccessLog(
    scopeType: ContextScopeLevel,
    scopeId: string,
    limit = 10,
  ): Promise<ContextAccessLogEntry[]> {
    const { data, error } = await supabase
      .from("ctx_context_access_log")
      .select("*")
      .order("accessed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as ContextAccessLogEntry[];
  },

  // ─── Access summary per item ──────────────────────────────────────
  async fetchAccessSummary(
    itemId: string,
  ): Promise<ContextAccessSummary | null> {
    const { data, error } = await supabase
      .from("ctx_context_access_log")
      .select("id, was_useful, accessed_at")
      .eq("context_item_id", itemId);
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const useful = data.filter((d) => d.was_useful === true).length;
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
      .from("ctx_context_templates")
      .select("*")
      .order("industry_category", { ascending: true })
      .order("display_order", { ascending: true });
    if (error) throw error;
    return data as ContextTemplate[];
  },

  async fetchTemplatesByIndustry(
    industryCategory: string,
  ): Promise<ContextTemplate[]> {
    const { data, error } = await supabase
      .from("ctx_context_templates")
      .select("*")
      .eq("industry_category", industryCategory)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return data as ContextTemplate[];
  },

  // ─── Apply template ───────────────────────────────────────────────
  async applyTemplate(
    scopeType: ContextScopeLevel,
    scopeId: string,
    templateItems: ContextTemplate[],
    existingKeys: Set<string>,
    orgId?: string,
  ): Promise<{ created: number; skipped: number }> {
    if (scopeType === "scope") {
      return this.applyTemplateToScope(
        scopeId,
        templateItems,
        existingKeys,
        orgId,
      );
    }

    const col = scopeColumn(scopeType)!;
    const toCreate = templateItems.filter((t) => !existingKeys.has(t.item_key));
    const skipped = templateItems.length - toCreate.length;

    if (toCreate.length > 0) {
      const rows = toCreate.map((t) => ({
        key: t.item_key,
        display_name: t.item_display_name,
        description: t.item_description,
        value_type: t.default_value_type,
        fetch_hint: t.default_fetch_hint,
        sensitivity: t.default_sensitivity,
        status: "stub" as const,
        template_item_key: t.item_key,
        review_interval_days: t.suggested_review_interval_days,
        [col]: scopeId,
      }));

      const { error } = await supabase.from("ctx_context_items").insert(rows);
      if (error) throw error;
    }

    return { created: toCreate.length, skipped };
  },

  // ─── Apply template to dynamic scope ───────────────────────────────
  async applyTemplateToScope(
    scopeId: string,
    templateItems: ContextTemplate[],
    existingKeys: Set<string>,
    orgId?: string,
  ): Promise<{ created: number; skipped: number }> {
    const toCreate = templateItems.filter((t) => !existingKeys.has(t.item_key));
    const skipped = templateItems.length - toCreate.length;

    if (toCreate.length > 0) {
      const rows = toCreate.map((t) => {
        const row: Record<string, unknown> = {
          key: t.item_key,
          display_name: t.item_display_name,
          description: t.item_description,
          value_type: t.default_value_type,
          fetch_hint: t.default_fetch_hint,
          sensitivity: t.default_sensitivity,
          status: "stub" as const,
          template_item_key: t.item_key,
          review_interval_days: t.suggested_review_interval_days,
        };
        if (orgId) row.organization_id = orgId;
        return row;
      });

      const { data: created, error } = await supabase
        .from("ctx_context_items")
        .insert(rows)
        .select("id");
      if (error) throw error;

      if (created && created.length > 0) {
        const assignments = created.map((item) => ({
          scope_id: scopeId,
          entity_type: "context_item" as const,
          entity_id: item.id,
        }));
        const { error: assignErr } = await supabase
          .from("ctx_scope_assignments")
          .insert(assignments);
        if (assignErr) throw assignErr;
      }
    }

    return { created: toCreate.length, skipped };
  },

  // ─── Fetch existing keys in scope (for template dedup) ────────────
  async fetchExistingKeys(
    scopeType: ContextScopeLevel,
    scopeId: string,
  ): Promise<Set<string>> {
    if (scopeType === "scope") {
      return this.fetchExistingKeysByScope(scopeId);
    }

    let query = supabase.from("ctx_context_items").select("key");

    query = scopeFilter(query, scopeType, scopeId);
    const { data, error } = await query;
    if (error) throw error;
    return new Set((data ?? []).map((d) => d.key));
  },

  // ─── Fetch existing keys via dynamic scope ─────────────────────────
  async fetchExistingKeysByScope(scopeId: string): Promise<Set<string>> {
    const { data: assignments, error: aErr } = await supabase
      .from("ctx_scope_assignments")
      .select("entity_id")
      .eq("scope_id", scopeId)
      .eq("entity_type", "context_item");
    if (aErr) throw aErr;

    const itemIds = (assignments ?? []).map((a) => a.entity_id);
    if (itemIds.length === 0) return new Set();

    const { data, error } = await supabase
      .from("ctx_context_items")
      .select("key")
      .in("id", itemIds);
    if (error) throw error;
    return new Set((data ?? []).map((d) => d.key));
  },

  // ─── Duplicate item ───────────────────────────────────────────────
  async duplicateItem(itemId: string): Promise<ContextItem> {
    const original = await this.fetchItem(itemId);
    const {
      id,
      created_at,
      updated_at,
      current_value_id,
      status_updated_at,
      ...rest
    } = original;

    const { data, error } = await supabase
      .from("ctx_context_items")
      .insert({
        ...rest,
        key: `${rest.key}_copy`,
        display_name: `${rest.display_name} (Copy)`,
        status: "stub" as const,
        current_value_id: null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ContextItem;
  },

  // ─── Analytics: fetch volume over time ────────────────────────────
  async fetchAccessVolume(
    scopeType: ContextScopeLevel,
    scopeId: string,
    days = 30,
  ): Promise<{ date: string; count: number }[]> {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase
      .from("ctx_context_access_log")
      .select("accessed_at")
      .gte("accessed_at", since)
      .order("accessed_at", { ascending: true });
    if (error) throw error;

    const buckets = new Map<string, number>();
    for (const row of data ?? []) {
      const day = row.accessed_at.slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  },

  // ─── Analytics: item usage rankings ───────────────────────────────
  async fetchItemUsageRankings(
    scopeType: ContextScopeLevel,
    scopeId: string,
  ): Promise<(ContextItemManifest & ContextAccessSummary)[]> {
    const [items, logs] = await Promise.all([
      this.fetchManifest(scopeType, scopeId),
      supabase
        .from("ctx_context_access_log")
        .select("context_item_id, was_useful, accessed_at")
        .then(({ data, error }) => {
          if (error) throw error;
          return data ?? [];
        }),
    ]);

    const accessMap = new Map<
      string,
      { total: number; useful: number; last: string | null }
    >();
    for (const log of logs) {
      const entry = accessMap.get(log.context_item_id) ?? {
        total: 0,
        useful: 0,
        last: null,
      };
      entry.total++;
      if (log.was_useful) entry.useful++;
      if (!entry.last || log.accessed_at > entry.last)
        entry.last = log.accessed_at;
      accessMap.set(log.context_item_id, entry);
    }

    return items.map((item) => {
      const access = accessMap.get(item.id);
      return {
        ...item,
        context_item_id: item.id,
        total_fetches: access?.total ?? 0,
        last_fetched: access?.last ?? null,
        useful_rate: access
          ? access.total > 0
            ? access.useful / access.total
            : null
          : null,
      };
    });
  },
};

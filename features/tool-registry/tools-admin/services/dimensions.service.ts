"use client";

import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";

type Tables = Database["public"]["Tables"];

export type ToolExecutorRow = Tables["tl_executor"]["Row"];
export type ToolDefSurfaceRow = Tables["tl_def_surface"]["Row"];
export type ToolBundleMemberRow = Tables["tl_bundle_member"]["Row"];
export type ToolBundleRow = Tables["tl_bundle"]["Row"];
export type ToolDefRow = Tables["tl_def"]["Row"];

export interface BundleMembership {
  member: ToolBundleMemberRow;
  bundle: ToolBundleRow;
}

export interface ToolGateEntry {
  gate: string;
  args: Record<string, unknown>;
}

const sb = () => createClient();

// ─── Executors ───────────────────────────────────────────────────────────────

export async function listToolExecutors(toolId: string): Promise<ToolExecutorRow[]> {
  const { data, error } = await sb()
    .from("tl_executor")
    .select("*")
    .eq("tool_id", toolId)
    .order("priority", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addToolExecutor(args: {
  toolId: string;
  surface: string;
  priority?: number;
  autoLoad?: boolean;
  isActive?: boolean;
}): Promise<ToolExecutorRow> {
  const { data, error } = await sb()
    .from("tl_executor")
    .insert({
      tool_id: args.toolId,
      surface: args.surface,
      priority: args.priority ?? 100,
      auto_load: args.autoLoad ?? false,
      is_active: args.isActive ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateToolExecutor(
  id: string,
  patch: Partial<{ priority: number; auto_load: boolean; is_active: boolean }>,
): Promise<void> {
  const { error } = await sb().from("tl_executor").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removeToolExecutor(id: string): Promise<void> {
  const { error } = await sb().from("tl_executor").delete().eq("id", id);
  if (error) throw error;
}

// ─── Surfaces ────────────────────────────────────────────────────────────────

export async function listToolSurfaces(toolId: string): Promise<ToolDefSurfaceRow[]> {
  const { data, error } = await sb()
    .from("tl_def_surface")
    .select("*")
    .eq("tool_id", toolId)
    .order("surface_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addToolSurface(toolId: string, surfaceName: string): Promise<void> {
  const { error } = await sb()
    .from("tl_def_surface")
    .insert({ tool_id: toolId, surface_name: surfaceName });
  if (error) throw error;
}

export async function removeToolSurface(toolId: string, surfaceName: string): Promise<void> {
  const { error } = await sb()
    .from("tl_def_surface")
    .delete()
    .eq("tool_id", toolId)
    .eq("surface_name", surfaceName);
  if (error) throw error;
}

// ─── Bundles (reverse view) ──────────────────────────────────────────────────

export async function listToolBundleMemberships(toolId: string): Promise<BundleMembership[]> {
  const { data, error } = await sb()
    .from("tl_bundle_member")
    .select("*, bundle:tl_bundle(*)")
    .eq("tool_id", toolId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  type Joined = ToolBundleMemberRow & { bundle: ToolBundleRow | null };
  return ((data ?? []) as Joined[])
    .filter((row): row is Joined & { bundle: ToolBundleRow } => row.bundle !== null)
    .map((row) => ({
      member: {
        bundle_id: row.bundle_id,
        tool_id: row.tool_id,
        local_alias: row.local_alias,
        sort_order: row.sort_order,
        created_at: row.created_at,
      },
      bundle: row.bundle,
    }));
}

// ─── Gating (jsonb column on tl_def) ─────────────────────────────────────────

export function parseGating(gating: unknown): ToolGateEntry[] {
  if (!Array.isArray(gating)) return [];
  return gating
    .filter((g): g is { gate: string; args?: Record<string, unknown> } =>
      typeof g === "object" &&
      g !== null &&
      typeof (g as { gate?: unknown }).gate === "string",
    )
    .map((g) => ({ gate: g.gate, args: g.args ?? {} }));
}

export async function setToolGating(toolId: string, gates: ToolGateEntry[]): Promise<void> {
  const { error } = await sb()
    .from("tl_def")
    .update({ gating: gates as never })
    .eq("id", toolId);
  if (error) throw error;
}

// ─── Dependency count for soft / hard delete confirms ────────────────────────

export async function cxTlCallReferenceCount(toolName: string): Promise<number> {
  const { count, error } = await sb()
    .from("cx_tl_call")
    .select("id", { count: "exact", head: true })
    .eq("tool_name", toolName);
  if (error) throw error;
  return count ?? 0;
}

// ─── Reads for picker option lists ───────────────────────────────────────────

export async function listAllUiSurfaceNames(): Promise<string[]> {
  const { data, error } = await sb()
    .from("ui_surface")
    .select("name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.name);
}

export async function listAllExecutorKindNames(): Promise<string[]> {
  const { data, error } = await sb()
    .from("tl_executor_kind")
    .select("name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.name);
}

export async function listAllGateNames(): Promise<{ name: string; description: string | null }[]> {
  const { data, error } = await sb()
    .from("tl_gate")
    .select("name, description")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ name: r.name, description: r.description }));
}

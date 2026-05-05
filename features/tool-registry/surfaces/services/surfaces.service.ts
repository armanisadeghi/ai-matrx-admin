"use client";

import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";

type Tables = Database["public"]["Tables"];
export type UiSurfaceRow = Tables["ui_surface"]["Row"];
export type UiSurfaceUpsert = Tables["ui_surface"]["Insert"];

export interface SurfaceWithStats extends UiSurfaceRow {
  /** Number of `tl_def_surface` rows for this surface (tools that may appear here). */
  toolCount: number;
  /** Number of `agx_agent_surface` rows for this surface (agents visible here). */
  agentCount: number;
}

const sb = () => createClient();

export async function listSurfacesWithStats(): Promise<SurfaceWithStats[]> {
  const c = sb();
  const [surfacesRes, toolCountsRes, agentCountsRes] = await Promise.all([
    c.from("ui_surface").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    c.from("tl_def_surface").select("surface_name"),
    c.from("agx_agent_surface").select("surface_name"),
  ]);
  if (surfacesRes.error) throw surfacesRes.error;
  if (toolCountsRes.error) throw toolCountsRes.error;
  if (agentCountsRes.error) throw agentCountsRes.error;

  const toolByName = new Map<string, number>();
  for (const row of toolCountsRes.data ?? []) {
    toolByName.set(row.surface_name, (toolByName.get(row.surface_name) ?? 0) + 1);
  }
  const agentByName = new Map<string, number>();
  for (const row of agentCountsRes.data ?? []) {
    agentByName.set(row.surface_name, (agentByName.get(row.surface_name) ?? 0) + 1);
  }
  return (surfacesRes.data ?? []).map((s) => ({
    ...s,
    toolCount: toolByName.get(s.name) ?? 0,
    agentCount: agentByName.get(s.name) ?? 0,
  }));
}

export async function createSurface(row: UiSurfaceUpsert): Promise<UiSurfaceRow> {
  const { data, error } = await sb().from("ui_surface").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateSurface(
  name: string,
  patch: Partial<{ description: string | null; sort_order: number; is_active: boolean }>,
): Promise<void> {
  const { error } = await sb().from("ui_surface").update(patch).eq("name", name);
  if (error) throw error;
}

export async function bulkSetSurfacesActive(names: string[], isActive: boolean): Promise<void> {
  if (names.length === 0) return;
  const { error } = await sb()
    .from("ui_surface")
    .update({ is_active: isActive })
    .in("name", names);
  if (error) throw error;
}

export async function deleteSurface(name: string): Promise<void> {
  const { error } = await sb().from("ui_surface").delete().eq("name", name);
  if (error) throw error;
}

export async function listClientNames(): Promise<{ name: string; description: string | null; is_active: boolean | null }[]> {
  const { data, error } = await sb()
    .from("ui_client")
    .select("name, description, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface SurfaceTier {
  /** Range start, inclusive. */
  min: number;
  /** Range end, inclusive. */
  max: number;
  label: string;
  description: string;
}

export const SURFACE_TIERS: readonly SurfaceTier[] = [
  { min: 0,    max: 99,   label: "Reserved",        description: "Reserved sort_order band" },
  { min: 100,  max: 299,  label: "Pages",           description: "Top-level routes / primary destinations" },
  { min: 300,  max: 999,  label: "Specialized",     description: "Power-user surfaces and secondary tools" },
  { min: 1000, max: 1999, label: "Overlays",        description: "Modals, sheets, popout windows" },
  { min: 2000, max: 8999, label: "Editor variants", description: "Editor and authoring surfaces" },
  { min: 9000, max: Number.MAX_SAFE_INTEGER, label: "Debug", description: "Admin-only debugging overlays" },
];

export function tierFor(sortOrder: number): SurfaceTier {
  return SURFACE_TIERS.find((t) => sortOrder >= t.min && sortOrder <= t.max) ?? SURFACE_TIERS[0];
}

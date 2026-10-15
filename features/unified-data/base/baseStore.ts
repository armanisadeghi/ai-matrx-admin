// features/unified-data/base/baseStore.ts — a Base's identity and its snapshots, read and written through row security
// (custom.base, custom.base_snapshot: entity tables, no door). Lane AT-BASE.

import type { BaseSnapshotRecord } from "@ai-matrx/records";

import { createClient } from "@/utils/supabase/client";

export interface BaseIdentity {
  id: string;
  organization_id: string;
  home_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  template: string | null;
  snapshot_schedule: { enabled: boolean; every: string };
}

export interface BaseSnapshotRow {
  id: string;
  base_id: string;
  label: string;
  origin: "manual" | "schedule";
  tables: BaseSnapshotRecord["tables"];
  created_at: string;
}

export interface HomeTable {
  id: string;
  name: string;
  organization_id: string;
  home_id: string | null;
  icon: string | null;
  color: string | null;
}

// supabase-js has no generated types for these two tables yet (pnpm db-types after the migration); the rows are checked at the edge.
const from = (t: string) => (createClient().schema("custom" as never) as unknown as { from: (t: string) => any }).from(t);

/** Every base this person may read, in every organization they belong to (row security decides; the active organization is never a filter). */
export async function listBases(): Promise<BaseIdentity[]> {
  const { data, error } = await from("base").select("*").is("deleted_at", null).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as BaseIdentity[];
}

export async function readBase(organizationId: string, homeId: string): Promise<BaseIdentity | null> {
  const { data, error } = await from("base").select("*").eq("organization_id", organizationId).eq("home_id", homeId).is("deleted_at", null).limit(1);
  if (error) throw new Error(error.message);
  return ((data ?? [])[0] as BaseIdentity | undefined) ?? null;
}

/** Name, icon, color, description of a Home: made the first time it is saved, changed after. */
export async function saveBase(
  organizationId: string,
  homeId: string,
  identity: { name: string; icon?: string | null; color?: string | null; description?: string | null; template?: string | null },
): Promise<BaseIdentity> {
  const existing = await readBase(organizationId, homeId);
  const row = { name: identity.name.trim(), icon: identity.icon || null, color: identity.color ?? null, description: identity.description || null };
  if (existing) {
    const { data, error } = await from("base").update(row).eq("id", existing.id).select("*").limit(1);
    if (error) throw new Error(error.message);
    return (data ?? [])[0] as BaseIdentity;
  }
  const { data, error } = await from("base").insert({ ...row, organization_id: organizationId, home_id: homeId, template: identity.template ?? null }).select("*").limit(1);
  if (error) throw new Error(error.message);
  return (data ?? [])[0] as BaseIdentity;
}

export async function setSnapshotSchedule(baseId: string, enabled: boolean, every = "weekly"): Promise<void> {
  const { error } = await from("base").update({ snapshot_schedule: { enabled, every } }).eq("id", baseId);
  if (error) throw new Error(error.message);
}

export async function listSnapshots(baseId: string): Promise<BaseSnapshotRow[]> {
  const { data, error } = await from("base_snapshot").select("*").eq("base_id", baseId).is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BaseSnapshotRow[];
}

export async function saveSnapshot(organizationId: string, baseId: string, snap: BaseSnapshotRecord): Promise<BaseSnapshotRow> {
  const { data, error } = await from("base_snapshot").insert({ organization_id: organizationId, base_id: baseId, label: snap.label, origin: snap.origin, tables: snap.tables }).select("*").limit(1);
  if (error) throw new Error(error.message);
  return (data ?? [])[0] as BaseSnapshotRow;
}

/** Trash a snapshot: retention (a policy row) lets it go for good later; nothing here deletes. */
export async function trashSnapshot(id: string): Promise<void> {
  const { error } = await from("base_snapshot").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Every table this person may read, with the Home it lives in (row security decides which). */
export async function listHomeTables(homeId?: string): Promise<HomeTable[]> {
  let q = from("table").select("id,name,organization_id,home_id,icon,color").order("name");
  if (homeId) q = q.eq("home_id", homeId);
  const { data, error } = await q.limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as HomeTable[];
}

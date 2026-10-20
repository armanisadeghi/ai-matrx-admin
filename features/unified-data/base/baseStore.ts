// features/unified-data/base/baseStore.ts — a Base's identity and its snapshots, read and written through row security
// (custom.base, custom.base_snapshot: entity tables, no door). Lane AT-BASE.

import type { BaseSnapshotRecord } from "@ai-matrx/records";

import { putJson } from "@/lib/python-client";
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
  /** done | failed (FIX-SNAP3): a server job that stopped leaves a failed row with no tables and the sentence it stopped with. */
  state?: "done" | "failed";
  failure?: string | null;
  /** The server job that made it (one snapshot per job; the job writes this row itself). */
  job_id?: string | null;
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

/**
 * The store's own refusal, kept whole: the sentence AND its SQLSTATE. A bare `new Error(error.message)` dropped the code, so a
 * statement timeout (57014) reached ErrorNotice and the capture layer as Postgres' raw words with nothing saying what it was.
 */
export function storeError(error: { message?: string; code?: string | null; details?: unknown; hint?: unknown }): Error & { code?: string; sqlstate?: string } {
  const e = new Error(error.message || "The store refused this.") as Error & { code?: string; sqlstate?: string; details?: unknown; hint?: unknown };
  if (error.code) { e.code = error.code; e.sqlstate = error.code; }
  if (error.details) e.details = error.details;
  if (error.hint) e.hint = error.hint;
  return e;
}

type Door = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> };
const door = (fn: string, args: Record<string, unknown>) => (createClient().schema("custom" as never) as unknown as Door).rpc(fn, args);

/** A person who keeps reaching a base through a share after it moves, because they are not a member of the target workspace. */
export interface KeptAccess { user_id: string; name: string; email: string | null; shares: number; level: string }

/** Who keeps access after this base moves to that workspace (`custom.base_move_access_kept`; admin on the base). */
export async function baseMoveAccessKept(homeId: string, toOrganizationId: string): Promise<KeptAccess[]> {
  const { data, error } = await door("base_move_access_kept", { p_home_id: homeId, p_to_organization_id: toOrganizationId });
  if (error) throw storeError(error);
  return Array.isArray(data) ? (data as KeptAccess[]) : [];
}

/** After the move: take back the shares of these people (only non-members of the base's workspace; `custom.base_move_remove_access`). */
export async function baseMoveRemoveAccess(homeId: string, userIds: readonly string[]): Promise<{ removed: number; message: string }> {
  const { data, error } = await door("base_move_remove_access", { p_home_id: homeId, p_user_ids: [...userIds] });
  if (error) throw storeError(error);
  return data as { removed: number; message: string };
}

/** Every base this person may read, in every organization they belong to (row security decides; the active organization is never a filter). */
export async function listBases(): Promise<BaseIdentity[]> {
  const { data, error } = await from("base").select("*").is("deleted_at", null).order("name");
  if (error) throw storeError(error);
  return (data ?? []) as BaseIdentity[];
}

export async function readBase(organizationId: string, homeId: string): Promise<BaseIdentity | null> {
  const { data, error } = await from("base").select("*").eq("organization_id", organizationId).eq("home_id", homeId).is("deleted_at", null).limit(1);
  if (error) throw storeError(error);
  return ((data ?? [])[0] as BaseIdentity | undefined) ?? null;
}

/** Name, icon, color, description of a Home: made the first time it is saved, changed after. */
export async function saveBase(
  organizationId: string,
  homeId: string,
  identity: { name: string; icon?: string | null; color?: string | null; description?: string | null; template?: string | null },
  /** The base row's id when the screen already holds it: the save is then ONE statement (no read first). */
  knownId?: string | null,
): Promise<BaseIdentity> {
  const existing = knownId ? { id: knownId } : await readBase(organizationId, homeId);
  const row = { name: identity.name.trim(), icon: identity.icon || null, color: identity.color ?? null, description: identity.description || null };
  if (existing) {
    const { data, error } = await from("base").update(row).eq("id", existing.id).select("*").limit(1);
    if (error) throw storeError(error);
    return (data ?? [])[0] as BaseIdentity;
  }
  const { data, error } = await from("base").insert({ ...row, organization_id: organizationId, home_id: homeId, template: identity.template ?? null }).select("*").limit(1);
  if (error) throw storeError(error);
  return (data ?? [])[0] as BaseIdentity;
}

/**
 * The "Take a snapshot every week" toggle. ON makes THIS base's own schedule on the platform scheduler (aidream
 * `PUT /base-snapshots/schedule`), OFF removes it; the server also writes `custom.base.snapshot_schedule`. Nothing exists until a
 * person turns it on. Answers the new state.
 */
export async function setSnapshotSchedule(organizationId: string, baseId: string, enabled: boolean, every: "daily" | "weekly" = "weekly"): Promise<{ enabled: boolean; every: string }> {
  const { data } = await putJson<{ snapshot_schedule: { enabled: boolean; every: string } }>("/base-snapshots/schedule", { base_id: baseId, enabled, every }, { organizationId });
  return data.snapshot_schedule;
}

export async function listSnapshots(baseId: string): Promise<BaseSnapshotRow[]> {
  const { data, error } = await from("base_snapshot").select("*").eq("base_id", baseId).is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw storeError(error);
  return (data ?? []) as BaseSnapshotRow[];
}

export async function saveSnapshot(organizationId: string, baseId: string, snap: BaseSnapshotRecord): Promise<BaseSnapshotRow> {
  const { data, error } = await from("base_snapshot").insert({ organization_id: organizationId, base_id: baseId, label: snap.label, origin: snap.origin, tables: snap.tables }).select("*").limit(1);
  if (error) throw storeError(error);
  return (data ?? [])[0] as BaseSnapshotRow;
}

/** Trash a snapshot: retention (a policy row) lets it go for good later; nothing here deletes. */
export async function trashSnapshot(id: string): Promise<void> {
  const { error } = await from("base_snapshot").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw storeError(error);
}

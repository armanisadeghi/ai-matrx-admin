"use client";

/**
 * The person's own server-side working state for one surface: `users.user_surface_state`, one row per
 * (person, feature, surface_key). It is where anything a person has typed or decided but not yet saved as a
 * record lives (Smart Add's answers before Create, the question desk's unsaved answer drafts), so it survives a
 * reload, a closed tab and another device. It is NOT a preference and never rides the boot seed: a surface reads
 * its row when it engages. A retired row is soft-deleted (`deleted_at`); the next write revives it.
 */

import { supabase } from "@/utils/supabase/client";
import type { Json } from "@/types/database.types";

const surfaceTable = () => supabase.schema("users").from("user_surface_state");

export interface SurfaceStateKey {
  userId: string;
  feature: string;
  surfaceKey: string;
}

/** The live row's state, or null when there is none. A read failure throws (the caller says so). */
export async function readSurfaceState({ userId, feature, surfaceKey }: SurfaceStateKey): Promise<{ state: unknown } | null> {
  const { data, error } = await surfaceTable()
    .select("state")
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("surface_key", surfaceKey)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { state: data.state } : null;
}

/** Upsert the row (reviving a retired one). Returns the refusal sentence, or null when it is saved. */
export async function writeSurfaceState(key: SurfaceStateKey & { organizationId: string; state: Json }): Promise<string | null> {
  const { error } = await surfaceTable().upsert(
    {
      user_id: key.userId,
      created_by: key.userId,
      updated_by: key.userId,
      organization_id: key.organizationId,
      feature: key.feature,
      surface_key: key.surfaceKey,
      state: key.state,
      deleted_at: null,
    },
    { onConflict: "user_id,feature,surface_key" },
  );
  return error ? error.message : null;
}

/** Retire the row (soft delete). Returns the refusal sentence, or null. */
export async function retireSurfaceState({ userId, feature, surfaceKey }: SurfaceStateKey): Promise<string | null> {
  const { error } = await surfaceTable()
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("surface_key", surfaceKey)
    .is("deleted_at", null);
  return error ? error.message : null;
}

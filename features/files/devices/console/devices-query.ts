/**
 * The computers the device console can open: this person's ACTIVE devices (the relay refuses an
 * inactive one), newest check-in first. Takes the Supabase client, so the server page and the
 * browser run the one query. `user_id` is what the relay checks a token against (`user_id = sub`).
 * No "use client": the server page imports it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { DeviceRow } from "../types";
import { computerQuery, onlyComputers } from "@/lib/app-instances/computers";

/** Only what the console renders — never `select("*")`. */
export const CONSOLE_DEVICE_COLUMNS = "id, instance_id, instance_name, hostname, platform, os_version, app_version, last_seen, is_active, created_at, organization_id";

/**
 * A Matrx 2 TEST copy's row: the `inst_automation_` instance id only desktop automationIdentity mints.
 * The same mark as the database's platform.is_test_app_instance (the idle-test sweep's one filter).
 */
export function isTestDevice(row: { instance_id?: string | null }): boolean {
  return typeof row.instance_id === "string" && row.instance_id.startsWith("inst_automation_");
}

/** The person's own computers first (newest check-in first, as read), test copies after them. */
export function testDevicesLast<T extends { instance_id?: string | null }>(rows: readonly T[]): T[] {
  return [...rows.filter((r) => !isTestDevice(r)), ...rows.filter(isTestDevice)];
}

export async function fetchConsoleDevices(client: SupabaseClient, userId: string): Promise<DeviceRow[]> {
  const { data, error } = await onlyComputers(
    client
      .from("app_instances")
      .select(CONSOLE_DEVICE_COLUMNS)
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("last_seen", { ascending: false, nullsFirst: false }),
    client,
  );
  if (error) throw error;
  return testDevicesLast((data ?? []) as unknown as DeviceRow[]);
}

/** One device, if it is this person's and active; null otherwise (the page shows the access gate). */
export async function fetchConsoleDevice(client: SupabaseClient, userId: string, deviceId: string): Promise<DeviceRow | null> {
  const { query } = await computerQuery(
    client
      .from("app_instances")
      .select(CONSOLE_DEVICE_COLUMNS)
      .eq("id", deviceId)
      .eq("user_id", userId)
      .is("deleted_at", null),
    client,
  );
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as DeviceRow | null;
}

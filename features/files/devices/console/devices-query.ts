/**
 * The computers the device console can open: this person's ACTIVE devices (the relay refuses an
 * inactive one), newest check-in first. Takes the Supabase client, so the server page and the
 * browser run the one query. `user_id` is what the relay checks a token against (`user_id = sub`).
 * No "use client": the server page imports it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { DeviceRow } from "../types";
import { computerQuery, isComputerPlatform, isTestDevice, nonComputerPlatforms, onlyComputers } from "@/lib/app-instances/computers";

export { isTestDevice };

/** Only what the console renders — never `select("*")`. */
export const CONSOLE_DEVICE_COLUMNS = "id, instance_id, instance_name, hostname, platform, os_version, app_version, last_seen, is_active, created_at, organization_id";

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

/**
 * Why the console can or cannot open a device: the REAL reason, never a blanket "no access"
 * (2026-10-17: a test copy owned by the same person read "You don't have access to this app
 * instance"). One read by id; each refusal names what is true.
 */
export type ConsoleDeviceVerdict =
  | { kind: "ok"; device: DeviceRow }
  | { kind: "not_found" }
  | { kind: "not_yours" }
  | { kind: "removed" }
  | { kind: "not_a_computer"; platform: string | null }
  | { kind: "turned_off"; device: DeviceRow };

export async function consoleDeviceVerdict(client: SupabaseClient, userId: string, deviceId: string): Promise<ConsoleDeviceVerdict> {
  // app-instances: not-a-computer-list (reads ANY row by id so the page can say "This isn't a computer")
  const { data, error } = await client
    .from("app_instances")
    .select(`${CONSOLE_DEVICE_COLUMNS}, user_id, deleted_at`)
    .eq("id", deviceId)
    .maybeSingle();
  // A malformed id is no device at all (Postgres 22P02), not a failure to report.
  if (error && (error as { code?: string }).code === "22P02") return { kind: "not_found" };
  if (error) throw error;
  if (!data) return { kind: "not_found" };
  const row = data as unknown as DeviceRow & { user_id: string | null; deleted_at: string | null };
  if (row.user_id !== userId) return { kind: "not_yours" };
  if (row.deleted_at) return { kind: "removed" };
  if (!isComputerPlatform(row.platform, await nonComputerPlatforms(client))) return { kind: "not_a_computer", platform: row.platform };
  if (row.is_active === false) return { kind: "turned_off", device: row };
  return { kind: "ok", device: row };
}

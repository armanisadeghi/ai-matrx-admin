/**
 * THE ONE DOOR to the web app's own `public.app_config` row (`ai-matrx`).
 *
 * Config attestation (lane CONFIG-ATTEST-ROLLOUT): the release manifest declares every key this
 * build reads by finding the literal calls `readAppConfigKey("…")` and `readAppFlag("…")`
 * (scripts/config-attestation/lib.ts), and each call counts a read for the admin's Attestation tab.
 * Reading the row any other way makes a key look unread — red — while code depends on it.
 *
 * One fetch per 60 s window per tab is shared by every key; a failed read is returned (never
 * thrown, never replaced by a default) so each caller says what it could not do.
 */
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { noteConfigRead } from "./readLedger";

export const WEB_APP_CONFIG_ROW = "ai-matrx";
const TTL_MS = 60_000;

interface RowRead {
  at: number;
  config: Record<string, unknown> | null;
  minSupportedAppVersion: string | null;
  found: boolean;
  error: PostgrestError | null;
}

let held: RowRead | null = null;
let inFlight: Promise<RowRead> | null = null;

async function loadRow(): Promise<RowRead> {
  if (held && Date.now() - held.at < TTL_MS) return held;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { data, error } = await createClient()
      .from("app_config")
      .select("config, min_supported_app_version")
      .eq("app", WEB_APP_CONFIG_ROW)
      .is("deleted_at", null)
      .maybeSingle();
    const row = data as { config: unknown; min_supported_app_version: string | null } | null;
    const read: RowRead = {
      at: Date.now(),
      config: row && typeof row.config === "object" && row.config !== null && !Array.isArray(row.config) ? (row.config as Record<string, unknown>) : null,
      minSupportedAppVersion: row?.min_supported_app_version ?? null,
      found: row !== null,
      error,
    };
    // A failed read is never cached: the next caller asks again.
    if (!error) held = read;
    return read;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export interface AppConfigRead<T = unknown> {
  /** The stored value; `undefined` when the row or the key is absent or the read failed. */
  value: T | undefined;
  /** The row exists (false with a null error = the row is missing). */
  found: boolean;
  error: PostgrestError | null;
}

/** Keys of the `ai-matrx` row this app reads (plus the `min_supported_app_version` column). */
export type WebAppConfigKey = "credential_maintenance" | "notice" | "min_supported_app_version";

export async function readAppConfigKey<T = unknown>(key: WebAppConfigKey): Promise<AppConfigRead<T>> {
  const row = await loadRow();
  const value = (key === "min_supported_app_version" ? (row.minSupportedAppVersion ?? undefined) : row.config?.[key]) as T | undefined;
  if (!row.error && row.found) noteConfigRead("app_config", null, key, "db", value ?? null);
  return { value, found: row.found, error: row.error };
}

/**
 * A feature flag of the web app (`config.flags.<name>`, each flag its own attested key). An
 * absent flag is `undefined` — the caller decides what "not set" means, out loud.
 */
export async function readAppFlag(name: string): Promise<AppConfigRead<boolean>> {
  const row = await loadRow();
  const flags = row.config?.flags;
  const value = flags && typeof flags === "object" ? (flags as Record<string, unknown>)[name] : undefined;
  if (!row.error && row.found) noteConfigRead("app_config", null, `flags.${name}`, "db", value ?? null, value !== undefined && typeof value !== "boolean");
  return { value: typeof value === "boolean" ? value : undefined, found: row.found, error: row.error };
}

/** Tests, and after an admin write in this tab. */
export function invalidateWebAppConfig(): void {
  held = null;
}

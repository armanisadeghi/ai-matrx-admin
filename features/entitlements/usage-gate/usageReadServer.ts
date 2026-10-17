// features/entitlements/usage-gate/usageReadServer.ts
//
// The landing-time read of `billing.user_usage_state` on the server, run by a
// layout IN PARALLEL with the reads it already makes (USAGE-GATE.md rule 9).
// Fails soft to null.
//
// ONE read, two ways to land (the boot seed's pattern, lib/boot/coreBootSeed.server.ts):
// `readUsageSnapshotServer` answers by the first-byte deadline; past it the SAME
// read keeps going and `streamedUsageSeedServer` streams its answer to the
// browser as an inline script (`BootSeedScript`), so the browser does not ask
// the database a second time (first-paint fetch contract, 2026-10-16).

import type { createClient } from "@/utils/supabase/server";
import { parseUsageSnapshot, type UsageSnapshot } from "./usageState";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * 🚨 This read sits in the (core) layout, so every signed-in document waits on
 * it. Healthy it is ~100 ms; its tail has reached 7.4 s (pg_stat_statements,
 * 2026-10-09). Past this deadline the page paints without it and the late
 * answer streams (below); only a read that fails outright leaves the browser
 * to read it, after the page settles.
 */
const USAGE_SEED_DEADLINE_MS = 400;
/** A late answer still streams to the browser until this. */
const USAGE_STREAM_DEADLINE_MS = 4_000;

/** The raw `user_usage_state` answer per request client — one read, shared by both landings. */
const reads = new WeakMap<ServerClient, Promise<unknown | null>>();

function readRaw(supabase: ServerClient): Promise<unknown | null> {
  const held = reads.get(supabase);
  if (held) return held;
  const read = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), USAGE_STREAM_DEADLINE_MS);
    try {
      const { data, error } = await supabase
        .schema("billing")
        .rpc("user_usage_state")
        .abortSignal(controller.signal);
      if (controller.signal.aborted) {
        console.warn(`[usage-gate] landing usage read passed ${USAGE_STREAM_DEADLINE_MS} ms; the client reads it after the page settles`);
        return null;
      }
      if (error) {
        console.warn(`[usage-gate] landing usage read failed: ${error.message}`);
        return null;
      }
      return data ?? null;
    } catch (err) {
      console.warn("[usage-gate] landing usage read threw", err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  reads.set(supabase, read);
  return read;
}

/** The usage seed by the first-byte deadline, or null past it (the first byte never waits longer). */
export async function readUsageSnapshotServer(supabase: ServerClient): Promise<UsageSnapshot | null> {
  const raw = await Promise.race([
    readRaw(supabase),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), USAGE_SEED_DEADLINE_MS)),
  ]);
  return raw === null ? null : parseUsageSnapshot(raw);
}

/**
 * The same read's raw answer whenever it lands (≤ 4 s) — streamed by the layout when
 * `readUsageSnapshotServer` missed its deadline; the browser parses it again
 * (`takeStreamedUsageSeed`), so a malformed answer never seeds.
 */
export function streamedUsageSeedServer(supabase: ServerClient): Promise<unknown | null> {
  return readRaw(supabase);
}

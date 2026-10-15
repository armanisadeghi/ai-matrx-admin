import "server-only";
/**
 * The web app's SERVER-side config-read reporter (config attestation, lane CONFIG-ATTEST-ROLLOUT).
 *
 * Reads made by the Next.js server (route handlers, Server Components) never reach the browser
 * recorder, so without this they would show amber ("Not read in N days") although code reads them.
 * Adopts `@ai-matrx/data/config-attestation` `createConfigReadRecorder` and reports through
 * `platform.config_reads_report_server` (service_role only), the same door aidream's server uses
 * (aidream/services/app_config/attestation.py). Identity follows that door:
 *   - device row: `server:ai-matrx:<instance_key>`, one per (app, region) — `vercel-<VERCEL_REGION>`
 *     in production, `local-<hostname>` in development (announced), never one per lambda;
 *   - build: VERCEL_GIT_COMMIT_SHA, or the checkout HEAD in development (lib/config-attestation/
 *     buildIdentity.server.ts). No sha → nothing is recorded and that is counted + logged once.
 * Cheap and batched: a read is an in-memory counter; a flush is due every
 * `platform.config_attestation / flush_interval_minutes` and rides the request that notices it
 * (`after()`), so a frozen serverless instance never needs a timer.
 */
import { hostname } from "node:os";
import { after } from "next/server";
import { createConfigReadRecorder, type FlushingConfigReadRecorder } from "@ai-matrx/data/config-attestation";
import type { KnobRpc } from "@ai-matrx/data/knobs";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { localBuildSha, serverAppVersion } from "./buildIdentity.server";

const APP = "ai-matrx";
const FLUSH_FEATURE = "platform.config_attestation";
const FLUSH_KEY = "flush_interval_minutes";

/** Every stand-in on this path, counted (law 4). */
export const serverConfigAttestationCounters = { reads: 0, unattributed_reads: 0, flushes: 0, flush_failures: 0 };

type State = {
  recorder: FlushingConfigReadRecorder | null;
  disabled: boolean;
  lastFlush: number;
  scheduled: boolean;
  flushMinutes: number | null;
};
const g = globalThis as unknown as { __matrxServerConfigAttestation?: State };
const state: State = (g.__matrxServerConfigAttestation ??= { recorder: null, disabled: false, lastFlush: 0, scheduled: false, flushMinutes: null });

function safe(part: string): string {
  return part.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 100);
}

/** The door's instance_key: one row per (app, region). */
export function serverInstanceKey(env: NodeJS.ProcessEnv = process.env): string {
  if (env.VERCEL_REGION) return safe(`vercel-${env.VERCEL_REGION}`);
  return safe(`local-${hostname()}`);
}

function buildSha(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA || localBuildSha();
}

function log(level: "info" | "warn" | "error", event: string, data: Record<string, unknown>): void {
  const line = `[config-attestation:server] ${event}`;
  if (level === "error") console.error(line, data);
  else if (level === "warn") console.warn(line, data);
  else if (process.env.NODE_ENV === "development") console.info(line, data);
}

/** Map the recorder's person door onto the server door; everything else passes through. */
function serverRpc(): KnobRpc {
  const admin = createAdminClient();
  const platform = admin.schema("platform" as never) as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
  };
  return (name, args) => {
    if (name !== "config_reads_report") return platform.rpc(name, args);
    return platform.rpc("config_reads_report_server", {
      p_report: args.p_report,
      p_instance: { instance_key: serverInstanceKey(), hostname: safe(hostname()) },
    });
  };
}

async function refreshFlushMinutes(): Promise<void> {
  const { data, error } = await createAdminClient()
    .schema("platform" as never)
    .from("feature_knob" as never)
    .select("value")
    .eq("feature" as never, FLUSH_FEATURE as never)
    .eq("key" as never, FLUSH_KEY as never)
    .maybeSingle();
  const value = Number((data as { value?: unknown } | null)?.value);
  if (error || !Number.isFinite(value) || value <= 0) {
    log("error", "flush_interval_unavailable", { error: error?.message ?? null, value: (data as { value?: unknown } | null)?.value ?? null, retry: "next due check" });
    return;
  }
  state.flushMinutes = value;
}

function recorder(): FlushingConfigReadRecorder | null {
  if (state.recorder || state.disabled) return state.recorder;
  const sha = buildSha();
  const version = serverAppVersion();
  if (!/^[0-9a-f]{40}$/.test(sha) || !version) {
    state.disabled = true;
    log("error", "server_reads_unattributed", { why: "no build sha or app version on this server; server-side config reads are counted but not reported", sha: sha || null });
    return null;
  }
  if (process.env.NODE_ENV === "development") {
    log("warn", "local_build", { why: "development server reports under the checkout HEAD (tree may be dirty)", sha, instance_key: serverInstanceKey() });
  }
  let spool: unknown = null;
  state.recorder = createConfigReadRecorder({
    app: APP,
    appVersion: version,
    buildSha: sha,
    // The server door upserts its own app_instances row from p_instance; these two are not used by it.
    device: () => ({ deviceId: `server:${APP}:${serverInstanceKey()}`, organizationId: "system" }),
    client: serverRpc(),
    // start() (the timer) is never called here: flushIfDue owns the cadence, so this is only informational.
    flushMinutes: () => state.flushMinutes ?? Number.NaN,
    automation: process.env.NODE_ENV === "development",
    log: (level, event, data) => log(level === "info" ? "info" : level === "warn" ? "warn" : "error", event, data),
    spool: { load: () => spool, save: (v) => (spool = v) },
  });
  return state.recorder;
}

/** internal-bound: while the interval knob is unreadable (logged at error) a flush is retried this often. */
const UNKNOWN_INTERVAL_RETRY_MS = 60_000;

function flushIfDue(): void {
  if (state.scheduled) return;
  const windowMs = state.flushMinutes === null ? UNKNOWN_INTERVAL_RETRY_MS : state.flushMinutes * 60_000;
  // The first read of a process is always due, so the interval knob is learned on the first flush.
  if (state.lastFlush !== 0 && Date.now() - state.lastFlush < windowMs) return;
  state.scheduled = true;
  const run = async () => {
    state.lastFlush = Date.now();
    try {
      if (state.flushMinutes === null) await refreshFlushMinutes();
      await state.recorder?.flush();
      serverConfigAttestationCounters.flushes += 1;
    } catch (error) {
      serverConfigAttestationCounters.flush_failures += 1;
      log("warn", "flush_failed", { error: String(error).slice(0, 300) });
    } finally {
      state.scheduled = false;
    }
  };
  try {
    after(run);
  } catch {
    // Outside a request scope (a script or a test): flush in the background instead.
    void run();
  }
}

/** Count one server-side config read. Cheap: a counter bump; a flush rides the request when due. */
export function noteServerConfigRead(
  kind: "knob" | "app_config",
  feature: string | null,
  key: string,
  source: "db" | "cache" | "snapshot" | "env",
  value?: unknown,
  invalid = false,
): void {
  serverConfigAttestationCounters.reads += 1;
  const r = recorder();
  if (!r) {
    serverConfigAttestationCounters.unattributed_reads += 1;
    return;
  }
  r.read({ kind, feature, key, source, invalid, value });
  flushIfDue();
}

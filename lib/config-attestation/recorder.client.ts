/**
 * The web app's config-read recorder (config attestation, lane CONFIG-ATTEST-ROLLOUT).
 *
 * Adopts `@ai-matrx/data/config-attestation` `createConfigReadRecorder`; rebuilds nothing. This
 * file supplies the web's answers to its questions:
 *   - build: the commit sha + app version the root layout writes into <meta> (Vercel's
 *     VERCEL_GIT_COMMIT_SHA in production; the checkout's HEAD in development, announced loudly).
 *     No sha → the recorder does not start, and that is a counted signal, not a quiet skip.
 *   - device: THIS browser profile's install row in `public.app_instances` — platform `web`,
 *     instance_id `web:<getWebDeviceId()>` (the same id as the settings device rung), one per
 *     (person, browser profile). `platform.is_computer_instance` keeps it out of every computer list.
 *   - spool: localStorage, capped; an over-cap save drops the OLDEST unsent buckets and counts them.
 *   - flush: every `platform.config_attestation / flush_interval_minutes`, and when the tab hides.
 */
import { createConfigReadRecorder, type FlushingConfigReadRecorder } from "@ai-matrx/data/config-attestation";
import type { KnobRpc } from "@ai-matrx/data/knobs";
import { knobInt } from "@/lib/knobs/featureKnobs";
import { currentCommitSha } from "@/lib/deployment/build-identity";
import { getWebDeviceId } from "@/lib/scoped-config/deviceId";
import { sessionKnobPrincipals } from "@/lib/scoped-config/sessionKnob";
import { defineClientKey } from "@/lib/sync/client-storage";
import { createClient } from "@/utils/supabase/client";
import { attachConfigReadRecorder, configAttestationCounters } from "./readLedger";
import { APP_VERSION_META, LOCAL_BUILD_META } from "./meta";

export const WEB_APP = "ai-matrx";
/** Bytes of JSON the unsent-bucket spool may hold before the oldest buckets are dropped (counted). */
export const SPOOL_CAP_BYTES = 200_000;

const spoolKey = defineClientKey({
  id: "config-attestation.spool.v1",
  area: "local",
  kind: "cache",
  reason: "Config-read report buckets not yet accepted by the server; capped, drops are counted.",
});

const log = (level: "info" | "warn" | "error", event: string, data: Record<string, unknown>) => {
  const line = `[config-attestation] ${event}`;
  if (level === "error") console.error(line, data);
  else if (level === "warn") console.warn(line, data);
  else if (process.env.NODE_ENV === "development") console.info(line, data);
};

function meta(name: string): string | null {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || null;
}

/** Cap the spool: drop the oldest pending buckets until it fits, counting every drop. */
export function capSpool(v: unknown, capBytes = SPOOL_CAP_BYTES): { value: unknown; dropped: number } {
  const spool = v as { pending?: unknown[] } | null;
  if (!spool || !Array.isArray(spool.pending)) return { value: v, dropped: 0 };
  let dropped = 0;
  while (spool.pending.length > 0 && JSON.stringify(spool).length > capBytes) {
    spool.pending.shift();
    dropped += 1;
  }
  return { value: spool, dropped };
}

function browserLabel(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "browser";
}

/** Upsert this browser profile's install row; its id is the report's device. */
async function registerWebInstall(userId: string, organizationId: string, appVersion: string): Promise<string | null> {
  const deviceId = getWebDeviceId();
  if (!deviceId) {
    configAttestationCounters.register_failures += 1;
    log("error", "web_install_no_device_id", { why: "localStorage unavailable; this browser cannot be one install" });
    return null;
  }
  const { data, error } = await createClient()
    .from("app_instances")
    .upsert(
      {
        user_id: userId,
        instance_id: `web:${deviceId}`,
        instance_name: `AI Matrx web — ${browserLabel()}`,
        platform: "web",
        organization_id: organizationId,
        app_version: appVersion,
        is_active: true,
        last_seen: new Date().toISOString(),
        metadata: { client: "ai-matrx-web" },
      },
      { onConflict: "user_id,instance_id" },
    )
    .select("id")
    .single();
  if (error || !data) {
    configAttestationCounters.register_failures += 1;
    log("error", "web_install_register_failed", { error: error?.message ?? "no row", code: error?.code ?? null });
    return null;
  }
  return (data as { id: string }).id;
}

let started: FlushingConfigReadRecorder | null = null;

/**
 * Start once, after sign-in. Returns false while it cannot start yet (no principals); true once
 * started or definitively not startable (no sha — counted and logged once).
 */
export async function startConfigAttestation(): Promise<boolean> {
  if (started) return true;
  const { organizationId, userId } = sessionKnobPrincipals();
  if (!organizationId || !userId) return false;
  const sha = currentCommitSha();
  const appVersion = meta(APP_VERSION_META);
  if (!sha || !/^[0-9a-f]{40}$/.test(sha) || !appVersion) {
    configAttestationCounters.missing_sha += 1;
    log("error", "no_build_identity", {
      sha,
      appVersion,
      why: "this page carries no build sha/version, so its config reads cannot be attributed to a build; nothing is reported",
    });
    return true;
  }
  const local = meta(LOCAL_BUILD_META) === "true";
  if (local) {
    log("warn", "local_build", { sha, why: "development: the build sha is this checkout's HEAD and the tree may be dirty; reports are filed as automation" });
  }
  const installId = await registerWebInstall(userId, organizationId, appVersion);
  if (!installId) return true;
  let flushMinutes: number | null = null;
  const refreshFlushMinutes = () =>
    knobInt("platform.config_attestation", "flush_interval_minutes")
      .then((m) => {
        flushMinutes = m;
      })
      .catch((error: unknown) => log("error", "flush_interval_unreadable", { error: String(error).slice(0, 300) }));
  await refreshFlushMinutes();
  const recorder = createConfigReadRecorder({
    app: WEB_APP,
    appVersion,
    buildSha: sha,
    device: () => {
      const p = sessionKnobPrincipals();
      return p.organizationId ? { deviceId: installId, organizationId: p.organizationId } : null;
    },
    // The RPC door the package calls (`platform.config_reads_report`), typed loosely on purpose:
    // the generated Database type and the package's structural KnobClient do not unify.
    client: ((name: string, args: Record<string, unknown>) =>
      (createClient().schema("platform") as unknown as { rpc: (n: string, a: Record<string, unknown>) => PromiseLike<unknown> }).rpc(
        name,
        args,
      )) as unknown as KnobRpc,
    flushMinutes: () => {
      void refreshFlushMinutes();
      if (flushMinutes === null) throw new Error("platform.config_attestation/flush_interval_minutes has not been read");
      return flushMinutes;
    },
    automation: local || navigator.webdriver === true,
    log,
    spool: {
      load: () => spoolKey.getJSON<unknown>() ?? undefined,
      save: (v) => {
        const { value, dropped } = capSpool(v);
        if (dropped) {
          configAttestationCounters.spool_drops += dropped;
          log("error", "spool_over_cap", { dropped, capBytes: SPOOL_CAP_BYTES, totalDropped: configAttestationCounters.spool_drops });
        }
        spoolKey.setJSON(value);
      },
    },
  });
  started = recorder;
  attachConfigReadRecorder(recorder);
  recorder.start();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void recorder.flush();
  });
  // Development handle for proofs: flush now and read the counters from the console.
  if (process.env.NODE_ENV === "development") {
    (window as unknown as Record<string, unknown>).__matrxConfigAttestation = { flush: () => recorder.flush(), counters: configAttestationCounters, installId, sha };
  }
  log("info", "started", { sha, appVersion, installId });
  return true;
}

/** The running recorder (dev tools / proof). */
export function configAttestationRecorder(): FlushingConfigReadRecorder | null {
  return started;
}

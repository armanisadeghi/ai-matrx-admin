// features/admin/applications/attestation/rpc.ts
//
// The three reads of the Attestation tab. Each throws on a database error so the
// caller shows it (never an empty table that reads as "nothing to see").

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  AttestationManifest,
  AttestationReleaseRow,
  AttestationStatusRow,
  ManifestBootstrap,
} from "@/features/admin/applications/attestation/types";

type Client = SupabaseClient<Database>;

export async function fetchAttestationStatus(
  supabase: Client,
  app: string,
  buildSha: string | null,
): Promise<AttestationStatusRow[]> {
  const { data, error } = await supabase
    .schema("platform")
    .rpc("config_attestation_status", {
      p_app: app,
      ...(buildSha ? { p_build_sha: buildSha } : {}),
    });
  if (error) throw new Error(`Attestation status failed to load: ${error.message}`);
  return data ?? [];
}

export async function fetchAttestationReleases(
  supabase: Client,
  app: string,
): Promise<AttestationReleaseRow[]> {
  const { data, error } = await supabase
    .schema("platform")
    .rpc("config_attestation_releases", { p_app: app });
  if (error) throw new Error(`Attested releases failed to load: ${error.message}`);
  return data ?? [];
}

/** The attested manifest for one build, or the latest one when buildSha is null. */
export async function fetchAttestationManifest(
  supabase: Client,
  app: string,
  buildSha: string | null,
): Promise<AttestationManifest | null> {
  let query = supabase
    .schema("platform")
    .from("config_manifest")
    .select("app, app_version, build_sha, attested_at, key_count, manifest, gate_run")
    .eq("app", app)
    .is("deleted_at", null);
  if (buildSha) query = query.eq("build_sha", buildSha);
  const { data, error } = await query
    .order("attested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Attested manifest failed to load: ${error.message}`);
  if (!data) return null;
  const manifest = (data.manifest ?? {}) as { bootstrap?: ManifestBootstrap; unresolved?: { count?: number } };
  const gate = (data.gate_run ?? null) as AttestationManifest["gate_run"];
  const unresolved = manifest.unresolved?.count ?? gate?.unresolved;
  return {
    app: data.app,
    app_version: data.app_version,
    build_sha: data.build_sha,
    attested_at: data.attested_at,
    key_count: data.key_count,
    bootstrap: manifest.bootstrap ?? null,
    gate_run: gate,
    unresolved: typeof unresolved === "number" ? unresolved : null,
  };
}

/** Per-key read counts by value source (database / cache / snapshot / env) for one attested
 *  build, over the same observed window the status RPC uses
 *  (knob platform.config_attestation/observed_window_days). Key = `${kind}:${feature ?? ""}:${key}`. */
export type SourceCounts = { db: number; cache: number; snapshot: number; env: number };

export async function fetchSourceBreakdown(
  supabase: Client,
  app: string,
  buildSha: string,
): Promise<Record<string, SourceCounts>> {
  const { data: knob, error: knobError } = await supabase
    .schema("platform")
    .from("feature_knob")
    .select("value")
    .eq("feature", "platform.config_attestation")
    .eq("key", "observed_window_days")
    .maybeSingle();
  if (knobError) throw new Error(`Observed window failed to load: ${knobError.message}`);
  const windowDays = Number(knob?.value);
  if (!Number.isFinite(windowDays)) {
    throw new Error("Knob platform.config_attestation/observed_window_days is not seeded");
  }
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .schema("platform")
    .from("config_read_bucket")
    .select("reads")
    .eq("app", app)
    .eq("build_sha", buildSha)
    .eq("attested_build", true)
    .gte("bucket_end", since);
  if (error) throw new Error(`Read sources failed to load: ${error.message}`);
  const out: Record<string, SourceCounts> = {};
  for (const bucket of data ?? []) {
    const reads = Array.isArray(bucket.reads) ? bucket.reads : [];
    for (const raw of reads) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as { kind?: string; feature?: string | null; key?: string; sources?: Record<string, unknown> };
      if (!r.key) continue;
      const id = `${r.kind ?? ""}:${r.feature ?? ""}:${r.key}`;
      const acc = (out[id] ??= { db: 0, cache: 0, snapshot: 0, env: 0 });
      for (const k of ["db", "cache", "snapshot", "env"] as const) {
        const n = Number(r.sources?.[k] ?? 0);
        if (Number.isFinite(n)) acc[k] += n;
      }
    }
  }
  return out;
}

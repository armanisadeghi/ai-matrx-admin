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
  const manifest = (data.manifest ?? {}) as { bootstrap?: ManifestBootstrap };
  return {
    app: data.app,
    app_version: data.app_version,
    build_sha: data.build_sha,
    attested_at: data.attested_at,
    key_count: data.key_count,
    bootstrap: manifest.bootstrap ?? null,
    gate_run: (data.gate_run ?? null) as AttestationManifest["gate_run"],
  };
}

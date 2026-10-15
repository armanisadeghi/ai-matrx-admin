// features/admin/applications/attestation/types.ts
//
// Config attestation (Applications › Attestation): is every config value an app
// has stored actually read by the build installs run? Rows come from
// platform.config_attestation_status / config_attestation_releases (platform-admin
// SECURITY DEFINER doors) and platform.config_manifest. The colour of each row is
// decided ONLY in SQL (the status RPC's CASE); this UI renders it.
// System of record: common-docs/systems/platform/app-config/attestation/FEATURE.md

import type { Database } from "@/types/database.types";

type PlatformFunctions = Database["platform"]["Functions"];

export type AttestationStatusRow =
  PlatformFunctions["config_attestation_status"]["Returns"][number];

export type AttestationReleaseRow =
  PlatformFunctions["config_attestation_releases"]["Returns"][number];

export type AttestationStatus = "green" | "amber" | "red" | "info";

/** The application row fields the Attestation tab needs (public.app_config). */
export interface AttestationApplication {
  app: string;
  key_propagation: Record<string, string>;
  owned_knob_features: string[];
  updated_at: string;
}

/** The manifest's build-fixed bootstrap: shown as information, never coloured. */
export interface ManifestBootstrap {
  database_url?: string;
  database_realtime_url?: string;
  publishable_key_prefix?: string;
  source?: string;
}

/** One attested manifest (platform.config_manifest), as the tab reads it. */
export interface AttestationManifest {
  app: string;
  app_version: string;
  build_sha: string;
  attested_at: string;
  key_count: number;
  bootstrap: ManifestBootstrap | null;
  gate_run: { screens?: string[]; keys_read?: number; run_at?: string } | null;
}

export function asStatus(value: string | null): AttestationStatus {
  return value === "green" || value === "amber" || value === "red" ? value : "info";
}

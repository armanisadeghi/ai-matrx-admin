// /administration/applications/attestation — config attestation: for one
// application build, is every stored config key declared by the code and read by
// installs? Colours come from platform.config_attestation_status (platform-admin
// SECURITY DEFINER door); this page renders them.
// Cross-repo system-of-record: common-docs/systems/platform/app-config/attestation/FEATURE.md

import { createClient } from "@/utils/supabase/server";
import { AttestationClient } from "@/features/admin/applications/attestation/components/AttestationClient";
import {
  fetchAttestationManifest,
  fetchAttestationReleases,
  fetchAttestationStatus,
} from "@/features/admin/applications/attestation/rpc";

/** The application this tab opens on when the link names none. */
const ATTESTATION_DEFAULT_APPLICATION = "matrx-desktop";

interface ApplicationsAttestationPageProps {
  searchParams: Promise<{ app?: string | string[]; build?: string | string[] }>;
}

export default async function ApplicationsAttestationPage({
  searchParams,
}: ApplicationsAttestationPageProps) {
  const supabase = await createClient();
  const query = await searchParams;

  const { data: appRows, error: appError } = await supabase
    .from("app_config")
    .select("app")
    .is("deleted_at", null)
    .order("app");
  if (appError) {
    throw new Error(`Applications failed to load: ${appError.message}`);
  }
  const applications = (appRows ?? []).map((r) => r.app);
  const requested = typeof query.app === "string" ? query.app : undefined;
  const app =
    requested && applications.includes(requested)
      ? requested
      : applications.includes(ATTESTATION_DEFAULT_APPLICATION)
        ? ATTESTATION_DEFAULT_APPLICATION
        : (applications[0] ?? ATTESTATION_DEFAULT_APPLICATION);
  const buildSha =
    typeof query.build === "string" && /^[0-9a-f]{40}$/.test(query.build) ? query.build : null;

  let initialError: string | null = null;
  let initial: Awaited<ReturnType<typeof load>> = { rows: [], releases: [], manifest: null };
  async function load() {
    const [rows, releases, manifest] = await Promise.all([
      fetchAttestationStatus(supabase, app, buildSha),
      fetchAttestationReleases(supabase, app),
      fetchAttestationManifest(supabase, app, buildSha),
    ]);
    return { rows, releases, manifest };
  }
  try {
    initial = await load();
  } catch (e) {
    initialError = e instanceof Error ? e.message : String(e);
  }

  return (
    <AttestationClient
      key={`${app}:${buildSha ?? "latest"}`}
      applications={applications}
      app={app}
      buildSha={buildSha}
      initial={initial}
      initialError={initialError}
    />
  );
}

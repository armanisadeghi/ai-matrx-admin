// features/admin/applications/attestation/components/AttestationClient.tsx
//
// Applications › Attestation: for one application and one attested build, every
// config key it stores, declares or reads, coloured by platform.config_attestation_status.
// Header: health, release-run coverage, and the advisory release-mismatch flag
// (builds running that the release pipeline never attested). The bootstrap block
// shows what each build fixes at build time; it is information, never coloured.
"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { TriangleAlert } from "lucide-react";
import {
  Button,
  PropertyRow,
  Select,
  type SelectOption,
} from "@ai-matrx/design-system/controls";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  ADMIN_APPLICATIONS_SURFACE_NAME,
  createAdminApplicationsScope,
} from "@/features/surfaces/manifests/admin-applications.manifest";
import { createClient } from "@/utils/supabase/client";
import {
  fetchAttestationManifest,
  fetchAttestationReleases,
  fetchAttestationStatus,
} from "@/features/admin/applications/attestation/rpc";
import { AttestationTable } from "@/features/admin/applications/attestation/components/AttestationTable";
import {
  asStatus,
  type AttestationManifest,
  type AttestationReleaseRow,
  type AttestationStatusRow,
} from "@/features/admin/applications/attestation/types";

const LATEST = "__latest__";

interface AttestationData {
  rows: AttestationStatusRow[];
  releases: AttestationReleaseRow[];
  manifest: AttestationManifest | null;
}

interface AttestationClientProps {
  applications: string[];
  app: string;
  buildSha: string | null;
  initial: AttestationData;
  initialError: string | null;
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "danger" | "warning" | "success";
}) {
  const color =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "success"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Flag({ tone, children }: { tone: "danger" | "warning"; children: React.ReactNode }) {
  const cls =
    tone === "danger"
      ? "border-destructive/50 bg-destructive/10 text-destructive-ink"
      : "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${cls}`}>
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function AttestationClient({
  applications,
  app,
  buildSha,
  initial,
  initialError,
}: AttestationClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<AttestationData>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [showShared, setShowShared] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    try {
      const [rows, releases, manifest] = await Promise.all([
        fetchAttestationStatus(supabase, app, buildSha),
        fetchAttestationReleases(supabase, app),
        fetchAttestationManifest(supabase, app, buildSha),
      ]);
      setData({ rows, releases, manifest });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [app, buildSha]);

  const navigate = useCallback(
    (nextApp: string, nextBuild: string | null) => {
      const params = new URLSearchParams({ app: nextApp });
      if (nextBuild) params.set("build", nextBuild);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname],
  );

  const { main, shared, counts } = useMemo(() => {
    const main: AttestationStatusRow[] = [];
    const shared: AttestationStatusRow[] = [];
    const counts = { green: 0, amber: 0, red: 0 };
    for (const row of data.rows) {
      const s = asStatus(row.status);
      if (s === "info") {
        shared.push(row);
        continue;
      }
      main.push(row);
      counts[s] += 1;
    }
    return { main, shared, counts };
  }, [data.rows]);

  const scored = counts.green + counts.amber + counts.red;
  const health = scored ? Math.round((counts.green / scored) * 100) : null;
  const unattested = data.releases.filter((r) => !r.attested);
  const manifest = data.manifest;
  const keysRead = manifest?.gate_run?.keys_read ?? 0;

  const appOptions: SelectOption[] = applications.map((a) => ({ value: a, label: a }));
  const buildOptions: SelectOption[] = [
    { value: LATEST, label: "Latest attested build" },
    ...data.releases
      .filter((r) => r.attested && r.build_sha)
      .map((r) => ({
        value: r.build_sha as string,
        label: `${r.app_version} · ${(r.build_sha as string).slice(0, 8)}`,
        meta: r.attested_at ? format(new Date(r.attested_at), "MMM d") : undefined,
      })),
  ];

  return (
    <SurfaceRuntimeProvider
      surfaceName={ADMIN_APPLICATIONS_SURFACE_NAME}
      getScope={() =>
        createAdminApplicationsScope({
          active_tab: "attestation",
        })
      }
    >
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Application"
            value={app}
            options={appOptions}
            onValueChange={(v) => navigate(v, null)}
            size="sm"
          />
          <Select
            aria-label="Build"
            value={buildSha ?? LATEST}
            options={buildOptions}
            onValueChange={(v) => navigate(app, v === LATEST ? null : v)}
            size="sm"
          />
          <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}>
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <SummaryStat
            label="Health"
            value={health === null ? "—" : `${health}%`}
            tone={health === null ? undefined : health === 100 ? "success" : health >= 50 ? "warning" : "danger"}
          />
          <SummaryStat label="In use" value={counts.green} tone="success" />
          <SummaryStat label="Check" value={counts.amber} tone={counts.amber ? "warning" : undefined} />
          <SummaryStat label="Wrong" value={counts.red} tone={counts.red ? "danger" : undefined} />
          <SummaryStat
            label="Release run coverage"
            value={manifest ? `${keysRead} of ${manifest.key_count}` : "—"}
            tone={manifest && keysRead === 0 ? "danger" : undefined}
          />
        </div>

        {!manifest ? (
          <Flag tone="danger">
            No build of <code className="font-mono">{app}</code> is attested. Every stored key
            shows red until a release attests its manifest.
          </Flag>
        ) : keysRead === 0 ? (
          <Flag tone="danger">
            The release run for {manifest.app_version} read 0 keys.
          </Flag>
        ) : null}
        {unattested.length > 0 ? (
          <Flag tone="warning">
            Release mismatch (advisory): {unattested.length} running{" "}
            {unattested.length === 1 ? "build was" : "builds were"} never attested —{" "}
            {unattested
              .map((r) => `${r.app_version} · ${(r.build_sha ?? "").slice(0, 8)}`)
              .join(", ")}
            .
          </Flag>
        ) : null}
        {error ? <Flag tone="danger">{error}</Flag> : null}

        {manifest ? (
          <section className="grid gap-3 rounded-md border border-border bg-card p-3 sm:grid-cols-4">
            <PropertyRow label="Build" value={`${manifest.app_version} · ${manifest.build_sha.slice(0, 12)}`} mono />
            <PropertyRow
              label="Database (fixed per build)"
              value={manifest.bootstrap?.database_url}
              help="Set at build time; it is the address used to read this app's config."
              mono
            />
            <PropertyRow label="Realtime (fixed per build)" value={manifest.bootstrap?.database_realtime_url} mono />
            <PropertyRow label="Key prefix (fixed per build)" value={manifest.bootstrap?.publishable_key_prefix} mono />
          </section>
        ) : null}

        <div className="min-h-0 flex-1">
          <AttestationTable
            app={app}
            rows={main}
            tableId="application-attestation"
            isFetching={refreshing}
            readError={error}
            onRetry={() => void refresh()}
          />
        </div>

        {shared.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div>
              <Button variant="quiet" onClick={() => setShowShared((v) => !v)}>
                {showShared ? "Hide" : "Show"} shared keys not read by this app ({shared.length})
              </Button>
            </div>
            {showShared ? (
              <AttestationTable app={app} rows={shared} tableId="application-attestation-shared" />
            ) : null}
          </div>
        ) : null}
      </div>
    </SurfaceRuntimeProvider>
  );
}

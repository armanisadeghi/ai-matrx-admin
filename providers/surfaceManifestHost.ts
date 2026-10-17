// providers/surfaceManifestHost.ts
//
// The web's answer to chat's surface-manifest host capability (`surfaceDriftReport`,
// `surfaceSyncManifests`, `surfaceRemediateMapping`, `surfaceDeleteMirrorRow`). The manifests are
// this app's own code and the sync writes as the platform, so the work stays in this app's admin
// routes; the package asks the host instead of requesting a host-relative `/api` path itself
// (on Matrx 2 that was `file:///api/...`). Same requests and the same error words as before.

async function failure(res: Response, fallback: string): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(text || `${fallback} (${res.status})`);
}

export const surfaceManifestHost = {
  surfaceDriftReport: async (): Promise<unknown> => {
    const res = await fetch("/api/admin/surfaces/drift-report", { method: "GET", cache: "no-store" });
    if (!res.ok) return failure(res, "Drift report failed");
    return ((await res.json()) as { report: unknown }).report;
  },
  surfaceSyncManifests: async (opts: unknown = {}): Promise<unknown> => {
    const res = await fetch("/api/admin/surfaces/sync-manifests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok) return failure(res, "Sync manifests failed");
    return ((await res.json()) as { result: unknown }).result;
  },
  surfaceRemediateMapping: async (args: unknown): Promise<unknown> => {
    const res = await fetch("/api/admin/surfaces/remediate-mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) return failure(res, "Remediate failed");
    return ((await res.json()) as { result: unknown }).result;
  },
  // Parses the `{error}` envelope: the caller must READ the message to tell the recency
  // refusal (which a human may confirm past) apart from a real failure.
  surfaceDeleteMirrorRow: async (args: unknown): Promise<unknown> => {
    const res = await fetch("/api/admin/surfaces/delete-mirror-row", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || `Delete failed (${res.status})`);
    }
    return ((await res.json()) as { result: unknown }).result;
  },
};

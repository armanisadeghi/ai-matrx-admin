// features/admin/applications/catalogs/artifact-probe.ts
//
// Activation artifact probe (shared by both activation confirms). Asks the one discovery engine
//   POST {base}/ai-catalog/discover/probe  { link }
// (aidream/services/ai_catalog/local_models/direct.py probe_link — server-side HEAD / one-byte Range,
// immune to browser CORS, every redirect re-checked, no writes). Authenticated with the user's
// Supabase JWT via `postJsonAsUser`. When the server is unreachable or does not have the route yet,
// it falls back to the browser HEAD probe with its honest CORS labeling.

import { postJsonAsUser } from "@/lib/api/post-json-as-user";
import { BackendApiError } from "@ai-matrx/api";
import { probeUrl } from "@/features/admin/shared/UrlProbeField";
import { formatFileSize } from "@ai-matrx/kit/format";

export type ArtifactProbeResult =
  | { status: "ok"; detail: string }
  | { status: "fail"; detail: string }
  | { status: "cors" };

export const ARTIFACT_PROBE_PATH = "/ai-catalog/discover/probe";

function refusalWords(err: BackendApiError): string {
  const detail = (err as unknown as { detail?: unknown }).detail;
  if (detail && typeof detail === "object" && typeof (detail as { message?: unknown }).message === "string") {
    return (detail as { message: string }).message;
  }
  return err.userMessage || String(detail ?? err.message);
}

export async function probeArtifactUrl(params: {
  baseUrl: string | null;
  accessToken: string | null;
  organizationId: string | null;
  url: string;
  signal?: AbortSignal;
}): Promise<ArtifactProbeResult> {
  if (params.baseUrl && params.accessToken && params.organizationId) {
    try {
      const data = (await postJsonAsUser({
        baseUrl: params.baseUrl,
        accessToken: params.accessToken,
        organizationId: params.organizationId,
        path: ARTIFACT_PROBE_PATH,
        body: { link: params.url },
        signal: params.signal,
      })) as { size_bytes?: unknown } | null;
      const size = typeof data?.size_bytes === "number" ? data.size_bytes : null;
      return {
        status: "ok",
        detail: `verified by the server${size !== null ? ` (${formatFileSize(size)})` : ""}`,
      };
    } catch (err) {
      if (err instanceof BackendApiError && err.status !== 404) {
        return { status: "fail", detail: `server check: ${refusalWords(err)}` };
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        return { status: "fail", detail: "Check cancelled." };
      }
      // 404 (route not on this server yet) or unreachable → the browser HEAD probe below.
    }
  }
  const result = await probeUrl(params.url, "head");
  if (result.status === "ok") {
    return { status: "ok", detail: `HEAD returned ${result.httpStatus} (browser probe)` };
  }
  if (result.status === "fail") {
    return { status: "fail", detail: result.detail };
  }
  return { status: "cors" };
}

/** Client for aidream `POST /admin/surface-evidence/runs` and `/receives` (admin). */
import { BackendApiError } from "@ai-matrx/api";
import { postJson } from "@/lib/python-client";
import { isRouteNotDeployed } from "@/features/surfaces/utils/receives-view";

import type { SurfaceEvidence, SurfaceEvidenceQuery, SurfaceReceives, SurfaceReceivesQuery } from "./types";

export const SURFACE_EVIDENCE_RUNS_PATH = "/admin/surface-evidence/runs";
export const SURFACE_RECEIVES_PATH = "/admin/surface-evidence/receives";

export async function fetchSurfaceEvidence(query: SurfaceEvidenceQuery): Promise<SurfaceEvidence> {
  const { data } = await postJson<SurfaceEvidence, SurfaceEvidenceQuery>(SURFACE_EVIDENCE_RUNS_PATH, {
    ...query,
    include_runs: true,
  });
  if (!data || !Array.isArray(data.runs)) throw new Error("The server answered without runs.");
  return data;
}

export type SurfaceReceivesResult =
  | { kind: "ok"; data: SurfaceReceives }
  /** The route is not on the server yet (unknown-route 404). */
  | { kind: "not_deployed" }
  /** The server's own refusal sentence (no such turn, no receipt, a bad request). */
  | { kind: "refused"; message: string };

/**
 * The exact context blocks an agent receives from a surface. 404 (route not deployed) and the
 * server's refusals (404/422 with a reason) come back as values, never thrown: the section
 * shows them in place. Anything else throws through the client's error capture.
 */
export async function fetchSurfaceReceives(query: SurfaceReceivesQuery): Promise<SurfaceReceivesResult> {
  try {
    const { data } = await postJson<SurfaceReceives, SurfaceReceivesQuery>(SURFACE_RECEIVES_PATH, query, {
      expectedErrorStatuses: [400, 404, 422],
    });
    if (!data || !Array.isArray(data.blocks)) throw new Error("The server answered without blocks.");
    return { kind: "ok", data };
  } catch (err) {
    if (err instanceof BackendApiError && err.status !== null) {
      if (isRouteNotDeployed(err.status, err.detail)) return { kind: "not_deployed" };
      if ([400, 404, 422].includes(err.status)) {
        return { kind: "refused", message: err.detail || err.userMessage || `HTTP ${err.status}` };
      }
    }
    throw err;
  }
}

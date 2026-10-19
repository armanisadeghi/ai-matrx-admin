/** Client for aidream `POST /admin/surface-evidence/runs` (admin). */
import { postJson } from "@/lib/python-client";

import type { SurfaceEvidence, SurfaceEvidenceQuery } from "./types";

export const SURFACE_EVIDENCE_RUNS_PATH = "/admin/surface-evidence/runs";

export async function fetchSurfaceEvidence(query: SurfaceEvidenceQuery): Promise<SurfaceEvidence> {
  const { data } = await postJson<SurfaceEvidence, SurfaceEvidenceQuery>(SURFACE_EVIDENCE_RUNS_PATH, {
    ...query,
    include_runs: true,
  });
  if (!data || !Array.isArray(data.runs)) throw new Error("The server answered without runs.");
  return data;
}

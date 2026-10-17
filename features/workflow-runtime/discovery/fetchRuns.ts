/**
 * The runs lists' one read: `GET /runs` (every run the caller can see, in every organization)
 * or `GET /workflows/{id}/runs` (one workflow's history). Shared by `useRunsList` and the
 * board's agent finder, so the picker and the agent read the same list.
 */

import { callApi } from "@/lib/api/call-api";
import type { AppDispatch } from "@/lib/redux/store";

import { parseRunListRows, type RunListRow } from "./runs";

/** One page, bounded. The server caps `/runs` at 500; these lists are a screen, not an export. */
export const RUNS_PAGE_SIZE = 100;

/** The server-decided Flagged view: only runs that raised review flags, most flags first. */
export interface RunsFlaggedQuery {
  flaggedOnly: boolean;
}

export async function fetchRuns(
  dispatch: AppDispatch,
  definitionId?: string,
  organizationId?: string | null,
  query: RunsFlaggedQuery = { flaggedOnly: false },
): Promise<{ ok: true; rows: RunListRow[] } | { ok: false; message: string }> {
  // Decided in the server's query (not among the loaded rows), so an old flagged run is found.
  const flaggedParams: Record<string, string | boolean> = query.flaggedOnly ? { flagged: true, sort: "flagged" } : {};
  const result = definitionId
    ? await dispatch(
        callApi({
          path: "/workflows/{definition_id}/runs",
          method: "GET",
          pathParams: { definition_id: definitionId },
          queryParams: { limit: RUNS_PAGE_SIZE, ...flaggedParams },
        }),
      )
    : await dispatch(
        callApi({
          path: "/runs",
          method: "GET",
          // Child runs are listed too: a fan-out item that failed is a run somebody has to be
          // able to find, and hiding it here would make this list quietly incomplete.
          queryParams: {
            limit: RUNS_PAGE_SIZE,
            include_children: true,
            ...flaggedParams,
            // The on-page organization filter, decided by the server (not among the loaded
            // rows). Absent = every organization the person can see.
            ...(organizationId ? { organization_id: organizationId } : {}),
          },
        }),
      );
  if (result.error)
    return {
      ok: false,
      message: result.error.message || "Could not load runs.",
    };
  return { ok: true, rows: parseRunListRows(result.data) };
}

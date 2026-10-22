// lib/workflows/system-runs.ts
//
// THE shared door to aidream's system-workflow lane
// (`aidream/services/runtime/system_workflows.py`): an allow-listed workflow
// the server runs on the person's behalf, about one subject (`<kind>:<id>`;
// a workflow may accept several kinds). Used by the education kit outline and
// build (`education_kit_outline`, `education_kit_build`), Smart Add, and the
// Agent Studio build (`agent_build`). Moved here from
// `features/education/kits/systemRuns.ts` (Agent Studio rebuild, lane 2C).
//
// - start: `POST /workflows/system/{key}/runs`; the server answers an ACTIVE
//   run for the same subject with `mode: "duplicate"` instead of a second one,
//   so a double press, a reload or a second tab never pays twice;
// - lookup: `GET …/runs?subject=` — the caller's latest run for the subject,
//   so any page (or another device) reattaches to it.

import type { paths } from "@ai-matrx/api/types";
import { callApi } from "@/lib/api/call-api";
import { describeDoorRefusal } from "@/lib/api/door-refusal";
import type { AppDispatch } from "@/lib/redux/store";
import { selectOrganizationIds } from "@/features/scopes/redux/selectors/tree";

/**
 * 🚨 LOCAL PATH LITERAL — the generated api-types do not carry the system lane
 * yet (aidream half shipped 2026-10-09); the `as keyof paths` cast is the repo
 * precedent (`features/mandates/overrides.ts`) and becomes `satisfies` once
 * `pnpm sync-types` picks the route up.
 */
const SYSTEM_RUNS_PATH = "/workflows/system/{key}/runs" as keyof paths;

export interface SystemRun {
  runId: string;
  status: string;
  active: boolean;
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseRun(value: unknown): SystemRun | null {
  const r = obj(value);
  return typeof r.run_id === "string" && r.run_id
    ? { runId: r.run_id, status: String(r.status ?? ""), active: r.active !== false }
    : null;
}

/** The subject's organization when the caller belongs to it, else undefined (the active organization applies); unknown membership keeps it. */
export function lookupOrganizationScope(
  organizationId: string | undefined,
  memberOrganizationIds: readonly string[],
): string | undefined {
  if (!organizationId) return undefined;
  // The organization list not loaded yet is "unknown", not "none": keep naming it.
  if (memberOrganizationIds.length === 0) return organizationId;
  return memberOrganizationIds.includes(organizationId) ? organizationId : undefined;
}

/** The latest (active or finished) run of `key` about `subject`, or null. */
export async function lookupSystemRun(
  dispatch: AppDispatch,
  key: string,
  subject: string,
  organizationId: string | undefined,
  failure: string,
): Promise<SystemRun | null> {
  // The run lives in the SUBJECT's organization's copy of the workflow, so the
  // lookup names it (a GET otherwise goes out with no organization and the
  // server cannot tell which copy to read) - but only an organization the
  // caller belongs to. The server refuses a request naming any other with
  // `organization_forbidden`, and the lookup only ever answers the caller's OWN
  // runs, so a viewer outside the subject's organization (a public brand, a
  // platform admin) asks under their own active organization and gets "no run".
  const memberOrgIds = dispatch((_dispatch, getState) => selectOrganizationIds(getState()));
  const scopeOrganizationId = lookupOrganizationScope(organizationId, memberOrgIds);
  const result = await dispatch(
    callApi({
      path: SYSTEM_RUNS_PATH,
      method: "GET",
      pathParams: { key } as never,
      queryParams: { subject },
      ...(scopeOrganizationId ? { scopeOverrides: { organization_id: scopeOrganizationId } } : {}),
    }),
  );
  if (result.error) throw new Error(result.error.message || failure);
  return parseRun(obj(result.data).run);
}

/**
 * A start refused only because the server that took it is older than the workflow (a rolling
 * deploy: some servers lack a new step). The server says so with 503 `node_types_unavailable_here`;
 * an older server says 422 "Unknown node type". Either way a retry lands on a newer server (MKT-094).
 */
export function isServerUpdatingRefusal(error: { status?: number; serverDetail?: unknown; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const body = `${error.message ?? ""} ${(() => {
    try {
      return JSON.stringify(error.serverDetail ?? "");
    } catch {
      return "";
    }
  })()}`;
  if (error.status === 503 && /node_types_unavailable_here/.test(body)) return true;
  return error.status === 422 && /Unknown node type/i.test(body);
}

/** Waits between start retries while servers update (about 45 seconds in all). */
export const SERVER_UPDATING_RETRY_DELAYS_MS = [1500, 3000, 5000, 8000, 12000, 15000];

/** What the screen says when every retry still met an older server. */
export const SERVER_UPDATING_MESSAGE = "Our servers are updating, so this couldn't start. Try again in a minute.";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Start (or rejoin) the run of `key` about `subject`. */
export async function startSystemRun(
  dispatch: AppDispatch,
  key: string,
  input: {
    subject: string;
    organizationId: string;
    sourceFeature: string;
    inputs: Record<string, unknown>;
  },
  failure: string,
): Promise<{ runId: string; duplicate: boolean }> {
  const send = () =>
    dispatch(
      callApi({
        path: SYSTEM_RUNS_PATH,
        method: "POST",
        pathParams: { key } as never,
        scopeOverrides: { organization_id: input.organizationId },
        // A refusal from a server mid-update is retried below, never filed as an error.
        expectedErrorStatuses: [503],
        body: {
          subject: input.subject,
          source_feature: input.sourceFeature,
          // "detached": the server runs it in-process, beside this request; it
          // finishes whether or not any page is still open.
          mode: "detached",
          inputs: input.inputs,
        } as never,
      }),
    );
  let result = await send();
  // A rolling deploy: the server that took the start lacks a step the workflow now has. Nothing was
  // created, so the same start goes again and lands on an updated server.
  for (const delay of SERVER_UPDATING_RETRY_DELAYS_MS) {
    if (!isServerUpdatingRefusal(result.error)) break;
    await sleep(delay);
    result = await send();
  }
  if (isServerUpdatingRefusal(result.error)) throw new Error(SERVER_UPDATING_MESSAGE);
  // A refusal says the server's own reason (its words, not "Invalid request. Please check your input"),
  // or the caller's plain sentence when the server said nothing.
  if (result.error) throw new Error(describeDoorRefusal(result.error, { fallback: failure }).message);
  const data = obj(result.data);
  const runId = typeof data.run_id === "string" ? data.run_id : "";
  if (!runId) throw new Error(failure);
  return { runId, duplicate: data.mode === "duplicate" };
}

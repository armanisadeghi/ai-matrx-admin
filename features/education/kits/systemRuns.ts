// features/education/kits/systemRuns.ts
//
// THE study kit's door to aidream's system-workflow lane
// (`aidream/services/runtime/system_workflows.py`): a code-allow-listed
// workflow the server runs on the learner's behalf, about one subject
// (`kit:<id>`). Two workflows use it today — the kit OUTLINE
// (`education_kit_outline`, `outline/outlineService.ts`) and the kit BUILD
// (`education_kit_build`, `onboard/kitBuildService.ts`, every output made and
// saved by the server).
//
// - start: `POST /workflows/system/{key}/runs`; the server answers an ACTIVE
//   run for the same subject with `mode: "duplicate"` instead of a second one,
//   so a double press, a reload or a second tab never pays twice;
// - lookup: `GET …/runs?subject=` — the caller's latest run for the subject,
//   so any page (or another device) reattaches to it.

import type { paths } from "@ai-matrx/agents/generated/api-types";
import { callApi } from "@/lib/api/call-api";
import type { AppDispatch } from "@/lib/redux/store";

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
  // server cannot tell which copy to read).
  const result = await dispatch(
    callApi({
      path: SYSTEM_RUNS_PATH,
      method: "GET",
      pathParams: { key } as never,
      queryParams: { subject },
      ...(organizationId ? { scopeOverrides: { organization_id: organizationId } } : {}),
    }),
  );
  if (result.error) throw new Error(result.error.message || failure);
  return parseRun(obj(result.data).run);
}

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
  const result = await dispatch(
    callApi({
      path: SYSTEM_RUNS_PATH,
      method: "POST",
      pathParams: { key } as never,
      scopeOverrides: { organization_id: input.organizationId },
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
  if (result.error) throw new Error(result.error.message || failure);
  const data = obj(result.data);
  const runId = typeof data.run_id === "string" ? data.run_id : "";
  if (!runId) throw new Error(failure);
  return { runId, duplicate: data.mode === "duplicate" };
}

/**
 * The `agent_build` workflow's door for the build view: start, read, list, answer.
 *
 * - start: the shared system-run lane (`lib/workflows/system-runs.ts`), subject `build:<new uuid>`;
 * - read: the run row straight from `workflow.run` (React → Supabase; the row is the truth);
 * - list: every `agent_build` run the caller can see, read to its declared total;
 * - answer: `POST /runs/{id}/resume` for the workflow offer and "Keep it anyway".
 *
 * The live feed (`GET /runs/{id}/events/stream`) is followed by `useBuildDetail` through
 * `followWorkflowRunStream`; the list's change hints come from `GET /runs/stream`
 * (`useBuildRunAnnouncements`). Nothing here polls.
 */

import { readAllRows } from "@ai-matrx/data/db";
import { callApi } from "@/lib/api/call-api";
import { startSystemRun } from "@/lib/workflows/system-runs";
import { runScope } from "@/features/workflow-runtime/runOrganization";
import type { AppDispatch } from "@/lib/redux/store";
import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";
import {
  BUILD_RUN_COLUMNS,
  BUILD_WORKFLOW_KEY,
  gateAnswerBody,
  type BuildGate,
  type BuildRunRow,
} from "./build-run";

const supabase = () => createClient();

/** The tag that marks the `agent_build` platform workflow's definition rows. */
export const BUILD_WORKFLOW_TAG = `platform:${BUILD_WORKFLOW_KEY}`;

/** The workflow's input, from the door's spec. The examples ride beside the spec, not inside it. */
export function buildRunInputs(input: {
  sourceRef: string;
  spec: Record<string, unknown>;
  mandateKey?: string | null;
  unproven?: boolean;
  door?: string | null;
}): Record<string, unknown> {
  const { sample_inputs, ...spec } = input.spec;
  let examples: unknown[] = [];
  if (typeof sample_inputs === "string" && sample_inputs.trim()) {
    try {
      const parsed: unknown = JSON.parse(sample_inputs);
      examples = Array.isArray(parsed) ? parsed : [];
    } catch {
      examples = [];
    }
  } else if (Array.isArray(sample_inputs)) {
    examples = sample_inputs;
  }
  return {
    source_kind: "build",
    source_ref: input.sourceRef,
    request_text: typeof spec.purpose === "string" ? spec.purpose : "",
    door: input.door ?? "",
    mode: "build",
    mandate_key: input.mandateKey ?? null,
    agent_id: null,
    unproven_requested: input.unproven === true,
    examples,
    spec,
    cost_parent_request_id: null,
  };
}

/**
 * The registered source feature a build run is stamped with. The door is not a source feature
 * (the server refuses `studio`, `generate`, … as unregistered); it rides in the run's inputs.
 */
export function buildSourceFeature(door: string | null | undefined): "agent-studio" | "agent-factory" {
  return door === "studio" ? "agent-studio" : "agent-factory";
}

/** Start one build run. Its id is the build id the view follows. */
export async function startBuildRun(
  dispatch: AppDispatch,
  input: {
    spec: Record<string, unknown>;
    mandateKey?: string | null;
    unproven?: boolean;
    door?: string | null;
    organizationId: string;
  },
): Promise<string> {
  const sourceRef = crypto.randomUUID();
  const { runId } = await startSystemRun(
    dispatch,
    BUILD_WORKFLOW_KEY,
    {
      subject: `build:${sourceRef}`,
      organizationId: input.organizationId,
      sourceFeature: buildSourceFeature(input.door),
      inputs: buildRunInputs({ ...input, sourceRef }),
    },
    "The agent build did not start",
  );
  return runId;
}

/** A build run's row, or null when no `agent_build` run has this id. */
export async function readBuildRun(runId: string, signal?: AbortSignal): Promise<BuildRunRow | null> {
  let query = supabase().schema("workflow").from("run").select(BUILD_RUN_COLUMNS).eq("id", runId);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw operationFailed("load the agent build", error);
  if (!data) return null;
  const row = data as unknown as BuildRunRow;
  // Only an agent_build run has these inputs; any other workflow's run is not a build.
  const input = row.input ?? {};
  return typeof input.source_kind === "string" && "spec" in input ? row : null;
}

/** Every `agent_build` run the caller can read, newest first. */
export async function listBuildRuns(): Promise<BuildRunRow[]> {
  // archived-items-law-exempt: lineage lookup of build-workflow ids — the list is of runs, and runs of an archived definition still belong in it
  const definitions = await readAllRows<{ id: string }>(
    ({ from, to }) =>
      supabase()
        .schema("workflow")
        .from("definition")
        .select("id", { count: "exact" })
        .contains("tags", [BUILD_WORKFLOW_TAG])
        .order("id", { ascending: true })
        .range(from, to),
    { label: "workflow.definition (agent_build)" },
  );
  if (definitions.length === 0) return [];
  const ids = definitions.map((d) => d.id);
  return readAllRows<BuildRunRow>(
    ({ from, to }) =>
      supabase()
        .schema("workflow")
        .from("run")
        .select(BUILD_RUN_COLUMNS, { count: "exact" })
        .in("definition_id", ids)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to) as never,
    { label: "workflow.run (agent_build)" },
  );
}

/** Answer an open gate (the workflow offer, or "Keep it anyway"). */
export async function answerBuildGate(dispatch: AppDispatch, gate: BuildGate, value: string): Promise<void> {
  // The run's own organization: answering a run never asks for a workspace.
  const scope = await runScope(gate.runId);
  const result = await dispatch(
    callApi({
      path: "/runs/{run_id}/resume",
      method: "POST",
      pathParams: { run_id: gate.runId },
      ...scope,
      body: gateAnswerBody(gate, value) as never,
    }),
  );
  if (result.error) throw new Error(result.error.message || "The answer did not go through");
}

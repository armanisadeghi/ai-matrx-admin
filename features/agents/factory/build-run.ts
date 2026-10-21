/**
 * An `agent_build` workflow run read as a build.
 *
 * The build view was written for the old pipeline's checkpoint (`FactoryBuildState`). A workflow
 * run is the same build on a different engine: its row holds the inputs, the per-node outputs and
 * the status, and its event feed says which node is running. This module turns (row + node log)
 * into the SAME `FactoryBuildDetail`, so one view draws both id shapes (D7) and a new run needs no
 * second renderer.
 *
 * Pure: no network, no store. The row and the events are read by `build-run-service.ts` and
 * `useBuildDetail.ts`.
 */

import { plainBuildState } from "./plain-stop-reason";
import type {
  FactoryBuildDetail,
  FactoryBuildState,
  FactoryJudgmentStep,
  FactoryStepName,
  FactoryStepRecord,
} from "./types";

export const BUILD_WORKFLOW_KEY = "agent_build";

/** The columns of `workflow.run` the build view reads. */
export interface BuildRunRow {
  id: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  interrupt_payload: Record<string, unknown> | null;
  last_checkpoint_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export const BUILD_RUN_COLUMNS =
  "id, status, input, output, error, interrupt_payload, last_checkpoint_id, created_at, started_at, completed_at";

/** One node's lifecycle event, kept from the run's event feed (only the nodes a step maps to). */
export interface NodeLogEntry {
  nodeId: string;
  kind: "started" | "completed" | "failed" | "skipped";
  at: string | null;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/* ------------------------------------------------------------------ node → step */

/** The four writers: node id → the judgment step it answers. */
export const WRITER_STEP: Readonly<Record<string, FactoryJudgmentStep>> = {
  write_contract: "contract",
  write_goal: "goal",
  write_tool_choice: "tool_choice",
  write_instructions: "instructions",
  write_judge: "proof_review",
};

/** The step a node belongs to, by its id (`jv_goal`, `check_tools`, `launch_run` …); null for plumbing. */
export function stepOfNode(nodeId: string): FactoryStepName | null {
  if (nodeId === "intake") return "intake";
  if (/(^|_)contract$/.test(nodeId)) return "contract";
  if (/(^|_)goal$/.test(nodeId)) return "goal";
  if (/(^|_)(tools|tool_choice)$/.test(nodeId) || nodeId === "tools_search") return "tool_choice";
  if (/(^|_)instructions$/.test(nodeId)) return "instructions";
  if (/^(model_|save_model|approval_gate)/.test(nodeId) || nodeId === "gate_model") return "model";
  if (nodeId === "apply" || nodeId === "keep" || nodeId === "keep_anyway") return "save";
  if (nodeId === "launch_run" || nodeId === "await_run" || nodeId === "proof_ctx") return "proof";
  if (/judge/.test(nodeId)) return "proof_review";
  return null;
}

/** Nodes worth keeping in the log: writers, plus the first and last node of the other steps. */
export function isLoggedNode(nodeId: string): boolean {
  return nodeId in WRITER_STEP || ["intake", "apply", "launch_run", "await_run", "keep", "keep_anyway"].includes(nodeId);
}

/** Nodes whose completion means the row has new outputs worth re-reading. */
export function changesRowOutputs(nodeId: string): boolean {
  return isLoggedNode(nodeId) || nodeId === "decide";
}

/* ------------------------------------------------------------------ status */

/** A run row's status as the spine statuses the view already understands. */
export function spineStatusOfRun(status: string): string {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  // `errored` parks the run for a retry on the server; to the person it is a stopped build.
  if (status === "failed" || status === "errored") return "failed";
  return "running";
}

/** A run that waits on a person (the offer, or "Keep it anyway"). */
export function runIsWaiting(status: string): boolean {
  return status === "interrupted" || status === "awaiting_input";
}

/* ------------------------------------------------------------------ the gate cards */

export type BuildGateKind = "offer" | "keep";

export interface BuildGate {
  kind: BuildGateKind;
  runId: string;
  checkpointId: string;
  /** The answer key the resume value is filed under (`fit` | `keep`). */
  key: string;
  title: string;
  prompt: string;
  options: { value: string; label: string }[];
  /** The answer the run takes when nobody answers (`default_answer`). */
  defaultValue: string | null;
  /** When an unanswered offer settles itself. */
  deadlineAt: string | null;
}

/** The open gate of a waiting run, or null. Anything but the offer and keep-anyway gates is not ours. */
export function gateOfRun(row: Pick<BuildRunRow, "id" | "status" | "interrupt_payload" | "last_checkpoint_id">): BuildGate | null {
  if (!runIsWaiting(row.status)) return null;
  const p = rec(row.interrupt_payload);
  const decision = rec(p.decision);
  const items = Array.isArray(decision.items) ? decision.items : [];
  const item = rec(items[0]);
  const key = str(item.key);
  const kind: BuildGateKind | null = key === "fit" ? "offer" : key === "keep" ? "keep" : null;
  const checkpointId = str(p.checkpoint_id) ?? row.last_checkpoint_id;
  if (!kind || !key || !checkpointId) return null;
  const options = (Array.isArray(item.options) ? item.options : [])
    .map((o) => ({ value: str(rec(o).value) ?? "", label: str(rec(o).label) ?? "" }))
    .filter((o) => o.value && o.label);
  if (options.length === 0) return null;
  return {
    kind,
    runId: row.id,
    checkpointId,
    key,
    title: str(p.title) ?? "",
    prompt: str(p.prompt) ?? "",
    options,
    defaultValue: str(p.default_answer),
    deadlineAt: str(rec(p.escalation).deadline_at),
  };
}

/** The `POST /runs/{id}/resume` body that answers a gate (`schema_hint`: answer.answers.<key>.{value,verdict}). */
export function gateAnswerBody(gate: BuildGate, value: string) {
  return {
    checkpoint_id: gate.checkpointId,
    resume_value: { answer: { answers: { [gate.key]: { value, verdict: "pick_one" } } } },
    mode: "queued" as const,
  };
}

/* ------------------------------------------------------------------ the detail */

/** Output nodes that carry the build's final state, most final first. */
const FINAL_NODES = ["done_kept", "done", "end_stopped", "end_workflow", "end_needs_model", "decide"];

function finalState(output: Record<string, unknown>, over: boolean): Record<string, unknown> {
  for (const id of FINAL_NODES) {
    const state = rec(output[id]);
    if (state.outcome && (over || id !== "decide")) return state;
  }
  return rec(output.decide);
}

function stepRecords(output: Record<string, unknown>, log: NodeLogEntry[], over: boolean): FactoryStepRecord[] {
  const records: FactoryStepRecord[] = [];
  const attempts: Record<string, number> = {};
  const open: Record<string, FactoryStepRecord> = {};
  for (const entry of log) {
    const step = WRITER_STEP[entry.nodeId];
    if (!step || step === "proof_review") continue;
    if (entry.kind === "started") {
      attempts[entry.nodeId] = (attempts[entry.nodeId] ?? 0) + 1;
      const next: FactoryStepRecord = {
        step,
        attempt: attempts[entry.nodeId],
        status: "running",
        started_at: entry.at ?? undefined,
        ended_at: null,
      };
      open[entry.nodeId] = next;
      records.push(next);
    } else if (open[entry.nodeId]) {
      const r = open[entry.nodeId];
      r.status = entry.kind === "completed" ? "done" : entry.kind === "failed" ? "failed" : "skipped";
      r.ended_at = entry.at;
      delete open[entry.nodeId];
    }
  }
  // A run read before its events arrive (or a feed that was never followed): the output says what ran.
  if (records.length === 0) {
    for (const [nodeId, step] of Object.entries(WRITER_STEP)) {
      if (step === "proof_review" || !output[nodeId]) continue;
      records.push({ step, attempt: 1, status: "done" });
    }
  }
  // The row keeps each writer's LAST answer only: it belongs to that step's last record.
  for (const [nodeId, step] of Object.entries(WRITER_STEP)) {
    if (step === "proof_review" || output[nodeId] === undefined) continue;
    const last = [...records].reverse().find((r) => r.step === step);
    if (last) last.answer = output[nodeId];
  }
  // A run that ended with a writer still "running" (a dead node) did not finish it.
  if (over) for (const r of records) if (r.status === "running") r.status = "failed";
  return records;
}

function currentStepOf(log: NodeLogEntry[], output: Record<string, unknown>): FactoryStepName {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const step = stepOfNode(log[i].nodeId);
    if (step) return step;
  }
  if (output.apply) return "save";
  if (output.write_instructions) return "instructions";
  if (output.write_tool_choice) return "tool_choice";
  if (output.write_goal) return "goal";
  if (output.write_contract) return "contract";
  return "intake";
}

/** The `FactoryBuildDetail` a workflow run draws as. */
export function buildDetailFromRun(row: BuildRunRow, log: NodeLogEntry[] = []): FactoryBuildDetail {
  const input = rec(row.input);
  const output = rec(row.output);
  const spineStatus = spineStatusOfRun(row.status);
  const over = spineStatus !== "running";
  const final = finalState(output, over);
  const spec = rec(input.spec);
  const mandateKey = str(input.mandate_key);
  const history = stepRecords(output, log, over);
  const savedAgent =
    str(final.agent_id) ?? str(final.saved_agent_id) ?? str(rec(output.apply).agent_id) ?? str(rec(output.decide).saved_agent_id);
  const err = rec(row.error);
  const outcome = str(final.outcome) ?? (over && spineStatus !== "completed" ? "failed" : null);

  const state: FactoryBuildState = {
    build_id: row.id,
    request: {
      unproven: input.unproven_requested === true,
      door: str(input.door),
      spec: { ...spec, ...(str(spec.display_name) ? {} : { display_name: str(spec.name) }) } as FactoryBuildState["request"] extends infer R
        ? R extends { spec?: infer S }
          ? NonNullable<S>
          : never
        : never,
      mandate_key: mandateKey,
      idempotency_key: null,
    },
    status: over ? (spineStatus === "completed" ? "completed" : "failed") : "running",
    current_step: currentStepOf(log, output),
    history,
    steps: Object.fromEntries(
      history.map((h) => [h.step, h] as const),
    ) as FactoryBuildState["steps"],
    facts: output.jv_contract || output.intake ? { greenfield: !mandateKey } : null,
    agent_id: savedAgent,
    send_backs: typeof final.send_backs === "number" ? final.send_backs : 0,
    outcome,
    proof: [],
  };
  // The engine's own sentence for a run that stopped on an error is already plain ("Save the agent was
  // given a value it couldn't use."); it rides as the reason and the developer text stays beside it.
  const message = str(err.message);
  if (over && spineStatus !== "completed" && !str(final.outcome) && message) {
    state.error = message;
    state.error_detail = str(err.technical) ?? "";
  }
  return {
    id: row.id,
    spineStatus,
    createdAt: row.created_at,
    startedAt: row.started_at,
    endedAt: row.completed_at,
    checkpointAt: row.completed_at,
    state: plainBuildState(state),
  };
}

/* ------------------------------------------------------------------ list rows */

export interface BuildRunListItem {
  id: string;
  status: string;
  spineStatus: string;
  createdAt: string;
  name: string | null;
  door: string | null;
  outcome: string | null;
  agentId: string | null;
  sendBacks: number;
}

export function listItemFromRun(row: BuildRunRow): BuildRunListItem {
  const detail = buildDetailFromRun(row);
  const state = detail.state ?? {};
  return {
    id: row.id,
    status: row.status,
    spineStatus: detail.spineStatus,
    createdAt: row.created_at,
    name: (state.request?.spec?.display_name as string | undefined) ?? null,
    door: state.request?.door ?? null,
    outcome: state.outcome ?? null,
    agentId: state.agent_id ?? null,
    sendBacks: state.send_backs ?? 0,
  };
}

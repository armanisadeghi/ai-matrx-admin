/**
 * Builder panel — server data. Direct Supabase reads (RLS: platform admins read every row).
 *
 *  - `mandate.proposal` — PROPOSED mandate and workflow shapes for a surface. A proposal is
 *    data, never a mandate: no holder, not in the declared mandate set until it is built.
 *  - `mandate.definition` — the REAL mandates a surface publishes (by mandate key or by the
 *    provision point key they consume).
 * FEATURE: ./FEATURE.md.
 */
import { supabase } from "@/utils/supabase/client";
import type { Json } from "@/types/database.types";

export interface MandateProposal {
  id: string;
  surfaceKey: string;
  shapeType: "mandate" | "workflow";
  title: string;
  goal: string | null;
  proposedKey: string | null;
  inputs: Json;
  outputKind: string | null;
  outputSketch: Json | null;
  steps: Json;
  status: string;
  notes: string | null;
  updatedAt: string;
}

export async function fetchProposals(surfaceKey: string): Promise<MandateProposal[]> {
  const { data, error } = await supabase
    .schema("mandate")
    .from("proposal")
    .select("id, surface_key, shape_type, title, goal, proposed_key, inputs, output_kind, output_sketch, steps, status, notes, updated_at, sort_order")
    .eq("surface_key", surfaceKey)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .limit(200);
  if (error) throw new Error(`Proposals could not be read: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    surfaceKey: r.surface_key,
    shapeType: r.shape_type === "workflow" ? "workflow" : "mandate",
    title: r.title,
    goal: r.goal,
    proposedKey: r.proposed_key,
    inputs: r.inputs,
    outputKind: r.output_kind,
    outputSketch: r.output_sketch,
    steps: r.steps,
    status: r.status,
    notes: r.notes,
    updatedAt: r.updated_at,
  }));
}

export interface RealMandate {
  id: string;
  mandateKey: AnyMandateKey;
  label: string;
  goal: string | null;
  outputKind: string | null;
  provisionKey: string | null;
  isEnabled: boolean;
}

/** Mandates named by key, or consuming one of the given provision points. */
export async function fetchSurfaceMandates(mandateKeys: AnyMandateKey[], provisionKeys: string[]): Promise<RealMandate[]> {
  if (!mandateKeys.length && !provisionKeys.length) return [];
  const ors = [
    mandateKeys.length ? `mandate_key.in.(${mandateKeys.map((k) => `"${k}"`).join(",")})` : null,
    provisionKeys.length ? `provision_key.in.(${provisionKeys.map((k) => `"${k}"`).join(",")})` : null,
  ].filter(Boolean);
  const { data, error } = await supabase
    .schema("mandate")
    .from("definition")
    .select("id, mandate_key, label, goal, output_kind, provision_key, is_enabled")
    .or(ors.join(","))
    .is("deleted_at", null)
    .limit(200);
  if (error) throw new Error(`Mandates could not be read: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    mandateKey: storedMandateKey(r.mandate_key),
    label: r.label,
    goal: r.goal,
    outputKind: r.output_kind,
    provisionKey: r.provision_key,
    isEnabled: r.is_enabled,
  }));
}

// ── run truth: the rows the server stored for each run, untouched ─────────────────────────────

export interface RunRow {
  id: string;
  definitionId: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  input: Json;
}

export interface NodeOutcomeRow {
  id: string;
  runId: string;
  nodeId: string;
  step: number;
  attempt: number;
  itemIndex: number;
  completedAt: string;
  durationMs: number;
  input: Json | null;
  output: Json;
  error: Json | null;
}

export interface SnapshotRow {
  id: string;
  pointKey: string;
  pointLabel: string;
  runId: string | null;
  subjectId: string | null;
  createdAt: string;
  totalChars: number;
}

/** One node of the workflow definition a run used: its label, and what it waits for (`ready_when`). */
export interface DefinitionNode {
  id: string;
  label: string;
  icon: string | null;
  readyWhen: string[];
}

export interface DefinitionRow {
  id: string;
  name: string;
  nodes: DefinitionNode[];
}

export interface RunTruth {
  runs: RunRow[];
  outcomes: NodeOutcomeRow[];
  snapshots: SnapshotRow[];
  /** The definitions the runs used (node labels and `ready_when`, in graph order). */
  definitions: DefinitionRow[];
}

function definitionNodes(raw: Json): DefinitionNode[] {
  if (!Array.isArray(raw)) return [];
  const out: DefinitionNode[] = [];
  for (const n of raw) {
    if (!n || typeof n !== "object" || Array.isArray(n)) continue;
    const node = n as Record<string, Json>;
    const data = (node.data && typeof node.data === "object" && !Array.isArray(node.data) ? node.data : {}) as Record<string, Json>;
    out.push({
      id: String(node.id ?? ""),
      label: typeof data.label === "string" && data.label ? data.label : String(node.id ?? ""),
      icon: typeof data.icon === "string" ? data.icon : null,
      readyWhen: Array.isArray(data.ready_when) ? data.ready_when.filter((r): r is string => typeof r === "string") : [],
    });
  }
  return out;
}

/** `workflow.run` + `workflow.node_outcome` for these runs, and every `mandate.provision_snapshot`
 *  captured for them (by run id) or for the given subjects (a created record). */
export async function fetchRunTruth(runIds: string[], subjectIds: string[]): Promise<RunTruth> {
  if (!runIds.length && !subjectIds.length) return { runs: [], outcomes: [], snapshots: [], definitions: [] };
  const snapshotOr = [
    runIds.length ? `run_id.in.(${runIds.join(",")})` : null,
    subjectIds.length ? `subject_id.in.(${subjectIds.join(",")})` : null,
  ].filter(Boolean);
  const [runs, outcomes, snapshots] = await Promise.all([
    runIds.length
      ? supabase
          .schema("workflow")
          .from("run")
          .select("id, definition_id, status, created_at, started_at, completed_at, input")
          .in("id", runIds)
      : Promise.resolve({ data: [], error: null }),
    runIds.length
      ? supabase
          .schema("workflow")
          .from("node_outcome")
          .select("id, run_id, node_id, step, attempt, item_index, completed_at, duration_ms, input, output, error")
          .in("run_id", runIds)
          .order("completed_at", { ascending: true })
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .schema("mandate")
      .from("provision_snapshot")
      .select("id, point_key, point_label, run_id, subject_id, created_at, total_chars")
      .or(snapshotOr.join(","))
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);
  const failed = runs.error ?? outcomes.error ?? snapshots.error;
  if (failed) throw new Error(`Run records could not be read: ${failed.message}`);
  const definitionIds = [...new Set((runs.data ?? []).map((r) => r.definition_id))];
  const defs = definitionIds.length
    ? await supabase.schema("workflow").from("definition").select("id, name, nodes").in("id", definitionIds)
    : { data: [], error: null };
  if (defs.error) throw new Error(`Workflow definitions could not be read: ${defs.error.message}`);
  return {
    definitions: (defs.data ?? []).map((d) => ({ id: d.id, name: d.name, nodes: definitionNodes(d.nodes) })),
    runs: (runs.data ?? []).map((r) => ({
      id: r.id,
      definitionId: r.definition_id,
      status: r.status,
      createdAt: r.created_at,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      input: r.input,
    })),
    outcomes: (outcomes.data ?? []).map((o) => ({
      id: o.id,
      runId: o.run_id,
      nodeId: o.node_id,
      step: o.step,
      attempt: o.attempt,
      itemIndex: o.item_index,
      completedAt: o.completed_at,
      durationMs: o.duration_ms,
      input: o.input,
      output: o.output,
      error: o.error,
    })),
    snapshots: (snapshots.data ?? []).map((s) => ({
      id: s.id,
      pointKey: s.point_key,
      pointLabel: s.point_label,
      runId: s.run_id,
      subjectId: s.subject_id,
      createdAt: s.created_at,
      totalChars: s.total_chars,
    })),
  };
}
import { storedMandateKey, type AnyMandateKey } from "@ai-matrx/agents/mandates";

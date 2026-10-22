/**
 * Pure model of the workflow Overview view (legible-diagrams L6): reading the
 * `GET /workflows/{id}/overview` answer, mapping a picked overview box to the
 * real steps behind it, and the Workflow Studio door for "Ask to change this".
 */

import type { RunStepPresentation } from "../components/run/node-presentation";

export interface WorkflowOverview {
  definitionId: string;
  /** An engine `workflow` spec. */
  spec: Record<string, unknown>;
  /** `{overview box id: [real node ids]}`. */
  nodeMap: Record<string, string[]>;
  /** The server's layout check; `null` when it has not run (VisualMap then says "Layout not checked"). */
  verified: boolean | null;
  issues: number | null;
}

/** Reads the endpoint's answer; null when it is not a drawable overview. */
export function parseWorkflowOverview(data: unknown): WorkflowOverview | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const spec = d.spec;
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return null;
  const nodeMap: Record<string, string[]> = {};
  const raw = d.node_map;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [box, ids] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(ids)) nodeMap[box] = ids.filter((id): id is string => typeof id === "string");
    }
  }
  return {
    definitionId: typeof d.definition_id === "string" ? d.definition_id : "",
    spec: spec as Record<string, unknown>,
    nodeMap,
    verified: typeof d.verified === "boolean" ? d.verified : null,
    issues: typeof d.issues === "number" && Number.isFinite(d.issues) ? d.issues : null,
  };
}

/** The real steps (in the page's own order) behind one overview box. */
export function stepsBehind(
  overview: Pick<WorkflowOverview, "nodeMap">,
  boxId: string | null,
  steps: readonly RunStepPresentation[],
): RunStepPresentation[] {
  if (!boxId) return [];
  const ids = new Set(overview.nodeMap[boxId] ?? []);
  return steps.filter((step) => ids.has(step.nodeId));
}

/** The overview box's own words (its label), else its id. */
export function boxLabel(spec: Record<string, unknown>, boxId: string): string {
  const nodes = Array.isArray(spec.nodes) ? (spec.nodes as Array<Record<string, unknown>>) : [];
  const found = nodes.find((n) => n.id === boxId);
  return typeof found?.label === "string" && found.label ? found.label : boxId;
}

/**
 * This frontend has no Conductor entry (the Conductor lives inside Workflow
 * Studio), so "Ask to change this" opens the workflow in Studio. Studio's
 * route understands ONE `select` node id, so the first picked step rides along.
 */
export function studioHref(studioBase: string, definitionId: string, nodeIds: readonly string[]): string {
  const base = `${studioBase.replace(/\/$/, "")}/workflows/${encodeURIComponent(definitionId)}`;
  return nodeIds.length > 0 ? `${base}?select=${encodeURIComponent(nodeIds[0])}` : base;
}

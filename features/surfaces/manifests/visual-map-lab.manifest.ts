/**
 * Surface manifest — the Visual map lab (`matrx-user/visual-map-lab`).
 *
 * `/visual-maps/lab/*`: the list of samples (the six test subjects, workflow overviews, saved inspections) and one sample
 * open with its picture, screenshots, measurements, diagnostics, receipt, spec, Mermaid version and repair rounds.
 * Emitter: `features/visual-map-lab` (`LabListPage`, `SampleRecordPage`). The sample values are the same ones Copy for AI and
 * Send to agent builder hand an agent. No write targets: nothing here is changed by an agent.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const VISUAL_MAP_LAB_SURFACE_NAME = "matrx-user/visual-map-lab";

const group: SurfaceValueGroup = { key: "visual_map_lab", label: "Visual map lab", sortOrder: 100, description: "The sample or list in view." };

const v = (name: string, label: string, valueType: SurfaceValue["valueType"], sortOrder: number, description: string, extra: Partial<SurfaceValue> = {}): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group: group.key,
  sortOrder,
  ...extra,
});

const values: SurfaceValue[] = [
  v("lab_view", "Lab view", "string", 100, '"list", "sample" or "front_door".', { alwaysAvailable: true, typicalCharCount: 8 }),
  v("sample_count", "Samples listed", "number", 110, "How many samples the list holds right now."),
  v("sample_id", "Sample ID", "string", 120, "Address of the open sample: subject:S3:archify, workflow:<id> or inspection:<id>.", { typicalCharCount: 48 }),
  v("sample_load_status", "Load status", "string", 130, '"loading", "failed" or "loaded".', { typicalCharCount: 8 }),
  v("sample_title", "Sample title", "string", 140, "The diagram's own title."),
  v("sample_source", "Sample source", "string", 150, '"subject", "workflow" or "inspection".', { typicalCharCount: 10 }),
  v("diagram_type", "Diagram type", "string", 160, "The engine diagram type, when the sample draws as a visual map.", { typicalCharCount: 12 }),
  v("verified", "Verified", "boolean", 170, "Whether the layout check passed."),
  v("issue_count", "Issue count", "number", 180, "Engine diagnostics on the sample."),
  v("round_count", "Saved rounds", "number", 190, "Repair rounds and inspections saved for this subject."),
  v("spec", "Spec", "object", 200, "The spec the picture is drawn from.", { typicalCharCount: 6000 }),
  v("diagnostics", "Engine diagnostics", "object", 210, "The engine's diagnostics for the spec.", { typicalCharCount: 3000 }),
  v("measurements", "Measurements", "object", 220, "inspection.v1 numbers (or a map of them per width and theme).", { typicalCharCount: 6000 }),
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted; not yet probed live on its route.",
  surfaceName: VISUAL_MAP_LAB_SURFACE_NAME,
  situation:
    "They are in the Visual map lab, {lab_view|list}. Sample: {sample_title|none open}. You can read its spec, diagnostics and measurements.",
  inheritsFrom: "matrx-default/account",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Visual map lab",
  description: "Samples of rendered diagrams with their screenshots, measurements and diagnostics.",
  urlPattern: "/visual-maps/lab/[sampleId]",
  groups: [group],
  values,
  skipBaselineValues: true,
};

export const visualMapLabManifest = declared;

export function createVisualMapLabScope(scope: {
  lab_view: string;
  sample_count?: number;
  sample_id?: string;
  sample_load_status?: string;
  sample_title?: string;
  sample_source?: string;
  diagram_type?: string;
  verified?: boolean;
  issue_count?: number;
  round_count?: number;
  spec?: unknown;
  diagnostics?: unknown;
  measurements?: unknown;
}): SurfaceScopePayload {
  return scope as unknown as SurfaceScopePayload;
}

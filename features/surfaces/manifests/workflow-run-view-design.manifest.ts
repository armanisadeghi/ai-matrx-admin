/**
 * Surface manifest — Workflow run page design (`matrx-user/workflow-run-view-design`).
 *
 * `/workflows/[id]/design` and the admin seat's
 * `/administration/automation/workflows/[id]/design` (same body, `RunSurfaceBuilder`):
 * the builder for the page people see while one workflow runs — build choices on the
 * left, the real run page previewed on the right.
 *
 * Emitter: `RunSurfaceBuilder` (`features/workflow-runtime/builder/`).
 * Write targets (both DRAFT: they change the builder, the person presses Save, or
 * "Use this page" for a workflow with no saved view yet):
 *   - `view_settings_draft` — the view's name, audience and detail level.
 *   - `panel_titles_draft` — retitle panels.
 * Not writable: panel placement and sources (the build flow's own choices), saving.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const WORKFLOW_RUN_VIEW_DESIGN_SURFACE_NAME = "matrx-user/workflow-run-view-design";

const groups: SurfaceValueGroup[] = [
  { key: "design_workflow", label: "Workflow", sortOrder: 100, description: "The workflow whose run page is being designed." },
  { key: "design_view", label: "Run page", sortOrder: 200, description: "The run page as built so far, saved or not." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("workflow_id", "Workflow ID", "string", "design_workflow", 100, "UUID of the workflow (from the address).", {
    alwaysAvailable: true,
    typicalCharCount: 36,
  }),
  v("workflow_name", "Workflow name", "string", "design_workflow", 110, "The workflow's name."),
  v(
    "design_load_status",
    "Load status",
    "string",
    "design_workflow",
    120,
    '"loading", "loaded" or "not_found" (no access, no such workflow, or the read failed; the page offers a retry).',
    { alwaysAvailable: true, typicalCharCount: 10 },
  ),
  v(
    "workflow_steps",
    "Workflow steps",
    "array",
    "design_workflow",
    130,
    "The workflow's steps the panels can show: { id, label, role, worth_watching, asks_the_person, is_sub_workflow }.",
    { typicalCharCount: 1200 },
  ),
  v(
    "view_saved",
    "Saved view",
    "boolean",
    "design_view",
    200,
    'False while this workflow has no saved run page yet (the page offers "Use this page"); true once one exists.',
  ),
  v("has_unsaved_changes", "Unsaved changes", "boolean", "design_view", 210, "True when the builder differs from what is saved."),
  v(
    "view_settings",
    "View settings",
    "object",
    "design_view",
    220,
    '{ name, audience ("consumer" | "creator"), profile ("full" | "compact" | "summary") } as the builder holds them.',
    { typicalCharCount: 80 },
  ),
  v("screens", "Screens", "array", "design_view", 230, "The run page's screens (tabs): { id, title, activate_on }. Empty = one screen.", {
    typicalCharCount: 200,
  }),
  v("screen_in_view", "Screen in view", "string", "design_view", 240, "The screen id the builder and preview are on (empty = the first)."),
  v(
    "panels",
    "Panels",
    "array",
    "design_view",
    250,
    "Every panel on the run page, in order: { id, title (empty = derived from its source), shows (its source in words), screen_id, multi_run, appears_on, hides_on }.",
    { typicalCharCount: 1500 },
  ),
  v("deliverable_step_id", "Deliverable step", "string", "design_view", 260, "The step whose finish marks the deliverable ready, if one is set."),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "view_settings_draft",
    label: "Set the view's name and audience",
    description:
      'Change the run page\'s settings in the builder. NOTHING is saved — the person presses Save. Value is a JSON object with any of { "name": string, "audience": "consumer" | "creator", "profile": "full" | "compact" | "summary" }; only the keys you send change. Refused: another value, an empty name, an unknown key.',
    valueType: "object",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "view_settings",
    group: "design_view",
    sortOrder: 300,
  },
  {
    name: "panel_titles_draft",
    label: "Retitle panels",
    description:
      'Give panels new titles in the builder. NOTHING is saved — the person presses Save. Value is a JSON object { "<panel id from panels>": "new title" }; an empty string goes back to the title derived from the panel\'s source. Refused: an unknown panel id, a title that is not text.',
    valueType: "object",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "panels",
    group: "design_view",
    sortOrder: 310,
  },
];

const declared: SurfaceManifest = {
  surfaceName: WORKFLOW_RUN_VIEW_DESIGN_SURFACE_NAME,
  situation:
    "They are designing the page people see while {workflow_name|this workflow} runs (page: {design_load_status}). Saved view: {view_saved|no}; unsaved changes: {has_unsaved_changes|no}. You can rename the view, set its audience and detail, or retitle its panels; the person saves.",
  inheritsFrom: "matrx-default/workflows",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Workflow run page design",
  description: "The builder for the page people see while one workflow runs, with a live preview.",
  urlPattern: "/workflows/[id]/design",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const workflowRunViewDesignManifest = declared;

export function createWorkflowRunViewDesignScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

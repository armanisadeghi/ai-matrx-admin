/**
 * Surface manifest — Workflow triggers (`matrx-user/workflow-triggers`).
 *
 * `/workflows/[id]/triggers` ("Run it without me") and the admin seat's
 * `/administration/automation/workflows/[id]/triggers` (same body,
 * `WorkflowTriggersPage`): how one workflow runs when nobody presses Run — its
 * schedules and the addresses other tools call.
 *
 * Emitter: `WorkflowTriggersPage` (`features/workflow-runtime/triggers/components/`).
 * Write targets, through `useWorkflowTriggers` (the doors the page uses):
 *   - `create_triggers` adds SCHEDULES only. An address (webhook) is not agent-made:
 *     its password is shown once and the person must copy it.
 *   - `update_triggers` turns triggers on or off (the card switch).
 * NOT writable: removing a trigger and "run now" (it starts a paid run) stay the
 * person's buttons; counts and fire history are evidence.
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

export const WORKFLOW_TRIGGERS_SURFACE_NAME = "matrx-user/workflow-triggers";

const groups: SurfaceValueGroup[] = [
  { key: "triggers_workflow", label: "Workflow", sortOrder: 100, description: "The workflow these triggers start." },
  { key: "triggers_list", label: "Triggers", sortOrder: 200, description: "Its schedules and addresses." },
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
  v("workflow_id", "Workflow ID", "string", "triggers_workflow", 100, "UUID of the workflow (from the address).", {
    alwaysAvailable: true,
    typicalCharCount: 36,
  }),
  v("workflow_name", "Workflow name", "string", "triggers_workflow", 110, "The workflow's name."),
  v(
    "triggers_load_status",
    "Load status",
    "string",
    "triggers_workflow",
    120,
    '"loading", "loaded", "failed" (the triggers could not be read; the page shows why) or "not_found" (no access or no such workflow).',
    { alwaysAvailable: true, typicalCharCount: 10 },
  ),
  v("trigger_count", "Triggers", "number", "triggers_list", 200, "How many triggers it has (0 = it runs only when someone presses Run)."),
  v("active_trigger_count", "Active triggers", "number", "triggers_list", 210, "How many are switched on."),
  v(
    "triggers",
    "Trigger list",
    "array",
    "triggers_list",
    220,
    'Every trigger: { id, name, kind ("cron" = schedule | "webhook" = address | "manual" | "event"), schedule (in words, schedules only), cron_expression, timezone, active, default_inputs (the answers it runs with), next_run_at, last_fired_at, last_run_id, fire_count }. Webhook passwords are never readable.',
    { typicalCharCount: 1500 },
  ),
  v("new_trigger_form_open", "New trigger form open", "boolean", "triggers_list", 230, "True while the person has the add form open."),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "create_triggers",
    label: "Add schedules",
    description:
      'Add schedules so the workflow runs by itself. SAVED and switched on after the person approves. Value is a JSON ARRAY of 1-10 objects, each { "name": string (required), "cron_expression": 5-field cron (required, e.g. "0 8 * * 1-5" = 8:00 on weekdays), "timezone"?: IANA name like "America/Los_Angeles" (default: the person\'s), "default_inputs"?: { input name: value } (the answers each run starts with; a required input left out makes each run wait for a person) }. Only schedules: an address for other tools is set up by the person. Refused (nothing saved): an invalid cron or timezone, a missing name, a name repeated in the list. Returns each new trigger with its id.',
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "triggers",
    group: "triggers_list",
    sortOrder: 300,
  },
  {
    name: "update_triggers",
    label: "Turn triggers on or off",
    description:
      'Switch triggers on or off, as the card switch does. SAVED after the person approves. Value is a JSON ARRAY of 1-25 objects, each { "id": an id from triggers, "active": true | false }. Nothing else can be changed here. Refused (nothing saved): an unknown id, an id twice, a missing "active", any other field.',
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "triggers",
    group: "triggers_list",
    sortOrder: 310,
  },
];

const declared: SurfaceManifest = {
  surfaceName: WORKFLOW_TRIGGERS_SURFACE_NAME,
  situation:
    "They are setting how the workflow {workflow_name|this workflow} runs without them (page: {triggers_load_status}): {trigger_count|no} triggers, {active_trigger_count|none} switched on. You can add schedules or switch triggers on and off.",
  inheritsFrom: "matrx-default/workflows",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Workflow triggers",
  description: "How one workflow runs without anyone pressing Run: its schedules and addresses.",
  urlPattern: "/workflows/[id]/triggers",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const workflowTriggersManifest = declared;

export function createWorkflowTriggersScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

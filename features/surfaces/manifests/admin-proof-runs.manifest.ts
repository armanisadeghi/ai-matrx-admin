import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
export const ADMIN_PROOF_RUNS_SURFACE_NAME = "matrx-admin/proof-runs";
const groups: SurfaceValueGroup[] = [
  { key: "loaded", label: "Loaded registry", sortOrder: 100 },
  { key: "state", label: "Page state", sortOrder: 200 },
  { key: "runs", label: "Run controls and receipts", sortOrder: 300 },
  { key: "view", label: "History view", sortOrder: 400 },
  { key: "scenario", label: "Scenario draft", sortOrder: 500 },
];
const values: SurfaceValue[] = [
  {
    name: "page_overview",
    label: "Proof runs overview",
    description:
      "Compact XML overview of read state, selected check/mode, registered checks, scenarios and recent receipt identities, with total/shown counts when truncated. No lookup is needed to describe the page.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 5000,
    inlineUpTo: 6500,
    autoContext: true,
    group: "state",
    sortOrder: 0,
  },
  {
    name: "history_search",
    label: "History search",
    description:
      "Current controlled search text in the recent-runs table. Empty text means no search.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 100,
    autoContext: false,
    group: "view",
    sortOrder: 185,
  },

  {
    name: "proof_checks",
    label: "Proof checks",
    description:
      "Available only after the combined registry, recent-run, scenario and mandate-catalog read succeeds. Empty then means a successful empty result; retained rows during refresh are the last successful read; absent after a failed read.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    autoContext: false,
    group: "loaded",
    sortOrder: 0,
  },
  {
    name: "recent_runs",
    label: "Recent runs",
    description:
      "Available only after the combined registry, recent-run, scenario and mandate-catalog read succeeds. Empty then means a successful empty result; retained rows during refresh are the last successful read; absent after a failed read.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 5000,
    autoContext: false,
    group: "loaded",
    sortOrder: 10,
  },
  {
    name: "scenarios",
    label: "Scenarios",
    description:
      "Available only after the combined registry, recent-run, scenario and mandate-catalog read succeeds. Empty then means a successful empty result; retained rows during refresh are the last successful read; absent after a failed read.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 8000,
    autoContext: false,
    group: "loaded",
    sortOrder: 20,
  },
  {
    name: "mandate_catalog",
    label: "Mandate catalog",
    description:
      "Available only after the combined registry, recent-run, scenario and mandate-catalog read succeeds. Empty then means a successful empty result; retained rows during refresh are the last successful read; absent after a failed read.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 8000,
    autoContext: false,
    group: "loaded",
    sortOrder: 30,
  },
  {
    name: "expectation_rules",
    label: "Expectation rules",
    description:
      "Available only after the combined registry, recent-run, scenario and mandate-catalog read succeeds. Empty then means a successful empty result; retained rows during refresh are the last successful read; absent after a failed read.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    autoContext: false,
    group: "loaded",
    sortOrder: 40,
  },
  {
    name: "open_run",
    label: "Open run",
    description:
      "Full receipt of the currently opened history run; absent when none is open. Pending run identity and errors are separate values.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 5000,
    autoContext: false,
    group: "runs",
    sortOrder: 50,
  },
  {
    name: "loading",
    label: "Loading",
    description: "Whether the combined read is in flight.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    autoContext: true,
    group: "state",
    sortOrder: 60,
  },
  {
    name: "data_loaded",
    label: "Data loaded",
    description:
      "Whether the current combined-read snapshot is usable; false before first success or after an API failure or organization refusal.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    autoContext: true,
    group: "state",
    sortOrder: 70,
  },
  {
    name: "load_error",
    label: "Load error",
    description:
      "Most recent combined-read failure, absent when there is none.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 500,
    autoContext: true,
    group: "state",
    sortOrder: 80,
  },
  {
    name: "organization_required",
    label: "Organization required",
    description:
      "Whether the last read requires an organization before it can proceed.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    autoContext: true,
    group: "state",
    sortOrder: 90,
  },
  {
    name: "selected_check",
    label: "Selected check",
    description:
      "Check slug chosen in the run controls; empty means no check selected.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 100,
    autoContext: true,
    group: "state",
    sortOrder: 100,
  },
  {
    name: "run_mode",
    label: "Run mode",
    description: "Selected auto, live or replay mode.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 10,
    autoContext: true,
    group: "runs",
    sortOrder: 110,
  },
  {
    name: "running_check",
    label: "Running check",
    description: "Currently executing check slug; absent while idle.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 100,
    autoContext: true,
    group: "runs",
    sortOrder: 120,
  },
  {
    name: "run_console",
    label: "Run console",
    description:
      "Live console started receipt, steps, proofs, completion, skipped reason, error and running state.",
    valueType: "object",
    alwaysAvailable: true,
    typicalCharCount: 8000,
    autoContext: false,
    group: "runs",
    sortOrder: 130,
  },
  {
    name: "run_controls",
    label: "Run controls",
    description: "Composite of selected check, mode and running check.",
    valueType: "object",
    alwaysAvailable: true,
    typicalCharCount: 300,
    autoContext: false,
    group: "runs",
    sortOrder: 140,
  },
  {
    name: "read_state",
    label: "Read state",
    description:
      "Composite of loading, loaded, organization requirement and read error.",
    valueType: "object",
    alwaysAvailable: true,
    typicalCharCount: 600,
    autoContext: false,
    group: "state",
    sortOrder: 150,
  },
  {
    name: "run_detail_loading",
    label: "Run detail loading",
    description: "Whether the latest selected run detail request is pending.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    autoContext: true,
    group: "runs",
    sortOrder: 160,
  },
  {
    name: "requested_run_id",
    label: "Requested run ID",
    description:
      "Latest requested history receipt identity; absent without an active detail request.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 40,
    autoContext: true,
    group: "runs",
    sortOrder: 170,
  },
  {
    name: "run_detail_error",
    label: "Run detail error",
    description:
      "Failure of the latest requested history receipt, absent otherwise.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 500,
    autoContext: true,
    group: "runs",
    sortOrder: 180,
  },
  {
    name: "recent_runs_table_query",
    label: "Recent runs table query",
    description: "Canonical history search, filters, sort and page state.",
    valueType: "object",
    alwaysAvailable: true,
    typicalCharCount: 500,
    autoContext: true,
    group: "view",
    sortOrder: 190,
  },
  {
    name: "visible_runs",
    label: "Visible runs",
    description:
      "Processed rows reported by the canonical history table after the combined read succeeds, for its current query. Absent before a successful read.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 5000,
    autoContext: false,
    group: "view",
    sortOrder: 200,
  },
  {
    name: "scenario_draft",
    label: "Scenario draft",
    description:
      "Current controlled editor scenario, absent when the editor is closed.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 8000,
    autoContext: false,
    group: "state",
    sortOrder: 210,
  },
  {
    name: "scenario_editor_state",
    label: "Scenario editor state",
    description:
      "Current variables text, parse error, saving flag and planted markers, absent while editor closed.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    autoContext: false,
    group: "state",
    sortOrder: 220,
  },
  {
    name: "monthly_spend",
    label: "Monthly spend",
    description:
      "Loaded month-to-date USD spend, ceiling and percentage; absent before a successful read.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 100,
    autoContext: false,
    group: "state",
    sortOrder: 230,
  },
  {
    name: "month_to_date_usd",
    label: "Month-to-date USD",
    description: "Loaded month-to-date spend, absent before a successful read.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 12,
    autoContext: true,
    group: "state",
    sortOrder: 240,
  },
  {
    name: "monthly_ceiling_usd",
    label: "Monthly ceiling USD",
    description: "Loaded monthly ceiling, absent before a successful read.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 12,
    autoContext: true,
    group: "state",
    sortOrder: 250,
  },
  {
    name: "budget_percentage",
    label: "Budget percentage",
    description:
      "Loaded ceiling percentage clamped to 100; zero when loaded ceiling is zero.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 4,
    autoContext: true,
    group: "state",
    sortOrder: 260,
  },
  {
    name: "scenario_slug",
    label: "Scenario slug",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 270,
  },
  {
    name: "scenario_label",
    label: "Scenario label",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 280,
  },
  {
    name: "scenario_description",
    label: "Scenario description",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 290,
  },
  {
    name: "scenario_mandate_key",
    label: "Scenario mandate key",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 300,
  },
  {
    name: "scenario_user_input",
    label: "Scenario user input",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 310,
  },
  {
    name: "scenario_variables",
    label: "Scenario variables",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    autoContext: false,
    group: "scenario",
    sortOrder: 320,
  },
  {
    name: "scenario_allowed_routes",
    label: "Scenario allowed routes",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    autoContext: false,
    group: "scenario",
    sortOrder: 330,
  },
  {
    name: "scenario_expectations",
    label: "Scenario expectations",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    autoContext: false,
    group: "scenario",
    sortOrder: 340,
  },
  {
    name: "scenario_is_active",
    label: "Scenario is active",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "boolean",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 350,
  },
  {
    name: "scenario_live_every_seconds",
    label: "Scenario live every seconds",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 360,
  },
  {
    name: "scenario_max_cost_usd",
    label: "Scenario max cost usd",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 370,
  },
  {
    name: "scenario_check_slug",
    label: "Scenario check slug",
    description:
      "Current controlled draft field, available only while the scenario editor is open. Its composite is scenario_draft.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    group: "scenario",
    sortOrder: 380,
  },
  {
    name: "scenario_variables_text",
    label: "Scenario variables text",
    valueType: "string",
    typicalCharCount: 8000,
    description:
      "Current JSON editor text, including invalid draft JSON, available while the scenario editor is open.",
    alwaysAvailable: false,
    autoContext: false,
    group: "scenario",
    sortOrder: 500,
  },
  {
    name: "scenario_variables_error",
    label: "Scenario variables error",
    valueType: "string",
    typicalCharCount: 500,
    description:
      "Current JSON parse error, available only when the open draft contains invalid JSON.",
    alwaysAvailable: false,
    autoContext: false,
    group: "scenario",
    sortOrder: 510,
  },
  {
    name: "scenario_saving",
    label: "Scenario saving",
    valueType: "boolean",
    typicalCharCount: 5,
    description: "Whether the open scenario is being saved.",
    alwaysAvailable: false,
    autoContext: false,
    group: "scenario",
    sortOrder: 520,
  },
  {
    name: "scenario_planted_markers",
    label: "Scenario planted markers",
    valueType: "array",
    typicalCharCount: 500,
    description:
      "Marker names derived from the open draft facts, routes and user input.",
    alwaysAvailable: false,
    autoContext: false,
    group: "scenario",
    sortOrder: 530,
  },
];
const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "scenario_description",
    label: "Scenario description draft",
    description:
      "Replaces the open scenario's authored description text. Nothing is saved. Open the scenario first with open_scenario.",
    valueType: "string",
    approvalComparison: "text-replacement",
    updatesValue: "scenario_description",
    mode: "draft",
    applyPolicy: "ask",
    patchable: true,
    group: "scenario",
    sortOrder: 140,
  },
  {
    name: "scenario_user_input",
    label: "Scenario user-input draft",
    description:
      "Replaces the open scenario's human-message test fixture. This is engineered scenario data; it does not send a message or run the subject agent. Nothing is saved. Open a scenario first.",
    valueType: "string",
    approvalComparison: "text-replacement",
    updatesValue: "scenario_user_input",
    mode: "draft",
    applyPolicy: "ask",
    patchable: true,
    group: "scenario",
    sortOrder: 150,
  },

  {
    name: "create_scenarios",
    label: "Create scenarios",
    valueType: "array",
    valueKind: "json",
    updatesValue: "scenarios",
    mode: "entity",
    applyPolicy: "ask",
    group: "scenario",
    sortOrder: 100,
    description:
      "Saves 1–25 new scenarios through the same save path as the editor; NEVER runs a proof. Value is an ARRAY of objects with required slug (3–61 lowercase letters/digits/underscores), label (1–200 chars), mandate_key (from mandate_catalog); optional description string, variables JSON object, allowed_routes string array, expectations array of generated Expectation objects, user_input string/null, is_active boolean. Slugs must be new and unique. Operator cost and cadence use the editor defaults and cannot be supplied. Invalid items, unknown keys/mandates and duplicate slugs refuse the entire list before approval. Close the current editor first.",
  },
  {
    name: "update_scenarios",
    label: "Update scenarios",
    valueType: "array",
    valueKind: "json",
    updatesValue: "scenarios",
    mode: "entity",
    applyPolicy: "ask",
    group: "scenario",
    sortOrder: 110,
    description:
      "Saves changes to 1–25 loaded scenarios immediately; NEVER executes one. Value is an ARRAY of {id: existing scenario slug, ...fields}. Only sent fields change: label, description, mandate_key, variables, allowed_routes, expectations, user_input, is_active. Arrays/variables replace that whole field; include items to keep. is_active:false disables a scenario and true re-enables it. Slug, derived check identity, cadence, cost ceiling and evidence cannot change. Unknown/repeated ids, invalid fields/mandates and an open editor refuse the whole list before approval.",
  },
  {
    name: "delete_scenarios",
    label: "Archive scenarios",
    valueType: "array",
    valueKind: "json",
    updatesValue: "scenarios",
    mode: "entity",
    applyPolicy: "ask",
    group: "scenario",
    sortOrder: 120,
    description:
      "Archives 1–25 scenarios using the page's existing soft-delete function. Value is an ARRAY of loaded scenario slug strings or {id:slug} objects. Archived scenarios disappear from this list; the recorded proof runs are retained. There is no restore-deleted UI on this page; prefer update_scenarios with is_active:false to disable reversibly. Unknown or repeated slugs refuse the whole list. Close the open editor first.",
  },
  {
    name: "scenario_draft",
    label: "Scenario draft",
    valueType: "object",
    valueKind: "json",
    updatesValue: "scenario_draft",
    mode: "draft",
    applyPolicy: "ask",
    group: "scenario",
    sortOrder: 130,
    description:
      "Opens the existing New scenario editor, or patches the currently open scenario's controlled fields. NOTHING is saved or run. Value is an OBJECT with __kind:'json' and at least one authored field: slug (new drafts only), label, description, mandate_key, variables, allowed_routes, expectations, user_input, is_active. Omitted fields stay unchanged; arrays and variables replace their whole field. Saved slugs cannot change. Existing slugs must be opened with open_scenario first. Cost/cadence controls remain operator-owned. Current invalid variables JSON requires corrected variables in the proposal. The person still presses Save scenario.",
  },
  {
    name: "selected_check",
    label: "Selected check",
    description:
      "Selects a loaded proof_checks slug without executing it. Plain string; empty clears the selection.",
    valueType: "string",
    updatesValue: "selected_check",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 200,
  },
  {
    name: "run_mode",
    label: "Run mode",
    description:
      "Changes the existing run-mode control to auto, live or replay. No proof starts and no provider is called.",
    valueType: "string",
    updatesValue: "run_mode",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 200,
  },
  {
    name: "history_search",
    label: "History search",
    description: "Changes recent-run search text only; empty string clears it.",
    valueType: "string",
    updatesValue: "history_search",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 200,
  },
  {
    name: "open_run",
    label: "Open receipt",
    description:
      "Opens a recorded receipt by id from recent_runs; empty text closes it. Reads existing evidence and never executes a check.",
    valueType: "string",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 200,
  },
  {
    name: "open_scenario",
    label: "Open scenario",
    description:
      "Opens a saved scenario by its slug from scenarios, or empty text for a new draft. Nothing is saved or run. Save or cancel an open draft first.",
    valueType: "string",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 200,
  },
];
export const adminProofRunsManifest: SurfaceManifest = {
  situation:
    "They are on the Proof runs admin page, where proof checks test agent jobs and leave receipts; spend this month is {month_to_date_usd|not loaded} of a {monthly_ceiling_usd|not loaded} USD ceiling. Check selected: {selected_check|none}, mode {run_mode}. They can open receipts, search history, and write, save or archive test scenarios; nothing runs until they press run.",
  surfaceName: ADMIN_PROOF_RUNS_SURFACE_NAME,
  inheritsFrom: "matrx-default/platform",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Proof runs",
  description:
    "Administrator proof checks, provider spending controls, streamed proof receipts and recent history. Scenario drafts test an existing mandate using engineered inputs; registering this page does not authorize a native job to inherit page context. Loaded data, pending reads, failures and selected run receipts remain distinct.",
  urlPattern: "/administration/compute/proof-runs",
  guide: "features/surfaces/guides/proof-runs.md",
  intro: `<surface_intro>Read page_overview first to describe this page without lookups. Scenario authored data uses create_scenarios, update_scenarios, delete_scenarios and scenario_draft; these use the editor's own save/remove paths. Generic data/context tools are not an alternative. View targets select a check/mode, search history and open existing receipts or scenario editors; NO target executes a proof, changes a cost ceiling, or schedules work. Native scenario jobs receive only their engineered input, never ambient page context. Administrator proof checks, provider spending controls, streamed proof receipts and recent history. Scenario drafts test an existing mandate using engineered inputs; registering this page does not authorize a native job to inherit page context. Loaded data, pending reads, failures and selected run receipts remain distinct.</surface_intro>`,
  groups,
  writeTargets,
  values: mergeBaselineValues([], values),
};
export function createAdminProofRunsScope(values: {
  page_overview: string;
  history_search: string;
  proof_checks?: unknown[];
  recent_runs?: unknown[];
  scenarios?: unknown[];
  mandate_catalog?: unknown[];
  expectation_rules?: unknown[];
  open_run?: object;
  loading: boolean;
  data_loaded: boolean;
  organization_required: boolean;
  selected_check: string;
  run_mode: string;
  run_console: object;
  run_controls: object;
  read_state: object;
  run_detail_loading: boolean;
  recent_runs_table_query: object;
  visible_runs?: unknown[];
  load_error?: string;
  running_check?: string;
  requested_run_id?: string;
  run_detail_error?: string;
  monthly_spend?: object;
  month_to_date_usd?: number;
  monthly_ceiling_usd?: number;
  budget_percentage?: number;
  scenario_draft?: object;
  scenario_editor_state?: object;
  content?: string;
  context?: Record<string, unknown>;
  scenario_variables_text?: string;
  scenario_variables_error?: string;
  scenario_saving?: boolean;
  scenario_planted_markers?: string[];
  scenario_slug?: string;
  scenario_label?: string;
  scenario_description?: string;
  scenario_mandate_key?: string;
  scenario_user_input?: string;
  scenario_variables?: object;
  scenario_allowed_routes?: string[];
  scenario_expectations?: unknown[];
  scenario_is_active?: boolean;
  scenario_live_every_seconds?: number;
  scenario_max_cost_usd?: number;
  scenario_check_slug?: string;
}): SurfaceScopePayload {
  return values;
}

/**
 * Surface manifest — one held run (`matrx-admin/held-run`).
 *
 * `/administration/billing/held-runs/[id]`: one run a spend gate stopped (`billing.held_run`) —
 * what it was going to do (mandate, agent and version, model, inputs, context, the messages it
 * would have sent, tools), why it was stopped, and its replays. The id may be an alarm's id; then
 * the alarm's newest held run opens. Parent: Account (billing).
 *
 * Emitter: `HeldRunView` (`features/admin/held-runs/`). Write target `pause_automation` pauses or
 * resumes the automation the run came from, through the page's own buttons' call. "Replay and
 * watch" starts a PAID run, so it stays the person's press (it has its own confirm).
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ADMIN_HELD_RUN_SURFACE_NAME = "matrx-admin/held-run";

const runGroup: SurfaceValueGroup = { key: "held_run", label: "Held run", sortOrder: 100, description: "The run that was stopped and why." };
const inputGroup: SurfaceValueGroup = { key: "held_run_inputs", label: "What it would have run", sortOrder: 200, description: "Its frozen inputs and messages." };

const v = (name: string, label: string, valueType: SurfaceValue["valueType"], group: string, sortOrder: number, description: string, extra: Partial<SurfaceValue> = {}): SurfaceValue => ({
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

const values: SurfaceValue[] = [
  v("held_run_address_id", "Address ID", "string", runGroup.key, 100, "The id in the address: a held run's id, or an alarm's (then its newest held run).", {
    alwaysAvailable: true,
    typicalCharCount: 36,
  }),
  v("held_run_load_status", "Load status", "string", runGroup.key, 110, '"loading", "failed", "none" (no run was kept for this alarm) or "loaded".', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("held_run_id", "Held run ID", "string", runGroup.key, 120, "UUID of the held run shown.", { typicalCharCount: 36 }),
  v("run_label", "Run", "string", runGroup.key, 130, "The mandate's name, else the agent's name."),
  v("gate", "Gate", "string", runGroup.key, 140, "The spend gate that stopped it, in words."),
  v("why_stopped", "Why stopped", "string", runGroup.key, 150, "The refusal sentence.", { typicalCharCount: 200 }),
  v("mandate_key", "Mandate key", "string", runGroup.key, 160, "The mandate it ran under, when any."),
  v("agent", "Agent", "object", runGroup.key, 170, "{ id, name, version_number }."),
  v("driver", "Driver", "string", runGroup.key, 180, "What started it (e.g. a schedule, a workflow)."),
  v("model", "Model", "string", runGroup.key, 190, "The model it would have used."),
  v("estimated_cost_usd", "Estimated cost (USD)", "number", runGroup.key, 200, "What one replay is estimated to cost."),
  v("times_stopped", "Times stopped", "number", runGroup.key, 210, "How many times this same run was stopped."),
  v("last_seen_at", "Last stopped", "string", runGroup.key, 220, "When it was last stopped (ISO time)."),
  v("replays", "Replays", "array", runGroup.key, 230, "Every replay kept on it: { conversation_id, mode, at }.", { typicalCharCount: 300 }),
  v("automation", "Automation", "object", runGroup.key, 240, "The scheduled automation it came from, when any: { task_id, enabled (null = not changed here yet) }."),
  v("inputs", "Inputs", "array", inputGroup.key, 300, "Its frozen inputs: [{ name, value }].", { typicalCharCount: 1500 }),
  v("typed_message", "Typed message", "string", inputGroup.key, 310, "The message typed for it, when any.", { typicalCharCount: 300, inlineUpTo: 2000 }),
  v("context_values", "Context values", "array", inputGroup.key, 320, "Context it carried: [{ name, value }].", { typicalCharCount: 1500 }),
  v("messages", "Messages", "array", inputGroup.key, 330, "What the agent would have seen: [{ role, content }].", { typicalCharCount: 6000 }),
  v("tools", "Tools", "array", inputGroup.key, 340, "The tools it would have had."),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "pause_automation",
    label: "Pause or resume its automation",
    description:
      "Pause (true) or resume (false) the scheduled automation this run came from, as the page's Pause automation / Resume buttons do. SAVED after the person approves. Value is a boolean. Refused when the run names no automation (automation empty).",
    valueType: "boolean",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "automation",
    group: runGroup.key,
    sortOrder: 400,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: ADMIN_HELD_RUN_SURFACE_NAME,
  situation:
    "As an admin they are looking at a run a spend gate stopped: {run_label|a held run} ({held_run_load_status|loading}), stopped by {gate|a gate}: {why_stopped|no reason recorded}. You can pause or resume its automation; replaying it is their press.",
  inheritsFrom: "matrx-default/account",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Held run",
  description: "One run a spend gate stopped: what it would have run, why it was stopped, and its replays.",
  urlPattern: "/administration/billing/held-runs/[id]",
  groups: [runGroup, inputGroup],
  values,
  writeTargets,
  skipBaselineValues: true,
};

export const adminHeldRunManifest = declared;

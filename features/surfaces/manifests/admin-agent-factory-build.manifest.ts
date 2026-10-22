/**
 * Surface manifest — one Agent Factory build (`matrx-admin/agent-factory-build`).
 *
 * `/administration/agents/factory/[buildId]`: one build, step by step — its job, the steps it
 * ran (and where it looped back), the proof cases and their gates, flags, assumptions, the model
 * it chose and how it ended. Parent: Agents.
 *
 * Emitter: `FactoryBuildPage` (`features/agents/factory/components/`). Read-only: a build is a
 * record of a run; there is no retry or approve control on this page.
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ADMIN_AGENT_FACTORY_BUILD_SURFACE_NAME = "matrx-admin/agent-factory-build";

const buildGroup: SurfaceValueGroup = { key: "factory_build", label: "Build", sortOrder: 100, description: "The build and how it ended." };
const stepsGroup: SurfaceValueGroup = { key: "factory_steps", label: "Steps and proof", sortOrder: 200, description: "What it ran and what it proved." };

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
  v("build_id", "Build ID", "string", buildGroup.key, 100, "UUID of the build (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("build_load_status", "Load status", "string", buildGroup.key, 110, '"loading", "failed" (the page shows why), "not_found" or "loaded".', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("job", "Job", "string", buildGroup.key, 120, "The mandate key the build is for (empty = a new agent)."),
  v("agent_name", "Agent name", "string", buildGroup.key, 130, "The name the build asked for."),
  v("run_status", "Run status", "string", buildGroup.key, 140, "The build run's status (e.g. running, completed, failed)."),
  v(
    "outcome",
    "Outcome",
    "string",
    buildGroup.key,
    150,
    'How it ended: "passed", "saved_unproven", "failed", "send_backs_exhausted", "workflow_sized", … (empty while running).',
  ),
  v("send_backs", "Send-backs", "number", buildGroup.key, 160, "How many times a judge sent it back."),
  v("agent_id", "Agent ID", "string", buildGroup.key, 170, "The agent it saved, when any.", { typicalCharCount: 36 }),
  v("archived_agent", "Agent archived", "boolean", buildGroup.key, 175, "True when an unpassed build archived the agent it saved."),
  v("model", "Model", "object", buildGroup.key, 180, "The model it chose: { model_id, model_name, source, reason }."),
  v("created_at", "Started", "string", buildGroup.key, 190, "When the build was created (ISO time)."),
  v("ended_at", "Ended", "string", buildGroup.key, 195, "When it ended (ISO time)."),
  v("error", "Error", "string", buildGroup.key, 200, "The build's error sentence, when it failed.", { typicalCharCount: 300, inlineUpTo: 2000 }),
  v("workflow_suggestion", "Workflow suggestion", "object", buildGroup.key, 210, "When a workflow might serve better: { reason, proposed_steps }."),
  v(
    "steps",
    "Steps",
    "array",
    stepsGroup.key,
    300,
    "Every step in order: { step, status (done | running | failed | skipped), attempt, findings (a judge's findings when it sent the build back) }.",
    { typicalCharCount: 1500 },
  ),
  v(
    "proof_cases",
    "Proof cases",
    "array",
    stepsGroup.key,
    310,
    "Each proof case: { case_id, source, gates: [{ name, passed, detail }], preferred }.",
    { typicalCharCount: 2500 },
  ),
  v("flags", "Flags", "array", stepsGroup.key, 320, "The build's flags (sentences)."),
  v("assumptions", "Assumptions", "array", stepsGroup.key, 330, "The assumptions it made (sentences)."),
];

const declared: SurfaceManifest = {
  surfaceName: ADMIN_AGENT_FACTORY_BUILD_SURFACE_NAME,
  situation:
    "As an admin they are looking at one Agent Factory build for {job|a new agent} ({build_load_status|loading}): run {run_status|unknown}, outcome {outcome|not decided yet}, {send_backs|0} send-backs. Nothing is changed from this page.",
  inheritsFrom: "matrx-default/agents",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Agent Factory build",
  description: "One Agent Factory build: its steps, proof cases, flags and outcome.",
  urlPattern: "/administration/agents/factory/[buildId]",
  groups: [buildGroup, stepsGroup],
  values,
  skipBaselineValues: true,
};

export const adminAgentFactoryBuildManifest = declared;

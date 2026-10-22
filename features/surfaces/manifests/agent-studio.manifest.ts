/**
 * Surface manifest — Agent Studio (`matrx-user/agent-studio`, `/agents/new/studio`).
 *
 * The Studio before its agent exists (once it does, the page carries the Agent Builder's surface).
 * The emitter is the Studio's one `SurfaceRuntimeProvider` (`AgentStudioPage` `StudioSurfaceRoot`):
 * these values reach chats that FOLLOW the page. The page's own two conversations — the Studio
 * assistant and the agent's run — are marked own and never receive them; the assistant gets the
 * same facts through its mandate's host values every turn. Fixed job: the assistant mandate.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";

const groups: SurfaceValueGroup[] = [
  { key: "studio_where", label: "Where the Studio is", sortOrder: 100, description: "The way in, the stage, and the records it names." },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "studio_mode",
    label: "Studio mode",
    description: "The way in on screen: do-with-me, describe, improve or from-examples.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 12,
    group: "studio_where",
    sortOrder: 100,
  },
  {
    name: "studio_phase",
    label: "Studio phase",
    description: "doing (no build yet), making, building, or improving (an agent exists).",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 10,
    group: "studio_where",
    sortOrder: 110,
  },
  {
    name: "studio_agent",
    label: "Agent",
    description: "The agent being built or improved (id, name). Empty before the build keeps one.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 80,
    group: "studio_where",
    sortOrder: 120,
  },
  {
    name: "studio_build",
    label: "Build",
    description: "The Agent Factory build this Studio started (id, outcome). Empty before one starts.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 70,
    group: "studio_where",
    sortOrder: 130,
  },
  {
    name: "studio_run",
    label: "Run on screen",
    description: "The agent's run in the center (conversation id, whether it has run).",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 70,
    group: "studio_where",
    sortOrder: 140,
  },
];

export const agentStudioManifest: SurfaceManifest = {
  situation:
    "They are in Agent Studio, the {studio_mode} way in, at the {studio_phase} step: an assistant does the job with them, then turns it into an agent they can test and improve. The agent so far is \"{studio_agent.name|not created yet}\".",
  surfaceName: "matrx-user/agent-studio",
  inheritsFrom: "matrx-default/agents",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "Agent Studio: an assistant does the job with a person, then turns it into an agent, tests and improves it.",
  label: "Agent Studio",
  urlPattern: "/agents/new/studio",
  intro: `<surface_intro>
Agent Studio: an assistant does a job with the person, then makes it an agent, runs it and improves it.
- studio_mode and studio_phase say which way in and which stage.
- studio_agent, studio_build and studio_run name the records on screen.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("context"), surfaceSpecific),
  agentRoles: [
    {
      name: "studio_assistant",
      label: "Studio assistant",
      description: "Does the job with the person, then turns it into an agent, and coaches its improvements.",
      kind: "single",
      defaultAgentId: null,
      mandateKey: MANDATE_KEYS.agent_studio__do_the_job_together,
      allowCustom: false,
      autoRun: "never",
      sortOrder: 100,
    },
  ],
};

export function studioScope(values: {
  studio_mode: string;
  studio_phase: string;
  studio_agent?: Record<string, unknown>;
  studio_build?: Record<string, unknown>;
  studio_run?: Record<string, unknown>;
}): SurfaceScopePayload {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
}

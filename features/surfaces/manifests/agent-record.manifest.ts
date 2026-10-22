/**
 * Surface manifest — Agent (`matrx-user/agent-record`).
 *
 * ONE agent's record view at `/agents/[id]` (`AgentViewContent`): its instructions and messages, variables,
 * settings, model, tools, context policies, MCP servers, output schema, tags, category and version, and the
 * one write the view itself offers — "Reset to latest" for a copy made from a template. Editing the agent
 * is the builder's own surface (`/agents/[id]/build`); running it is the run surface. The Board's Agent
 * tile mounts this same surface for its agent.
 *
 * Emitted by `AgentRecord` (`features/agents/route/AgentRecord.tsx`), which reads the agent from the
 * agent-definition store at trigger time.
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

export const AGENT_RECORD_SURFACE_NAME = "matrx-user/agent-record";

const groups: SurfaceValueGroup[] = [
  { key: "agent_identity", label: "Agent identity", sortOrder: 100 },
  { key: "agent_definition", label: "Agent definition", sortOrder: 200 },
  { key: "agent_configuration", label: "Agent configuration", sortOrder: 300 },
];

type Spec = readonly [name: string, label: string, valueType: SurfaceValue["valueType"], group: string, description: string, alwaysAvailable?: boolean];

const SPECS: readonly Spec[] = [
  ["agent_id", "Agent ID", "string", "agent_identity", "UUID of the agent open on the page.", true],
  ["agent_name", "Agent name", "string", "agent_identity", "The agent's name as shown in the page header."],
  ["agent_description", "Agent description", "string", "agent_identity", "The agent's description."],
  ["agent_category", "Agent category", "string", "agent_identity", "The agent's category (a name, or a category id)."],
  ["agent_tags", "Agent tags", "array", "agent_identity", "The agent's tags."],
  ["agent_version", "Agent version", "number", "agent_identity", "The live version number of the agent."],
  ["agent_type", "Agent type", "string", "agent_identity", "Whether the agent is a user agent, a built-in, or a version snapshot."],
  ["agent_follows_source", "Follows its template", "boolean", "agent_identity", "True for a copy that still updates with the template it was made from; false for a customized copy ('Reset to latest' puts the template's content back)."],
  ["agent_model", "Model", "string", "agent_configuration", "The model the agent runs on, with its class when the model has several."],
  ["agent_settings", "Model settings", "object", "agent_configuration", "The agent's model settings (temperature, token limits and the rest) that are set."],
  ["agent_tools", "Tools", "array", "agent_configuration", "Platform tools the agent can call."],
  ["agent_custom_tools", "Custom tools", "array", "agent_configuration", "Custom tools the agent can call."],
  ["agent_mcp_servers", "MCP servers", "array", "agent_configuration", "MCP servers the agent connects to."],
  ["agent_context_policies", "Context policies", "array", "agent_configuration", "How the agent receives context."],
  ["agent_output_schema", "Output schema", "object", "agent_configuration", "The structured output the agent is required to return, when it has one."],
  ["agent_variable_definitions", "Variable definitions", "array", "agent_definition", "The inputs the agent asks for when it runs: name, type, default, and whether each is required."],
  ["agent_system_instruction", "System instruction", "string", "agent_definition", "The text of the agent's system message."],
  ["agent_messages", "Messages", "array", "agent_definition", "Every message of the agent (system, user and assistant), in order, as role and text."],
  ["agent_change_note", "Change note", "string", "agent_definition", "The note saved with the latest change."],
];

const surfaceSpecific: SurfaceValue[] = SPECS.map(([name, label, valueType, group, description, alwaysAvailable], i) => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: alwaysAvailable ?? false,
  typicalCharCount: valueType === "string" ? 200 : 400,
  group,
  sortOrder: 100 + i * 10,
}));

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "reset_to_source",
    label: "Reset to latest",
    description:
      "For a copy made from a template that no longer follows it: replaces the agent's instructions, tools, model and settings with the template's current ones (its tables stay connected). Pass true. Refused on an agent that is not a customized copy. The person is asked first, as with the page's own Reset to latest button.",
    valueType: "boolean",
    updatesValue: "agent_follows_source",
    mode: "entity",
    applyPolicy: "ask",
    group: "agent_identity",
    sortOrder: 100,
  },
];

export const agentRecordManifest: SurfaceManifest = {
  situation:
    "They have the agent \"{agent_name|not loaded yet}\" open (version {agent_version|unknown}, running on {agent_model|no model set}). Its instructions, settings, tools and variables are in your context. If it is a copy of a template, they can reset it to the template's latest content.",
  surfaceName: AGENT_RECORD_SURFACE_NAME,
  inheritsFrom: "matrx-default/agents",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "One agent's record view: definition, configuration and version",
  label: "Agent Record",
  urlPattern: "/agents/[id]",
  intro: `<surface_intro>
You are on ONE agent's record page: how the agent is defined (its system instruction and messages, the variables it asks for), how it is configured (model, settings, tools, MCP servers, context policies, output schema) and which version it is. Read the values; report only what they say.
This page does not edit the agent: editing is the builder (/agents/[id]/build) and running is the run page. The one action here is "Reset to latest" for a customized copy of a template (reset_to_source, shown to the person first).
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  briefValues: ["agent_name", "agent_description", "agent_model", "agent_version"],
  writeTargets,
};

export function createAgentRecordScope(values: {
  agent_id: string;
  agent_name?: string;
  agent_description?: string;
  agent_category?: string;
  agent_tags?: unknown[];
  agent_version?: number;
  agent_type?: string;
  agent_follows_source?: boolean;
  agent_model?: string;
  agent_settings?: Record<string, unknown>;
  agent_tools?: unknown[];
  agent_custom_tools?: unknown[];
  agent_mcp_servers?: unknown[];
  agent_context_policies?: unknown[];
  agent_output_schema?: Record<string, unknown>;
  agent_variable_definitions?: unknown[];
  agent_system_instruction?: string;
  agent_messages?: unknown[];
  agent_change_note?: string;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as unknown as SurfaceScopePayload;
}

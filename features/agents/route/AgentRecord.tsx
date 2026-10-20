"use client";

/**
 * AgentRecord — ONE agent, whole: the `/agents/[id]` record view (`AgentViewContent`: instructions and
 * messages, variables, settings, model, tools, context policies, MCP servers, output schema, version,
 * custom fields, copy and export, "Reset to latest" for a customized copy) with its
 * `matrx-user/agent-record` agent surface. A board tile renders it; the page's own header (name and
 * the View / Build / Run tabs) and layout hydration (`AgentHydratorServer`) are the page's, so this
 * reads the agent itself, once, when the store does not hold it yet.
 */

import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useAgentView } from "@ai-matrx/chat/agents/identity/agent-identity";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import * as agentSelectors from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { selectAgentModelId } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { fetchFullAgent } from "@/features/agents/redux/fetch-full-agent.thunk";
import { resetAgentToSource } from "@/features/agents/redux/builder-tier.thunks";
import { EntityCustomFields } from "@/features/unified-data/components/EntityCustomFields";
import { AGENT_RECORD_SURFACE_NAME, createAgentRecordScope } from "@/features/surfaces/manifests/agent-record.manifest";
import { AgentViewContent } from "./AgentViewContent";

export function AgentRecord({
  agentId,
  embedded = false,
  hydrated = false,
}: {
  agentId: string;
  embedded?: boolean;
  /** The host already put the agent in the store (the page's layout does): read nothing here. */
  hydrated?: boolean;
}) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const agent = useAgentView(agentId);
  const loaded = hydrated || Boolean(agent?._loadedFields?.messages);

  // The page's layout fills the store before the body mounts; a tile has no layout, so it reads the agent
  // once per tab (kept by id: a wake or remount reads nothing; the rows themselves live in the agents slice).
  useStoreRead<null>(
    `agent.full:${agentId}`,
    async () => {
      await dispatch(fetchFullAgent(agentId)).unwrap();
      return null;
    },
    { enabled: !loaded },
  );

  const getScope = () => {
    const state = store.getState();
    const a = selectAgentById(state, agentId);
    const messages = agentSelectors.selectAgentMessages(state, agentId) ?? [];
    const textOf = (m: { content?: unknown }) =>
      Array.isArray(m.content)
        ? (m.content as { type?: string; text?: string }[]).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n")
        : "";
    const system = messages.find((m) => m.role === "system");
    return createAgentRecordScope({
      agent_id: agentId,
      ...(a?.name ? { agent_name: a.name } : {}),
      ...(a?.description ? { agent_description: a.description } : {}),
      ...(agentSelectors.selectAgentCategory(state, agentId) ? { agent_category: String(agentSelectors.selectAgentCategory(state, agentId)) } : {}),
      agent_tags: [...(agentSelectors.selectAgentTags(state, agentId) ?? [])],
      ...(agentSelectors.selectAgentVersion(state, agentId) != null ? { agent_version: Number(agentSelectors.selectAgentVersion(state, agentId)) } : {}),
      ...(a?.agentType ? { agent_type: a.agentType } : {}),
      agent_follows_source: Boolean(a?.followsSource),
      ...(selectAgentModelId(state, agentId) ? { agent_model: String(selectAgentModelId(state, agentId)) } : {}),
      agent_settings: (agentSelectors.selectAgentSettings(state, agentId) ?? {}) as Record<string, unknown>,
      agent_tools: [...(agentSelectors.selectAgentTools(state, agentId) ?? [])],
      agent_custom_tools: [...(agentSelectors.selectAgentCustomTools(state, agentId) ?? [])],
      agent_mcp_servers: [...(agentSelectors.selectAgentMcpServers(state, agentId) ?? [])],
      agent_context_policies: [...(agentSelectors.selectAgentContextPolicies(state, agentId) ?? [])],
      ...(agentSelectors.selectAgentOutputSchema(state, agentId) ? { agent_output_schema: agentSelectors.selectAgentOutputSchema(state, agentId) as unknown as Record<string, unknown> } : {}),
      agent_variable_definitions: [...(agentSelectors.selectAgentVariableDefinitions(state, agentId) ?? [])],
      ...(system ? { agent_system_instruction: textOf(system) } : {}),
      agent_messages: messages.map((m) => ({ role: m.role, text: textOf(m) })),
      ...(agentSelectors.selectAgentChangeNote(state, agentId) ? { agent_change_note: String(agentSelectors.selectAgentChangeNote(state, agentId)) } : {}),
    });
  };

  const getWriteHandlers = () => ({
    reset_to_source: async (value: unknown) => {
      if (value !== true) throw new Error("reset_to_source expects true.");
      const a = selectAgentById(store.getState(), agentId);
      if (!a) throw new Error("The agent has not finished loading yet.");
      if (a.followsSource) throw new Error("This agent already follows its template; there is nothing to reset.");
      if (a.sourceVersion == null) throw new Error("This agent was not made from a template, so there is no latest to reset to.");
      await dispatch(resetAgentToSource(agentId)).unwrap();
    },
  });

  return (
    <SurfaceRuntimeProvider surfaceName={AGENT_RECORD_SURFACE_NAME} getScope={getScope} getWriteHandlers={getWriteHandlers}>
      <AgentViewContent
        agentId={agentId}
        embedded={embedded}
        recordSections={<EntityCustomFields entityToken="agent" recordId={agentId} organizationId={agent?.organizationId ?? undefined} />}
      />
    </SurfaceRuntimeProvider>
  );
}

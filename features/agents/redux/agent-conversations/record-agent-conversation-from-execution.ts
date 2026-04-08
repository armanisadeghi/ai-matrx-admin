import type { RootState } from "@/lib/redux/store";
import type { AgentConversationListItem } from "./agent-conversations.types";
import { agentConversationsCacheKey } from "./agent-conversations.types";
import { upsertAgentConversationInCaches } from "./agent-conversations.slice";

/**
 * Builds a list row from execution context. Uses canonical agx_agent.id for cache keys
 * (version snapshots use parentAgentId).
 */
export function buildAgentConversationListItemFromExecution(
  state: RootState,
  instanceId: string,
  conversationId: string,
  overrides?: Partial<AgentConversationListItem>,
): {
  row: AgentConversationListItem;
  canonicalAgentId: string;
  /** Version-scoped caches to update (in addition to the `::all` list). */
  alsoTouchVersionFilters: number[];
} | null {
  const instance = state.executionInstances.byInstanceId[instanceId];
  if (!instance) return null;

  const agent = state.agentDefinition.agents?.[instance.agentId];
  const canonicalAgentId =
    agent?.parentAgentId ?? agent?.id ?? instance.agentId;

  const hist = state.instanceConversationHistory.byInstanceId[instanceId];
  const now = new Date().toISOString();

  const alsoTouchVersionFilters: number[] =
    agent?.isVersion === true && typeof agent.versionNumber === "number"
      ? [agent.versionNumber]
      : [];

  const row: AgentConversationListItem = {
    conversationId,
    title: overrides?.title ?? hist?.title ?? "",
    description:
      overrides?.description ??
      (hist?.description != null ? hist.description : ""),
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    status: overrides?.status ?? "active",
    messageCount: overrides?.messageCount ?? 1,
    agentVersionNumber:
      overrides?.agentVersionNumber ?? agent?.versionNumber ?? 0,
    initialAgentVersionId:
      overrides?.initialAgentVersionId ??
      (agent?.isVersion === true ? agent.id : ""),
    lastModelId: overrides?.lastModelId ?? agent?.modelId ?? "",
    sourceApp: overrides?.sourceApp ?? instance.sourceApp,
    sourceFeature: overrides?.sourceFeature ?? instance.sourceFeature,
  };

  return { row, canonicalAgentId, alsoTouchVersionFilters };
}

/**
 * Returns a Redux action to merge the new conversation into agentConversations caches
 * (or null if instance is missing). Dispatch from thunks / stream processor.
 */
export function upsertAgentConversationFromExecutionAction(
  state: RootState,
  instanceId: string,
  conversationId: string,
  overrides?: Partial<AgentConversationListItem>,
): ReturnType<typeof upsertAgentConversationInCaches> | null {
  const built = buildAgentConversationListItemFromExecution(
    state,
    instanceId,
    conversationId,
    overrides,
  );
  if (!built) return null;

  const cacheKeys = [
    agentConversationsCacheKey(built.canonicalAgentId, null),
    ...built.alsoTouchVersionFilters.map((v) =>
      agentConversationsCacheKey(built.canonicalAgentId, v),
    ),
  ];

  return upsertAgentConversationInCaches({
    cacheKeys,
    row: built.row,
  });
}

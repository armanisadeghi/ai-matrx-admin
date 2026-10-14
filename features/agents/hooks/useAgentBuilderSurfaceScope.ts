/**
 * Build the agent-level surface scope for `matrx-user/agent-builder`.
 *
 * Returns the agent-definition half of the scope (everything an action that
 * operates on "the agent being edited" needs): identity, system instruction,
 * message templates, model + tiers, tools, custom tools, MCP servers, skills,
 * Matrx actions, context policies, variable definitions, output schema, UI gates,
 * settings, governance/lineage (web state, access, version), the dirty-state
 * tracking, and the full agent serialized as JSON.
 *
 * Callsites merge this with the field-specific `content` they're editing and
 * pass the result as `contextData` to `<UnifiedAgentContextMenu>`. Selection /
 * text_before / text_after come from the menu's own `getTextarea` callback, so
 * this hook does not emit them.
 *
 * Usage:
 *
 *   const buildAgentScope = useAgentBuilderSurfaceScope(agentId);
 *   <UnifiedAgentContextMenu
 *     surfaceName="matrx-user/agent-builder"
 *     contextData={{ ...buildAgentScope(), content: messageText,
 *                    system_instruction: messageText, focused_field: "system_instruction" }}
 *   />
 */

import { useCallback } from "react";

import { useAppStore } from "@ai-matrx/chat/store/hooks";
import { createAgentBuilderScope } from "@ai-matrx/chat/surfaces/manifests/agent-builder.manifest";
import { extractAgentSystemInstruction } from "@ai-matrx/chat/agents/utils/agent-system-instruction";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import type { ChatRootState } from "@ai-matrx/chat/store/root-state";
import {
  selectAgentAccessLevel,
  selectAgentCategory,
  selectAgentChangeNote,
  selectAgentContextPolicies,
  selectAgentCustomTools,
  selectAgentDefinition,
  selectAgentDirtyFields,
  selectAgentIsActive,
  selectAgentIsArchived,
  selectAgentIsDirty,
  selectAgentIsForked,
  selectAgentIsOwner,
  selectAgentIsReadOnly,
  selectAgentIsVersion,
  selectAgentMatrxDirectives,
  selectAgentMcpServers,
  selectAgentMessages,
  selectAgentModelId,
  selectAgentModelTiers,
  selectAgentOutputSchema,
  selectAgentParentAgentId,
  selectAgentSettings,
  selectAgentSkillConfig,
  selectAgentSourceId,
  selectAgentSystemMessage,
  selectAgentTags,
  selectAgentTools,
  selectAgentType,
  selectAgentUiGates,
  selectAgentVariableDefinitions,
  selectAgentVersion,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { readAgentDescription, readAgentName, readAgentView } from "@ai-matrx/chat/agents/identity/agent-identity";
import { agentBuilderTestRun } from "./agentBuilderTestRun";
import {
  buildAgentDefinitionBundle,
  buildTestPanelBundle,
  readAgentAttachments,
  readLastRunRating,
  type AgentAttachments,
  type RunRating,
} from "./agentBuilderContextBundle";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import type { RootState } from "@/lib/redux/store";

/** What the async page scope reads beside the store: attachments and the last run's rating. */
interface ScopeReads {
  attachments: AgentAttachments | null;
  rating: RunRating | null;
}

/**
 * Returns a builder that snapshots the active agent definition from Redux at
 * call time and emits the agent-level portion of the agent-builder surface
 * scope. Reads via the store (not `useAppSelector`) so the returned function
 * is stable and pulls fresh state on each invocation.
 */
export function useAgentBuilderSurfaceScope(
  agentId: string | undefined,
): () => SurfaceScopePayload {
  const store = useAppStore();
  return useCallback(
    () => buildScope(store.getState(), agentId, null),
    [store, agentId],
  );
}

/**
 * The page provider's scope (`SurfaceRuntimeProvider getScope`): the same scope
 * plus what lives outside the store — the agent's resources and term lists and
 * the person's rating of the last test run — read once per send. A failed read
 * is said inside the bundle, never a missing section that reads as "none".
 */
export function useAgentBuilderPageScope(
  agentId: string | undefined,
): () => Promise<SurfaceScopePayload> {
  const store = useAppStore();
  return useCallback(async () => {
    if (!agentId) return createAgentBuilderScope({});
    const state = store.getState();
    const [attachments, rating] = await Promise.all([
      readAgentAttachments(agentId).catch((e: unknown) => ({
        resources: [],
        termLists: [],
        error: `Could not read attachments: ${e instanceof Error ? e.message : String(e)}`,
      })),
      readLastRunRating(state, agentId, selectUserId(state as unknown as RootState)).catch(
        (e: unknown): RunRating => ({
          error: `Could not read the rating: ${e instanceof Error ? e.message : String(e)}`,
          rating: null,
          overall: null,
          scores: {},
          comment: null,
        }),
      ),
    ]);
    return buildScope(store.getState(), agentId, { attachments, rating });
  }, [store, agentId]);
}

function buildScope(
  state: ChatRootState,
  agentId: string | undefined,
  reads: ScopeReads | null,
): SurfaceScopePayload {
  if (!agentId) return createAgentBuilderScope({});
  const definition = selectAgentDefinition(state, agentId);
  const outputSchema = selectAgentOutputSchema(state, agentId);
  const settings = selectAgentSettings(state, agentId);
  const dirtyFields = selectAgentDirtyFields(state, agentId);
  const isOwner = selectAgentIsOwner(state, agentId);

  return createAgentBuilderScope({
    // ── Identity ───────────────────────────────────────────────────────
    agent_id: agentId,
    agent_name: readAgentName(state, agentId) ?? undefined,
    agent_description: readAgentDescription(state, agentId) ?? "",
    agent_type: selectAgentType(state, agentId) ?? undefined,
    agent_category: selectAgentCategory(state, agentId) ?? "",
    agent_tags: selectAgentTags(state, agentId) ?? undefined,

    // ── Definition ─────────────────────────────────────────────────────
    system_instruction: extractAgentSystemInstruction(
      selectAgentSystemMessage(state, agentId),
    ),
    agent_messages: selectAgentMessages(state, agentId) ?? undefined,
    agent_model_id: selectAgentModelId(state, agentId) ?? undefined,
    agent_model_tiers: selectAgentModelTiers(state, agentId) ?? undefined,
    agent_output_schema:
      (outputSchema as Record<string, unknown> | null) ?? undefined,
    agent_settings: (settings as Record<string, unknown> | null) ?? undefined,
    agent_ui_gates: selectAgentUiGates(state, agentId) as Record<
      string,
      unknown
    >,
    agent_json: definition ?? undefined,

    // ── Capabilities ───────────────────────────────────────────────────
    agent_tools: selectAgentTools(state, agentId) ?? undefined,
    agent_custom_tools: selectAgentCustomTools(state, agentId) ?? undefined,
    agent_mcp_servers: selectAgentMcpServers(state, agentId) ?? undefined,
    agent_skill_config: selectAgentSkillConfig(
      state,
      agentId,
    ) as unknown as Record<string, unknown>,
    agent_matrx_actions: selectAgentMatrxDirectives(state, agentId) as Record<
      string,
      unknown
    >,

    // ── Inputs ─────────────────────────────────────────────────────────
    agent_context_policies:
      selectAgentContextPolicies(state, agentId) ?? undefined,
    agent_variable_definitions:
      selectAgentVariableDefinitions(state, agentId) ?? undefined,

    // ── Governance / lineage ───────────────────────────────────────────
    agent_version: selectAgentVersion(state, agentId) ?? undefined,
    agent_is_version: selectAgentIsVersion(state, agentId),
    agent_parent_agent_id:
      selectAgentParentAgentId(state, agentId) ?? undefined,
    agent_change_note: selectAgentChangeNote(state, agentId) ?? undefined,
    agent_source_id: selectAgentSourceId(state, agentId) ?? undefined,
    agent_is_forked: selectAgentIsForked(state, agentId),
    agent_is_active: selectAgentIsActive(state, agentId),
    agent_is_archived: selectAgentIsArchived(state, agentId),
    agent_is_favorite: readAgentView(state, agentId)?.isFavorite ?? false,
    agent_access_level: selectAgentAccessLevel(state, agentId) ?? undefined,
    // `null` = access metadata not fetched yet. Omit rather than lie —
    // the manifest says never infer ownership from its absence.
    agent_is_owner: isOwner ?? undefined,
    agent_is_read_only: selectAgentIsReadOnly(state, agentId),

    // ── Editor state ───────────────────────────────────────────────────
    is_dirty: selectAgentIsDirty(state, agentId),
    dirty_fields: dirtyFields ? Object.keys(dirtyFields) : [],
    // ── Test run (R58): the Side Chat helper sees the person's latest run ──
    ...(agentBuilderTestRun(state, agentId) ?? {}),
    // ── The two bundles the helper reads in full (Arman 2026-10-13) ──
    agent_builder_definition:
      buildAgentDefinitionBundle(state, agentId, reads?.attachments ?? null) ?? undefined,
    agent_builder_test_panel:
      buildTestPanelBundle(state, agentId, reads?.rating ?? null) ?? undefined,
  });
}

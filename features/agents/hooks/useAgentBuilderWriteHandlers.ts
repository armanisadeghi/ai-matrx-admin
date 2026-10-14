"use client";

/**
 * Write handlers for `matrx-user/agent-builder` — the receiving end of the
 * surface's `writeTargets` (declared in
 * `packages/chat/src/surfaces/manifests/agent-builder.manifest.ts`).
 *
 * The helper beside the builder controls the whole page (Arman, 2026-10-13):
 * every part of the definition, the two injection switches, and the test
 * panel's next send. Three rules keep it safe, enforced here rather than
 * trusted to the caller:
 *
 *  1. EVERY handler validates and THROWS on a bad shape. The writeback seam
 *     (`applySurfaceWrite`) converts a throw into a loud, captured error
 *     envelope the agent reads back — a wrong value is the agent's error to
 *     hear about, never something we silently coerce into the editor.
 *  2. Nothing bypasses the canonical edit path. Each target dispatches the
 *     exact action the builder's own control dispatches (the System Prompt
 *     textarea's `withAgentSystemInstruction` + `setAgentMessages`, the
 *     settings form's `setAgentField`/`setAgentSettings`, the switches'
 *     thunks, the composer's `setUserVariableValues`/`setUserInputText`).
 *  3. Read-only records refuse. Staging edits into an agent the user cannot
 *     save would look like it worked and then silently evaporate.
 *
 * Definition targets are `mode: "draft"` (staged, the person saves); the two
 * switches persist on flip exactly like the UI switch; the test-panel targets
 * change only what the next Send submits and run nothing.
 *
 * Registered by `AgentBuilderClient` on its `SurfaceRuntimeProvider`
 * (`getWriteHandlers`), so the targets are wired for the whole builder route —
 * desktop and mobile, whichever panel or tab happens to be open.
 */

import { useCallback } from "react";

import { useAppDispatch, useAppStore } from "@ai-matrx/chat/store/hooks";
import {
  selectAgentAccessResolved,
  selectAgentById,
  selectAgentIsReadOnly,
  selectAgentMessages,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import {
  setAgentContextPolicies,
  setAgentCustomTools,
  setAgentField,
  setAgentMcpServers,
  setAgentModelTiers,
  setAgentSkillConfig,
  setAgentMessages,
  setAgentOutputSchema,
  setAgentSettings,
  setAgentTools,
  setAgentVariableDefinitions,
} from "@/features/agents/redux/agent-builder.slice";
import { setAgentAutoToolsDisabled } from "@/features/agents/redux/auto-tools.thunks";
import { setAgentAutoContextDisabled } from "@/features/agents/redux/builder-tier.thunks";
import { withOfferingPin } from "@/features/ai-models/utils/offering-pin";
import { selectAllModels, selectModelById } from "@ai-matrx/agents/models";
import { readModelRecords } from "@ai-matrx/chat/agents/identity/model-catalog";
import {
  clearUserVariableValue,
  setUserVariableValues,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { selectUserVariableValues } from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { setUserInputText } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import type { AgentDefinitionMessage } from "@ai-matrx/chat/agents/types/agent-message-types";
import { nextSendConversationId } from "./agentBuilderContextBundle";
import { withAgentSystemInstruction } from "@ai-matrx/chat/agents/utils/agent-system-instruction";
import type { AgentDefinition } from "@ai-matrx/chat/agents/types/agent-definition.types";
import type { ChatRootState } from "@ai-matrx/chat/store/root-state";

/** The test panel's composer conversation — or a throw when the panel has not started. */
function requireTestConversation(state: ChatRootState, agentId: string): string {
  const id = nextSendConversationId(state, agentId);
  if (!id) throw new Error("The test panel has not started yet — open the Test view and try again.");
  return id;
}

/** A non-empty string, trimmed — or a throw naming the target. */
function requireText(value: unknown, target: string): string {
  if (typeof value !== "string") {
    throw new Error(`${target} expects a string value.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${target} expects a non-empty string.`);
  }
  return trimmed;
}

/**
 * Refuse before staging anything the user could never save. `accessResolved`
 * gates the check: while access metadata is still in flight `isReadOnly` reads
 * `false` for everyone, so we only refuse once we actually know.
 */
function requireEditableAgent(state: ChatRootState, agentId: string) {
  const record = selectAgentById(state, agentId);
  if (!record) {
    throw new Error(
      "The agent being edited has not finished loading — try again in a moment.",
    );
  }
  if (record.isVersion) {
    throw new Error(
      "This is a published version snapshot, which is read-only. Open the live agent to change it.",
    );
  }
  if (
    selectAgentAccessResolved(state, agentId) &&
    selectAgentIsReadOnly(state, agentId)
  ) {
    throw new Error(
      "This agent is shared with you as view-only, so changes cannot be saved here.",
    );
  }
  return record;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** An array of plain objects that each carry a non-empty string `field` — or a throw naming the target. */
function requireNamedObjects(value: unknown, target: string, field: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`${target} expects an array (pass [] to clear).`);
  const seen = new Set<string>();
  return value.map((entry, index) => {
    if (!isRecord(entry) || typeof entry[field] !== "string" || !(entry[field] as string).trim()) {
      throw new Error(`${target}[${index}] must be an object with a non-empty "${field}".`);
    }
    const key = (entry[field] as string).trim();
    if (seen.has(key)) throw new Error(`${target} has "${key}" twice.`);
    seen.add(key);
    return { ...entry, [field]: key };
  });
}

function requireBoolean(value: unknown, target: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${target} expects true or false.`);
  return value;
}

/**
 * Returns the `getWriteHandlers` callback for the agent-builder surface.
 *
 * Reads through the store rather than `useAppSelector` for the same reason
 * `useAgentBuilderSurfaceScope` does: the builder must not re-render on every
 * keystroke of the agent it is editing, and a handler invoked at apply time
 * needs the state as it is THEN, not as it was at the last render.
 */
export function useAgentBuilderWriteHandlers(
  agentId: string,
): () => Record<string, (value: unknown) => void | Promise<void>> {
  const store = useAppStore();
  const dispatch = useAppDispatch();

  return useCallback(() => {
    /** Stage a single agent-definition field the way the user's own edit does. */
    const patchField = <K extends keyof AgentDefinition>(
      field: K,
      value: AgentDefinition[K],
    ) => {
      requireEditableAgent(store.getState(), agentId);
      dispatch(setAgentField({ id: agentId, field, value }));
    };

    /**
     * Stage new system-prompt text through the SAME helper + action the System
     * Prompt textarea uses, so non-text blocks survive and the editor shows the
     * change immediately whether or not that component is currently mounted.
     */
    const setSystemInstruction = (text: string) => {
      const state = store.getState();
      requireEditableAgent(state, agentId);
      const messages = selectAgentMessages(state, agentId);
      if (!messages) {
        throw new Error(
          "The agent's messages have not finished loading — try again in a moment.",
        );
      }
      dispatch(
        setAgentMessages({
          id: agentId,
          messages: withAgentSystemInstruction(messages, text),
        }),
      );
    };

    return {
      system_instruction: (value: unknown) => {
        setSystemInstruction(requireText(value, "system_instruction"));
      },

      agent_description: (value: unknown) => {
        patchField("description", requireText(value, "agent_description"));
      },

      agent_name: (value: unknown) => {
        patchField("name", requireText(value, "agent_name"));
      },

      agent_category: (value: unknown) => {
        patchField("category", requireText(value, "agent_category"));
      },

      agent_tags: (value: unknown) => {
        // Full replacement, empty array allowed (that is how tags get cleared).
        // Tags are free text — there is no vocabulary constant to check
        // against, so shape is all we can honestly enforce.
        if (!Array.isArray(value)) {
          throw new Error(
            "agent_tags expects an array of tag strings (pass [] to clear all tags).",
          );
        }
        const tags = value.map((entry, index) => {
          if (typeof entry !== "string" || !entry.trim()) {
            throw new Error(
              `agent_tags[${index}] must be a non-empty string; got ${JSON.stringify(entry)}.`,
            );
          }
          return entry.trim();
        });
        patchField("tags", tags);
      },

      agent_message: (value: unknown) => {
        // One template after the system message: replace text, append, or remove.
        if (!isRecord(value) || typeof value.index !== "number" || !Number.isInteger(value.index)) {
          throw new Error("agent_message expects {index, text, role?} or {index, remove: true}.");
        }
        const state = store.getState();
        requireEditableAgent(state, agentId);
        const messages = selectAgentMessages(state, agentId);
        if (!messages) throw new Error("The agent's messages have not finished loading — try again in a moment.");
        const index = value.index;
        if (messages[index]?.role === "system") {
          throw new Error(`Index ${index} is the system message — write system_instruction instead.`);
        }
        if (index < 0 || index > messages.length) {
          throw new Error(`agent_message index must be 0–${messages.length} (${messages.length} appends).`);
        }
        const role = value.role;
        if (role !== undefined && role !== "user" && role !== "assistant") {
          throw new Error('agent_message role must be "user" or "assistant".');
        }
        const next = [...messages];
        if (value.remove === true) {
          if (index === messages.length) throw new Error(`There is no message at index ${index} to remove.`);
          next.splice(index, 1);
        } else {
          const text = typeof value.text === "string" ? value.text : null;
          if (text === null) throw new Error("agent_message expects a text string.");
          if (index === messages.length) {
            if (!role) throw new Error('A new message needs a role: "user" or "assistant".');
            next.push({ role, content: [{ type: "text", text }] } as AgentDefinitionMessage);
          } else {
            const current = messages[index];
            const kept = (current.content ?? []).filter((b) => (b as { type?: string }).type !== "text");
            next[index] = {
              ...current,
              ...(role ? { role } : {}),
              content: [{ type: "text", text }, ...kept],
            } as AgentDefinitionMessage;
          }
        }
        dispatch(setAgentMessages({ id: agentId, messages: next }));
      },

      agent_model_id: (value: unknown) => {
        const modelId = requireText(value, "agent_model_id");
        const state = store.getState();
        const record = requireEditableAgent(state, agentId);
        const models = readModelRecords();
        if (selectAllModels(models).length > 0 && !selectModelById(models, modelId)) {
          throw new Error(`No model with id ${modelId} in the model catalog.`);
        }
        dispatch(setAgentField({ id: agentId, field: "modelId", value: modelId }));
        // A pinned class belongs to the old model — never carry it to the new one.
        if (isRecord(record.settings) && record.settings.offering_id != null) {
          dispatch(setAgentSettings({ id: agentId, settings: withOfferingPin(record.settings, undefined) }));
        }
      },

      agent_settings: (value: unknown) => {
        if (!isRecord(value)) throw new Error("agent_settings expects an object of setting → value (null removes one).");
        const record = requireEditableAgent(store.getState(), agentId);
        const next: Record<string, unknown> = { ...(record.settings ?? {}) };
        for (const [key, v] of Object.entries(value)) {
          if (v === null) delete next[key];
          else next[key] = v;
        }
        dispatch(setAgentSettings({ id: agentId, settings: next as AgentDefinition["settings"] }));
      },

      agent_output_schema: (value: unknown) => {
        if (value !== null && !isRecord(value)) {
          throw new Error("agent_output_schema expects a JSON Schema object, or null for free text.");
        }
        requireEditableAgent(store.getState(), agentId);
        dispatch(
          setAgentOutputSchema({ id: agentId, outputSchema: value as AgentDefinition["outputSchema"] }),
        );
      },

      agent_variable_definitions: (value: unknown) => {
        const defs = requireNamedObjects(value, "agent_variable_definitions", "name").map((d) => ({
          ...d,
          defaultValue: d.defaultValue ?? "",
        }));
        requireEditableAgent(store.getState(), agentId);
        dispatch(
          setAgentVariableDefinitions({
            id: agentId,
            variableDefinitions: defs as unknown as AgentDefinition["variableDefinitions"],
          }),
        );
      },

      agent_context_policies: (value: unknown) => {
        const policies = requireNamedObjects(value, "agent_context_policies", "key");
        requireEditableAgent(store.getState(), agentId);
        dispatch(
          setAgentContextPolicies({
            id: agentId,
            contextPolicies: policies as unknown as AgentDefinition["contextPolicies"],
          }),
        );
      },

      agent_tools: (value: unknown) => {
        if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) {
          throw new Error("agent_tools expects an array of tool UUID strings (pass [] for no tools).");
        }
        requireEditableAgent(store.getState(), agentId);
        dispatch(setAgentTools({ id: agentId, tools: [...new Set(value.map((id: string) => id.trim()))] }));
      },

      agent_custom_tools: (value: unknown) => {
        const tools = requireNamedObjects(value, "agent_custom_tools", "name");
        requireEditableAgent(store.getState(), agentId);
        dispatch(setAgentCustomTools({ id: agentId, customTools: tools as unknown as AgentDefinition["customTools"] }));
      },

      agent_mcp_servers: (value: unknown) => {
        if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) {
          throw new Error("agent_mcp_servers expects an array of MCP server UUID strings (pass [] for none).");
        }
        requireEditableAgent(store.getState(), agentId);
        dispatch(setAgentMcpServers({ id: agentId, mcpServers: [...new Set(value.map((id: string) => id.trim()))] }));
      },

      agent_skill_config: (value: unknown) => {
        if (!isRecord(value)) throw new Error("agent_skill_config expects {included?, listed?, forbidden?, disabled?}.");
        const record = requireEditableAgent(store.getState(), agentId);
        const next = { ...(record.skillConfig ?? {}) } as Record<string, unknown>;
        for (const key of ["included", "listed", "forbidden"] as const) {
          if (key in value) {
            const list = value[key];
            if (!Array.isArray(list) || list.some((id) => typeof id !== "string")) {
              throw new Error(`agent_skill_config.${key} must be an array of skill id strings.`);
            }
            next[key] = list;
          }
        }
        if ("disabled" in value) next.disabled = requireBoolean(value.disabled, "agent_skill_config.disabled");
        dispatch(setAgentSkillConfig({ id: agentId, skillConfig: next as unknown as AgentDefinition["skillConfig"] }));
      },

      agent_model_tiers: (value: unknown) => {
        if (value !== null && (!isRecord(value) || typeof value.default !== "string")) {
          throw new Error("agent_model_tiers expects {default, flexible?, tiers?} or null for a single model.");
        }
        requireEditableAgent(store.getState(), agentId);
        dispatch(setAgentModelTiers({ id: agentId, modelTiers: value as AgentDefinition["modelTiers"] }));
      },

      agent_tool_injection: async (value: unknown) => {
        const on = requireBoolean(value, "agent_tool_injection");
        requireEditableAgent(store.getState(), agentId);
        // Persists like the switch; a refused save is the agent's error to hear.
        await dispatch(setAgentAutoToolsDisabled({ agentId, disabled: !on })).unwrap();
      },

      agent_context_injection: async (value: unknown) => {
        const on = requireBoolean(value, "agent_context_injection");
        requireEditableAgent(store.getState(), agentId);
        await dispatch(setAgentAutoContextDisabled({ agentId, disabled: !on })).unwrap();
      },

      test_variable_values: (value: unknown) => {
        if (!isRecord(value)) throw new Error("test_variable_values expects an object of variable name → value.");
        const conversationId = requireTestConversation(store.getState(), agentId);
        const set: Record<string, unknown> = {};
        for (const [name, v] of Object.entries(value)) {
          if (v === null) dispatch(clearUserVariableValue({ conversationId, name }));
          else set[name] = v;
        }
        if (Object.keys(set).length > 0) dispatch(setUserVariableValues({ conversationId, values: set }));
      },

      test_user_input: (value: unknown) => {
        if (typeof value !== "string") throw new Error("test_user_input expects a string (\"\" clears it).");
        const state = store.getState();
        const conversationId = requireTestConversation(state, agentId);
        dispatch(
          setUserInputText({
            conversationId,
            text: value,
            userValues: selectUserVariableValues(conversationId)(state),
          }),
        );
      },
    };
  }, [store, dispatch, agentId]);
}

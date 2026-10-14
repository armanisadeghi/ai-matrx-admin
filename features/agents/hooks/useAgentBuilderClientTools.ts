"use client";

/**
 * Handlers for the Agent Builder's page tools (`matrx-user/agent-builder`
 * manifest `clientTools`): reads too large or too rare to ride every turn, and
 * the test-case library. Mounted once on the builder route (AgentBuilderClient,
 * AgentStudioPage) inside the surface provider.
 *
 * Every handler answers `{ ok: true, … }` or `{ ok: false, error }` — the
 * agent reads a refusal, never a silent empty.
 */

import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { useSurfaceClientTools } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { AGENT_BUILDER_CONTEXT_MENU_PROPS } from "@ai-matrx/chat/agents/agent-context/buildAgentBuilderContextData";
import { selectAgentDefinition } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { selectVariablesForRequest, selectVariablesTheRunUsed } from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectUserInputText } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import {
  extractFlatText,
  selectConversationMessages,
} from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { requestModelView } from "@/features/agents/components/model-view/requestModelView";
import {
  fetchAgentContractHead,
  fetchAgentSamples,
  sampleFreshness,
  sampleInputText,
} from "@/features/agents/samples/service";
import { applySampleToComposer } from "@/features/agents/samples/apply-sample";
import {
  lastRunConversationId,
  nextSendConversationId,
  readAgentAttachments,
} from "./agentBuilderContextBundle";

const fail = (error: string) => ({ ok: false as const, error });
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useAgentBuilderClientTools(agentId: string): void {
  const store = useAppStore();
  const dispatch = useAppDispatch() as AppDispatch;
  const state = () => store.getState() as RootState;

  useSurfaceClientTools(AGENT_BUILDER_CONTEXT_MENU_PROPS.surfaceName, {
    agent_builder_read_definition: async () => {
      const definition = selectAgentDefinition(state() as never, agentId);
      if (!definition) return fail("The agent has not finished loading.");
      const attachments = await readAgentAttachments(agentId).catch((e: unknown) => ({ error: message(e) }));
      return { ok: true, definition, attachments };
    },

    agent_builder_model_view: async () => {
      const conversationId = nextSendConversationId(state() as never, agentId);
      if (!conversationId) return fail("The test panel has not started yet.");
      try {
        const preview = await requestModelView(dispatch, state, conversationId, agentId);
        return { ok: true, model_view: preview };
      } catch (e: unknown) {
        return fail(message(e));
      }
    },

    agent_builder_test_cases: async (input: unknown) => {
      const { action, test_case_id } = (input ?? {}) as { action?: string; test_case_id?: string };
      try {
        const [rows, head] = await Promise.all([fetchAgentSamples(agentId), fetchAgentContractHead(agentId)]);
        if (action === "load") {
          const sample = rows.find((r) => r.id === test_case_id);
          if (!sample) return fail(`No test case with id ${String(test_case_id)}.`);
          const conversationId = nextSendConversationId(state() as never, agentId);
          if (!conversationId) return fail("The test panel has not started yet.");
          const unattached = dispatch(applySampleToComposer({ conversationId, sample }));
          return {
            ok: true,
            loaded: sample.label,
            note: "Loaded into the next send. Nothing was run.",
            ...(unattached.length ? { parts_without_a_chip: unattached.length } : {}),
          };
        }
        return {
          ok: true,
          test_cases: rows.map((r) => ({
            id: r.id,
            name: r.label,
            status: r.status,
            freshness: sampleFreshness(r, head),
            typed_text: sampleInputText(r),
            variables: r.variables,
            has_reference_output: Boolean(r.reference_output),
          })),
        };
      } catch (e: unknown) {
        return fail(message(e));
      }
    },

    agent_builder_read_test_value: (input: unknown) => {
      const { part, variable, turn } = (input ?? {}) as { part?: string; variable?: string; turn?: number };
      const s = state() as never;
      const conversationId =
        part === "last_run" ? lastRunConversationId(s, agentId) : nextSendConversationId(s, agentId);
      if (!conversationId) return fail(part === "last_run" ? "No run yet in this panel." : "The test panel has not started yet.");
      if (variable) {
        const values =
          part === "last_run"
            ? selectVariablesTheRunUsed(conversationId)(s)
            : selectVariablesForRequest(conversationId)(s);
        if (!(variable in values)) return fail(`No variable "${variable}" in the ${part ?? "next_send"}.`);
        return { ok: true, variable, value: values[variable] };
      }
      if (part === "last_run") {
        const turns = selectConversationMessages(conversationId)(s)
          .filter((m) => m.isVisibleToUser !== false && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({ role: m.role, text: extractFlatText(m).trim() }))
          .filter((m) => m.text !== "");
        if (typeof turn === "number") {
          const one = turns[turn];
          return one ? { ok: true, turn, ...one } : fail(`No turn ${turn}; the run has ${turns.length}.`);
        }
        return { ok: true, turns };
      }
      return { ok: true, typed_text: selectUserInputText(conversationId)(s) };
    },
  });
}

/** Mount inside the builder's `SurfaceRuntimeProvider` so the tools register on that surface. */
export function AgentBuilderClientTools({ agentId }: { agentId: string }): null {
  useAgentBuilderClientTools(agentId);
  return null;
}

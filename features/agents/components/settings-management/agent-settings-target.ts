/**
 * THE agent builder's settings write target — the agent definition seen through
 * `SettingsWriteTarget` (`@ai-matrx/agents/settings`), so THE model-settings panel
 * (`ModelSettingsPanel`) the chat's "Model and overrides" renders also edits an agent here
 * (owner, 2026-10-21: one settings experience; only the write target differs).
 *
 * The builder's own rules live here and nowhere else:
 *   - a row reads through `describeSetting` (the same projection the Raw tabs use), so a row
 *     can never show a value the JSON views do not;
 *   - `response_format` stores the canonical `{ type }`, and an agent with an output schema
 *     never stores one at all (the schema is its one output contract);
 *   - THE AUTO RULE: a choice that IS "not set" removes the key;
 *   - no write silently rewrites a DIFFERENT setting — couplings surface as issues with a fix;
 *   - clearing the voice clears its multi-speaker flag with it;
 *   - a control may become a run input (bind) and back (unbind), one undo step each.
 * There is no reset-to-inherited: an agent inherits nothing.
 */

import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import {
  isUnsetChoice,
  startingValueFor,
  withSettingState,
  type CapabilitiesWriteTarget,
  type ControlDefinition,
  type SettingRowRead,
  type SettingsWriteTarget,
  type UiGates,
} from "@ai-matrx/agents/settings";
import type { NormalizedControls } from "@ai-matrx/chat/agents/hooks/useModelControls";
import type { FeLlmParams, LLMParams } from "@ai-matrx/chat/agents/types/agent-api-types";
import type { VariableDefinition } from "@ai-matrx/chat/agents/types/agent-definition.types";
import {
  bindControlToVariable,
  isControlBindable,
  unbindControlVariable,
  type ControlBindablePolicy,
} from "@ai-matrx/chat/agents/utils/control-variables";
import {
  setAgentControlBinding,
  setAgentSettings,
  setAgentUiGates,
} from "@/features/agents/redux/agent-builder.slice";
import { describeSetting } from "./settings-document";
import { applyFixForIssue, canFixIssue } from "./validation/apply-fix";
import type { ValidationIssue } from "./validation/types";

type ResponseFormat = NonNullable<FeLlmParams["response_format"]>;

/** The canonical `{ type }` the API expects from a bare choice; unknown → null (ignored). */
function toResponseFormat(value: string): ResponseFormat | null {
  switch (value) {
    case "text":
      return { type: "text" };
    case "json_object":
      return { type: "json_object" };
    case "json_schema":
      return { type: "json_schema" };
    default:
      return null;
  }
}

/** The control emits `{ type }` for response_format; the builder validates the bare string. */
function unwrapResponseFormat(key: string, value: unknown): unknown {
  return key === "response_format" &&
    typeof value === "object" &&
    value !== null &&
    "type" in (value as Record<string, unknown>)
    ? (value as Record<string, unknown>).type
    : value;
}

export interface AgentSettingsTargetInput {
  agentId: string;
  dispatch: Dispatch<UnknownAction>;
  /** The hydrated agent settings (never the pre-hydration null). */
  settings: FeLlmParams;
  variableDefinitions: readonly VariableDefinition[] | null | undefined;
  outputSchema: unknown;
  bindablePolicy: ControlBindablePolicy;
  issuesByKey: Readonly<Record<string, readonly ValidationIssue[]>>;
  allIssues: readonly ValidationIssue[];
  normalizedControls: NormalizedControls | null;
}

export function agentSettingsTarget(input: AgentSettingsTargetInput): SettingsWriteTarget {
  const { agentId, dispatch, settings, variableDefinitions, outputSchema, bindablePolicy, normalizedControls } = input;
  const record = settings as Record<string, unknown>;
  const write = (next: Record<string, unknown>) =>
    dispatch(setAgentSettings({ id: agentId, settings: next as LLMParams }));

  return {
    read(key: string, control: ControlDefinition | null): SettingRowRead {
      const view = describeSetting(key, { settings: record, variableDefinitions: variableDefinitions ?? [] }, control);
      const first = input.issuesByKey[key]?.[0];
      const issue = first ? { message: first.message, fixable: canFixIssue(first, normalizedControls) } : undefined;
      const facts = issue ? { issue } : {};
      if (view.state === "bound") return { state: "bound", variableName: view.variableName, value: view.value, ...facts };
      if (view.state === "set") return { state: "set", value: view.value, ...facts };
      if (view.state === "default") return { state: "unset", modelDefault: view.value, ...facts };
      return { state: "unset", ...facts };
    },

    change(key: string, emitted: unknown) {
      const value = unwrapResponseFormat(key, emitted);
      if (key === "response_format" && typeof value === "string") {
        if (outputSchema != null) {
          // One output contract: the schema. Never store a response_format beside it.
          const { response_format: _legacy, ...rest } = record;
          write(rest);
          return;
        }
        const response_format = toResponseFormat(value);
        if (response_format) write({ ...record, response_format });
        return;
      }
      // One meaning per state (F-b): a choice that IS "not set" removes the key.
      if (isUnsetChoice(key, value)) {
        write(withSettingState(record, key, "unset", null));
        return;
      }
      write({ ...record, [key]: value });
    },

    // One choice over several keys (the Voice row's voice + multi-speaker flag): one write.
    changeMany(changes: Record<string, unknown>) {
      write({ ...record, ...changes });
    },

    turnOn(key: string, control: ControlDefinition) {
      const start = startingValueFor(key, control);
      if (start !== undefined) write({ ...record, [key]: start });
    },

    clear(key: string) {
      const { [key]: _removed, ...rest } = record;
      // The voice's multi-speaker flag lives and dies with it.
      if (key === "tts_voice") delete rest.multi_speaker;
      write(rest);
    },

    fix(key: string) {
      const issue = input.allIssues.find((i) => i.key === key);
      if (!issue) return;
      dispatch(setAgentSettings({ id: agentId, settings: applyFixForIssue(issue, settings, normalizedControls) }));
    },

    canBind: (key: string) => isControlBindable(key, bindablePolicy),

    bind(key: string, control: ControlDefinition) {
      const next = bindControlToVariable({ key, control, settings: record, variableDefinitions: [...(variableDefinitions ?? [])] });
      dispatch(setAgentControlBinding({ id: agentId, settings: next.settings as LLMParams, variableDefinitions: next.variableDefinitions }));
    },

    unbind(key: string, control: ControlDefinition | null) {
      const next = unbindControlVariable({ key, control, settings: record, variableDefinitions: [...(variableDefinitions ?? [])] });
      dispatch(setAgentControlBinding({ id: agentId, settings: next.settings as LLMParams, variableDefinitions: next.variableDefinitions }));
    },
  };
}

/** The agent's input capabilities: written to `agent.uiGates`, never to settings. */
export function agentCapabilitiesTarget(
  agentId: string,
  uiGates: UiGates,
  dispatch: Dispatch<UnknownAction>,
): CapabilitiesWriteTarget {
  return {
    values: uiGates,
    change(key, value) {
      dispatch(setAgentUiGates({ id: agentId, uiGates: { ...uiGates, [key]: value } }));
    },
  };
}

/**
 * Code-editor agent registry.
 *
 * Single source of truth for the three system agents that back the
 * code-editing surfaces. The IDs match `agx_agent` rows; `codeVariableKey`
 * is the agent's variable that receives the editor's current code on the
 * first turn (read directly off the agent's `variable_definitions`).
 *
 * These same UUIDs were the prompt-builtin IDs in the legacy system, so
 * any caller that already had a hardcoded UUID is correct without remap.
 */
import type { CodeEditorAgentConfig } from "./types";

export const PROMPT_APP_UI_EDITOR_AGENT: CodeEditorAgentConfig = {
  id: "c1c1f092-ba0d-4d6c-b352-b22fe6c48272",
  name: "Prompt App Code Editor",
  codeVariableKey: "current_code",
};

export const GENERIC_CODE_EDITOR_AGENT: CodeEditorAgentConfig = {
  id: "87efa869-9c11-43cf-b3a8-5b7c775ee415",
  name: "Code Editor",
  codeVariableKey: "current_code",
};

export const DYNAMIC_CONTEXT_CODE_EDITOR_AGENT: CodeEditorAgentConfig = {
  id: "970856c5-3b9d-4034-ac9d-8d8a11fb3dba",
  name: "Code Editor (Dynamic Context)",
  codeVariableKey: "dynamic_context",
};

/** Default picker roster: prompt-app first when invoked from a prompt-app. */
export const PROMPT_APP_AGENT_PICKER: CodeEditorAgentConfig[] = [
  PROMPT_APP_UI_EDITOR_AGENT,
  GENERIC_CODE_EDITOR_AGENT,
];

/** Default picker roster: generic first when invoked from a generic editor. */
export const GENERIC_AGENT_PICKER: CodeEditorAgentConfig[] = [
  GENERIC_CODE_EDITOR_AGENT,
  PROMPT_APP_UI_EDITOR_AGENT,
];

/**
 * Lookup by legacy `promptKey` (e.g. "prompt-app-ui-editor") OR by raw UUID.
 * Old call sites passed a key string; some passed the agent UUID directly via
 * `getBuiltinId(...)`. Both shapes are handled here so the migration is a
 * one-line swap regardless of source.
 *
 * Falls back to the generic agent for unknown values.
 */
export function agentForPromptKey(
  keyOrId: string | undefined,
): CodeEditorAgentConfig {
  switch (keyOrId) {
    case "prompt-app-ui-editor":
    case PROMPT_APP_UI_EDITOR_AGENT.id:
      return PROMPT_APP_UI_EDITOR_AGENT;
    case "code-editor-dynamic-context":
    case DYNAMIC_CONTEXT_CODE_EDITOR_AGENT.id:
      return DYNAMIC_CONTEXT_CODE_EDITOR_AGENT;
    case "generic-code-editor":
    case GENERIC_CODE_EDITOR_AGENT.id:
    default:
      return GENERIC_CODE_EDITOR_AGENT;
  }
}

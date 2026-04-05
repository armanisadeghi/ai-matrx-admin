/**
 * Launch Agent Execution — Orchestrator Thunk
 *
 * The universal entry point for running any agent from any trigger.
 * Equivalent to the old `openPromptExecution` thunk but built on the
 * new agent execution system with V2 stream events and full source tracking.
 *
 * Three trigger paths:
 *   1. Known agent (agentId) → createManualInstance → execute
 *   2. Shortcut → agent → createInstanceFromShortcut → execute
 *   3. Manual / no-agent → createManualInstanceNoAgent → execute
 *
 * Display routing:
 *   - Interactive (modal-full, modal-compact, sidebar, flexible-panel,
 *     panel, chat-bubble) → create instance, return instanceId, caller renders UI
 *   - Inline → execute first, poll, return result with callbacks
 *   - Toast → execute, return instanceId (toast component subscribes)
 *   - Direct / background → execute, poll, call onComplete, no UI
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { LLMParams } from "@/features/agents/types/agent-api-types";
import type {
  ResultDisplayMode,
  SourceFeature,
} from "@/features/agents/types/instance.types";
import type { ApplicationScope } from "@/features/agents/utils/scope-mapping";
import { mapScopeToInstance } from "@/features/agents/utils/scope-mapping";
import {
  createManualInstance,
  createInstanceFromShortcut,
  createManualInstanceNoAgent,
} from "./create-instance.thunk";
import { executeInstance } from "./execute-instance.thunk";
import { executeChatInstance } from "./execute-chat-instance.thunk";
import { setUserVariableValues } from "../instance-variable-values/instance-variable-values.slice";
import { setContextEntries } from "../instance-context/instance-context.slice";
import { setUserInputText } from "../instance-user-input/instance-user-input.slice";
import { setDisplayMode as setDisplayModeAction } from "../instance-ui-state/instance-ui-state.slice";
import { selectRequest } from "../active-requests/active-requests.selectors";

// =============================================================================
// Types
// =============================================================================

export interface LaunchAgentOptions {
  agentId?: string;
  shortcutId?: string;
  manual?: { label?: string; baseSettings?: Partial<LLMParams> };

  sourceFeature: SourceFeature;

  applicationScope?: ApplicationScope;

  displayMode?: ResultDisplayMode;
  autoRun?: boolean;
  allowChat?: boolean;
  showVariables?: boolean;
  usePreExecutionInput?: boolean;

  /** When true, conversation history is wiped after each submit (builder/test mode). */
  autoClearConversation?: boolean;
  /** Conversation mode — "chat" (client-owned) or "agent" (server-owned). */
  conversationMode?: "agent" | "conversation" | "chat";

  userInput?: string;
  variables?: Record<string, unknown>;
  overrides?: Partial<LLMParams>;

  useChat?: boolean;

  onComplete?: (result: LaunchResult) => void;
  onTextReplace?: (text: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;
  originalText?: string;
}

export interface LaunchResult {
  instanceId: string;
  requestId?: string;
  conversationId?: string | null;
  responseText?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const INTERACTIVE_MODES: ReadonlySet<ResultDisplayMode> = new Set([
  "modal-full",
  "modal-compact",
  "sidebar",
  "flexible-panel",
  "panel",
  "chat-bubble",
]);

function isInteractive(mode: ResultDisplayMode): boolean {
  return INTERACTIVE_MODES.has(mode);
}

async function pollForCompletion(
  getState: () => unknown,
  requestId: string,
  timeoutMs = 300_000,
  intervalMs = 150,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = getState() as RootState;
    const request = selectRequest(requestId)(state);
    if (
      request &&
      (request.status === "complete" || request.status === "error")
    ) {
      if (request.textChunks.length > 0) return request.textChunks.join("");
      return request.accumulatedText || "";
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return "";
}

// =============================================================================
// Orchestrator Thunk
// =============================================================================

export const launchAgentExecution = createAsyncThunk<
  LaunchResult,
  LaunchAgentOptions
>("instances/launch", async (options, { dispatch, getState }) => {
  const {
    agentId,
    shortcutId,
    manual,
    sourceFeature,
    applicationScope,
    displayMode: displayModeOverride,
    autoRun = true,
    allowChat,
    showVariables,
    autoClearConversation,
    conversationMode,
    userInput,
    variables,
    useChat = false,
    onComplete,
  } = options;

  let instanceId: string;
  let resolvedDisplayMode: ResultDisplayMode =
    displayModeOverride ?? "modal-full";

  // =========================================================================
  // Step 1: Route by trigger type and create instance
  // =========================================================================

  if (shortcutId) {
    // Path 2: Shortcut → Agent
    const state = getState() as RootState;
    const shortcut = state.agentShortcut[shortcutId];

    if (!shortcut) {
      throw new Error(`Shortcut ${shortcutId} not found in Redux`);
    }

    resolvedDisplayMode =
      displayModeOverride ??
      (shortcut.resultDisplay as ResultDisplayMode) ??
      "modal-full";

    instanceId = await dispatch(
      createInstanceFromShortcut({
        shortcutId,
        uiScopes: applicationScope ?? {},
        sourceFeature,
        displayMode: resolvedDisplayMode,
        allowChat: allowChat ?? shortcut.allowChat,
        showVariables: showVariables ?? shortcut.showVariables,
      }),
    ).unwrap();

    // Apply user-provided variables on top of scope-mapped values
    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ instanceId, values: variables }));
    }
  } else if (agentId) {
    // Path 1: Known agent
    instanceId = await dispatch(
      createManualInstance({
        agentId,
        sourceFeature,
        autoClearConversation,
        mode: conversationMode,
      }),
    ).unwrap();

    // Apply scope data if provided
    if (applicationScope) {
      const agState = getState() as RootState;
      const agent = agState.agentDefinition.agents?.[agentId];
      if (agent) {
        const { variableValues, contextEntries } = mapScopeToInstance(
          applicationScope,
          null,
          agent.variableDefinitions ?? [],
          agent.contextSlots ?? [],
        );
        if (Object.keys(variableValues).length > 0) {
          dispatch(
            setUserVariableValues({ instanceId, values: variableValues }),
          );
        }
        if (contextEntries.length > 0) {
          dispatch(setContextEntries({ instanceId, entries: contextEntries }));
        }
      }
    }

    // Apply explicit variable overrides
    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ instanceId, values: variables }));
    }

    if (displayModeOverride) {
      dispatch(setDisplayModeAction({ instanceId, mode: resolvedDisplayMode }));
    }
  } else {
    // Path 3: Manual / no-agent chat
    instanceId = await dispatch(
      createManualInstanceNoAgent({
        label: manual?.label,
        baseSettings: manual?.baseSettings,
        sourceFeature,
      }),
    ).unwrap();

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ instanceId, values: variables }));
    }

    if (displayModeOverride) {
      dispatch(setDisplayModeAction({ instanceId, mode: resolvedDisplayMode }));
    }
  }

  // =========================================================================
  // Step 2: Set user input if provided
  // =========================================================================

  if (userInput) {
    dispatch(setUserInputText({ instanceId, text: userInput }));
  }

  // =========================================================================
  // Step 3: Route by display mode
  // =========================================================================

  if (isInteractive(resolvedDisplayMode) || resolvedDisplayMode === "toast") {
    // Interactive + toast: return instanceId, optionally auto-execute
    if (autoRun && (userInput || shortcutId)) {
      const executeThunk = useChat ? executeChatInstance : executeInstance;
      const result = await dispatch(executeThunk({ instanceId })).unwrap();

      return {
        instanceId,
        requestId: result.requestId,
        conversationId: result.conversationId,
      };
    }

    return { instanceId };
  }

  if (
    resolvedDisplayMode === "inline" ||
    resolvedDisplayMode === "direct" ||
    resolvedDisplayMode === "background"
  ) {
    // Non-interactive: always execute immediately, poll for result
    const executeThunk = useChat ? executeChatInstance : executeInstance;
    const result = await dispatch(executeThunk({ instanceId })).unwrap();

    const responseText = await pollForCompletion(getState, result.requestId);

    const launchResult: LaunchResult = {
      instanceId,
      requestId: result.requestId,
      conversationId: result.conversationId,
      responseText,
    };

    onComplete?.(launchResult);

    return launchResult;
  }

  // Fallback — shouldn't reach here
  return { instanceId };
});

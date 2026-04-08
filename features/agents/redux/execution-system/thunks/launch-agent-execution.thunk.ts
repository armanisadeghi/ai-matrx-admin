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
 *   - direct / background → caller manages UI
 *   - All others → OverlayController renders the component
 *
 * All settings (autoRun, showVariables, usePreExecutionInput, callbacks, etc.)
 * are persisted to Redux so components can read them after creation.
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
import { callbackManager } from "@/utils/callbackManager";
import { resolveVisibilitySettings } from "../instance-ui-state/instance-ui-state.slice";
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
import { setInstanceStatus } from "../execution-instances/execution-instances.slice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

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

  /**
   * Coarse-grained visibility config. When provided, resolves to fine-grained:
   *   false → showVariablePanel: false, showDefinitionMessages: false
   *   true  → showVariablePanel: true,  showDefinitionMessages: true, showDefinitionMessageContent: false
   *
   * Fine-grained overrides below take precedence over this.
   */
  showVariables?: boolean;
  showVariablePanel?: boolean;
  showDefinitionMessages?: boolean;
  showDefinitionMessageContent?: boolean;

  usePreExecutionInput?: boolean;

  /** When true, conversation history is wiped after each submit (builder/test mode). */
  autoClearConversation?: boolean;
  /** Conversation mode — "chat" (client-owned) or "agent" (server-owned). */
  conversationMode?: "agent" | "conversation" | "chat";

  userInput?: string;
  variables?: Record<string, unknown>;
  overrides?: Partial<LLMParams>;

  useChat?: boolean;
  variableInputStyle?: "inline" | "wizard";

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

const DISPLAY_MODE_TO_OVERLAY_ID: Partial<Record<ResultDisplayMode, string>> = {
  "modal-full": "agentFullModal",
  "modal-compact": "agentCompactModal",
  "chat-bubble": "agentChatBubble",
  inline: "agentInlineOverlay",
  sidebar: "agentSidebarOverlay",
  "flexible-panel": "agentFlexiblePanel",
  panel: "agentPanelOverlay",
  toast: "agentToastOverlay",
  "floating-chat": "agentFloatingChat",
  "chat-collapsible": "agentChatCollapsible",
  "chat-assistant": "agentChatAssistant",
};

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

/**
 * Registers lifecycle callbacks with CallbackManager and returns the group ID.
 * Returns null if no callbacks are provided.
 */
function registerCallbacks(options: LaunchAgentOptions): string | null {
  const { onComplete, onTextReplace, onTextInsertBefore, onTextInsertAfter } =
    options;

  if (
    !onComplete &&
    !onTextReplace &&
    !onTextInsertBefore &&
    !onTextInsertAfter
  ) {
    return null;
  }

  const groupId = callbackManager.createGroup();

  if (onComplete) {
    callbackManager.registerWithContext(onComplete, {
      groupId,
      context: { type: "complete" },
    });
  }
  if (onTextReplace) {
    callbackManager.registerWithContext(onTextReplace, {
      groupId,
      context: { type: "replace" },
    });
  }
  if (onTextInsertBefore) {
    callbackManager.registerWithContext(onTextInsertBefore, {
      groupId,
      context: { type: "insertBefore" },
    });
  }
  if (onTextInsertAfter) {
    callbackManager.registerWithContext(onTextInsertAfter, {
      groupId,
      context: { type: "insertAfter" },
    });
  }

  return groupId;
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
    showVariablePanel,
    showDefinitionMessages,
    showDefinitionMessageContent,
    usePreExecutionInput,
    autoClearConversation,
    conversationMode,
    userInput,
    variables,
    useChat = false,
    variableInputStyle,
    onComplete,
  } = options;

  // =========================================================================
  // Step 0: Register callbacks and resolve visibility
  // =========================================================================

  const callbackGroupId = registerCallbacks(options);

  const visibilityFromConfig = resolveVisibilitySettings(showVariables);
  const resolvedShowVariablePanel =
    showVariablePanel ?? visibilityFromConfig.showVariablePanel;
  const resolvedShowDefinitionMessages =
    showDefinitionMessages ?? visibilityFromConfig.showDefinitionMessages;
  const resolvedShowDefinitionMessageContent =
    showDefinitionMessageContent ??
    visibilityFromConfig.showDefinitionMessageContent;

  let instanceId: string;
  let resolvedDisplayMode: ResultDisplayMode =
    displayModeOverride ?? "modal-full";

  // =========================================================================
  // Step 1: Route by trigger type and create instance
  // =========================================================================

  if (shortcutId) {
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
        autoRun,
        allowChat: allowChat ?? shortcut.allowChat,
        usePreExecutionInput,
        showVariablePanel: resolvedShowVariablePanel,
        showDefinitionMessages: resolvedShowDefinitionMessages,
        showDefinitionMessageContent: resolvedShowDefinitionMessageContent,
        callbackGroupId,
        variableInputStyle,
      }),
    ).unwrap();

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ instanceId, values: variables }));
    }
  } else if (agentId) {
    instanceId = await dispatch(
      createManualInstance({
        agentId,
        sourceFeature,
        autoClearConversation,
        mode: conversationMode,
        displayMode: resolvedDisplayMode,
        autoRun,
        allowChat,
        usePreExecutionInput,
        showVariablePanel: resolvedShowVariablePanel,
        showDefinitionMessages: resolvedShowDefinitionMessages,
        showDefinitionMessageContent: resolvedShowDefinitionMessageContent,
        callbackGroupId,
        variableInputStyle,
      }),
    ).unwrap();

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

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ instanceId, values: variables }));
    }

    if (displayModeOverride) {
      dispatch(setDisplayModeAction({ instanceId, mode: resolvedDisplayMode }));
    }
  } else {
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
  // Step 1b: Promote status to ready for overlay-managed modes
  // =========================================================================

  if (
    resolvedDisplayMode !== "direct" &&
    resolvedDisplayMode !== "background"
  ) {
    dispatch(setInstanceStatus({ instanceId, status: "ready" }));
  }

  // =========================================================================
  // Step 1c: Open the overlay for the resolved display mode
  // =========================================================================

  const overlayId = DISPLAY_MODE_TO_OVERLAY_ID[resolvedDisplayMode];
  if (overlayId) {
    dispatch(openOverlay({ overlayId, instanceId }));
  }

  // =========================================================================
  // Step 2: Set user input if provided
  // =========================================================================

  if (userInput) {
    dispatch(setUserInputText({ instanceId, text: userInput }));
  }

  // =========================================================================
  // Step 3: Decide whether to execute now or defer to the UI
  //
  // Two hard gates prevent immediate execution:
  //   1. autoRun is false → user must manually submit
  //   2. usePreExecutionInput is true → user must complete the pre-exec gate
  //      first. The AgentRunner component handles executing after that.
  //
  // When either gate is active, we return the instanceId without executing.
  // =========================================================================

  if (!autoRun) {
    return { instanceId };
  }

  if (usePreExecutionInput) {
    return { instanceId };
  }

  if (
    resolvedDisplayMode === "direct" ||
    resolvedDisplayMode === "background" ||
    resolvedDisplayMode === "inline"
  ) {
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

  if (isInteractive(resolvedDisplayMode) || resolvedDisplayMode === "toast") {
    const executeThunk = useChat ? executeChatInstance : executeInstance;
    const result = await dispatch(executeThunk({ instanceId })).unwrap();

    return {
      instanceId,
      requestId: result.requestId,
      conversationId: result.conversationId,
    };
  }

  return { instanceId };
});

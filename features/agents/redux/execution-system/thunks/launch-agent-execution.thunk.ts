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
  JsonExtractionConfig,
  ManagedAgentOptions,
  ResultDisplayMode,
  SourceFeature,
  VariableInputStyle,
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
import {
  openOverlay,
  openAgentGateWindow,
} from "@/lib/redux/slices/overlaySlice";

export interface LaunchResult {
  /** Client-owned execution instance key (Redux `byConversationId`). */
  conversationId: string;
  requestId?: string;
  /** Server-assigned conversation id from the stream / API when available. */
  serverConversationId?: string | null;
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
      return (
        request.renderBlockOrder
          .map((id) => request.renderBlocks[id]?.content ?? "")
          .join("\n") || ""
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return "";
}

/**
 * Registers lifecycle callbacks with CallbackManager and returns the group ID.
 * Returns null if no callbacks are provided.
 */
function registerCallbacks(options: ManagedAgentOptions): string | null {
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
  ManagedAgentOptions
>("instances/launch", async (options, { dispatch, getState }) => {
  const {
    agentId,
    shortcutId,
    manual,
    sourceFeature,
    applicationScope,
    displayMode: displayModeOverride,
    autoRun = false,
    allowChat,
    showVariables,
    showVariablePanel,
    showDefinitionMessages,
    showDefinitionMessageContent,
    usePreExecutionInput,
    showAutoClearToggle,
    autoClearConversation,
    conversationMode = "agent",
    userInput,
    variables,
    overrides,
    variableInputStyle,
    hideReasoning,
    hideToolResults,
    preExecutionMessage,
    jsonExtraction,
    originalText,
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

  let conversationId: string;
  let resolvedDisplayMode: ResultDisplayMode = displayModeOverride ?? "direct";

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
      "direct";

    conversationId = await dispatch(
      createInstanceFromShortcut({
        shortcutId,
        uiScopes: applicationScope ?? {},
        sourceFeature,
        displayMode: resolvedDisplayMode,
        autoRun,
        allowChat: allowChat ?? shortcut.allowChat,
        usePreExecutionInput,
        showAutoClearToggle,
        autoClearConversation,
        conversationMode,
        showVariablePanel: resolvedShowVariablePanel,
        showDefinitionMessages: resolvedShowDefinitionMessages,
        showDefinitionMessageContent: resolvedShowDefinitionMessageContent,
        callbackGroupId,
        variableInputStyle,
        hideReasoning,
        hideToolResults,
        preExecutionMessage,
        jsonExtraction,
        originalText,
      }),
    ).unwrap();

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ conversationId, values: variables }));
    }

    if (overrides && Object.keys(overrides).length > 0) {
      const { setOverrides } =
        await import("../instance-model-overrides/instance-model-overrides.slice");
      dispatch(setOverrides({ conversationId, changes: overrides }));
    }
  } else if (agentId) {
    conversationId = await dispatch(
      createManualInstance({
        agentId,
        sourceFeature,
        autoClearConversation,
        showAutoClearToggle,
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
        hideReasoning,
        hideToolResults,
        preExecutionMessage,
        jsonExtraction,
        originalText,
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
            setUserVariableValues({ conversationId, values: variableValues }),
          );
        }
        if (contextEntries.length > 0) {
          dispatch(
            setContextEntries({ conversationId, entries: contextEntries }),
          );
        }
      }
    }

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ conversationId, values: variables }));
    }

    if (overrides && Object.keys(overrides).length > 0) {
      const { setOverrides } =
        await import("../instance-model-overrides/instance-model-overrides.slice");
      dispatch(setOverrides({ conversationId, changes: overrides }));
    }

    if (displayModeOverride) {
      dispatch(
        setDisplayModeAction({ conversationId, mode: resolvedDisplayMode }),
      );
    }
  } else {
    conversationId = await dispatch(
      createManualInstanceNoAgent({
        label: manual?.label,
        baseSettings: manual?.baseSettings,
        sourceFeature,
      }),
    ).unwrap();

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ conversationId, values: variables }));
    }

    if (displayModeOverride) {
      dispatch(
        setDisplayModeAction({ conversationId, mode: resolvedDisplayMode }),
      );
    }
  }

  // =========================================================================
  // Step 1b: Promote status to ready for overlay-managed modes
  // =========================================================================

  if (
    resolvedDisplayMode !== "direct" &&
    resolvedDisplayMode !== "background"
  ) {
    dispatch(setInstanceStatus({ conversationId, status: "ready" }));
  }

  // =========================================================================
  // Step 2: Set user input if provided
  // =========================================================================

  if (userInput) {
    dispatch(setUserInputText({ conversationId, text: userInput }));
  }

  // =========================================================================
  // Step 3: Open the gate window if pre-execution input is required.
  //
  // The gate is opened here (not in a component) to avoid a chicken-and-egg
  // problem: the real overlay widgets only mount after their overlay is open,
  // so they can't be responsible for opening the gate.
  //
  // The gate blocks thunk execution only — the real overlay still opens so
  // the component is always ready to render once the user continues.
  // =========================================================================

  if (usePreExecutionInput) {
    const downstreamOverlayId = DISPLAY_MODE_TO_OVERLAY_ID[resolvedDisplayMode];
    dispatch(
      openAgentGateWindow({
        conversationId,
        gateWindowId: `gate-${conversationId}`,
        downstreamOverlayId,
      }),
    );
    return { conversationId };
  }

  // =========================================================================
  // Step 4: Open the overlay for the resolved display mode.
  // Always runs (regardless of autoRun) so the component renders immediately.
  // =========================================================================

  const overlayId = DISPLAY_MODE_TO_OVERLAY_ID[resolvedDisplayMode];
  if (overlayId) {
    dispatch(
      openOverlay({
        overlayId,
        instanceId: conversationId,
        data: { conversationId: conversationId },
      }),
    );
  }

  // =========================================================================
  // Step 5: autoRun=false — component is open, user triggers execution manually.
  // =========================================================================

  if (!autoRun) {
    return { conversationId };
  }

  const isChatMode = conversationMode === "chat";

  if (
    resolvedDisplayMode === "direct" ||
    resolvedDisplayMode === "background" ||
    resolvedDisplayMode === "inline"
  ) {
    const executeThunk = isChatMode ? executeChatInstance : executeInstance;
    const result = await dispatch(executeThunk({ conversationId })).unwrap();

    const responseText = await pollForCompletion(getState, result.requestId);

    const launchResult: LaunchResult = {
      conversationId,
      requestId: result.requestId,
      serverConversationId: result.conversationId,
      responseText,
    };

    onComplete?.(launchResult);

    return launchResult;
  }

  if (isInteractive(resolvedDisplayMode) || resolvedDisplayMode === "toast") {
    const executeThunk = isChatMode ? executeChatInstance : executeInstance;
    const result = await dispatch(executeThunk({ conversationId })).unwrap();

    return {
      conversationId,
      requestId: result.requestId,
      serverConversationId: result.conversationId,
    };
  }

  return { conversationId };
});

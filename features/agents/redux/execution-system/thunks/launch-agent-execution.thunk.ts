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
 * All settings (autoRun, showVariables, showPreExecutionGate, callbacks, etc.)
 * are persisted to Redux so components can read them after creation.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  ManagedAgentOptions,
  ResultDisplayMode,
} from "@/features/agents/types/instance.types";
import { mapScopeToInstance } from "@/features/agents/utils/scope-mapping";
import { resolveVisibilitySettings } from "../instance-ui-state/instance-ui-state.slice";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";
import { selectAgentExecutionPayload } from "@/features/agents/redux/agent-definition/selectors";
import { getShortcutRecordFromState } from "@/features/agents/redux/agent-shortcuts/selectors";
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
import { setInstanceStatus } from "../conversations/conversations.slice";
import {
  openOverlay,
  openAgentGateWindow,
} from "@/lib/redux/slices/overlaySlice";

export interface LaunchResult {
  /** The conversation id — client-generated, honored by the server end-to-end. */
  conversationId: string;
  requestId?: string;
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

function isInteractive(resultDisplayMode: ResultDisplayMode): boolean {
  return INTERACTIVE_MODES.has(resultDisplayMode);
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
    applicationScope: flatApplicationScope,
    displayMode: flatDisplayMode,
    autoRun: flatAutoRun = false,
    allowChat: flatAllowChat,
    showVariables,
    showVariablePanel: flatShowVariablePanel,
    showDefinitionMessages: flatShowDefinitionMessages,
    showDefinitionMessageContent: flatShowDefinitionMessageContent,
    showPreExecutionGate: flatShowPreExecutionGate,
    showAutoClearToggle,
    autoClearConversation,
    apiEndpointMode = "agent",
    userInput: flatUserInput,
    variables,
    overrides,
    variablesPanelStyle: flatVariablesPanelStyle,
    hideReasoning: flatHideReasoning,
    hideToolResults: flatHideToolResults,
    preExecutionMessage: flatPreExecutionMessage,
    bypassGateSeconds: flatBypassGateSeconds,
    jsonExtraction,
    originalText: flatOriginalText,
    widgetHandleId: flatWidgetHandleId,
    isEphemeral,
    runtime,
    config,
  } = options;

  // ── Nested (new) shape wins over flat (legacy) shape ──────────────────────
  // New callers (useShortcutTrigger, triggerShortcut, launchShortcut) put
  // scope / userInput / originalText under `runtime.*` and per-run config
  // overrides under `config.*`. Legacy callers used top-level flat fields.
  // Pull from both so everyone works.
  const applicationScope = runtime?.applicationScope ?? flatApplicationScope;
  const userInput = runtime?.userInput ?? flatUserInput;
  const originalText = runtime?.originalText ?? flatOriginalText;
  const widgetHandleId = runtime?.widgetHandleId ?? flatWidgetHandleId;

  const displayModeOverride = config?.displayMode ?? flatDisplayMode;
  const autoRun = config?.autoRun ?? flatAutoRun;
  const allowChat = config?.allowChat ?? flatAllowChat;
  const showVariablePanel =
    config?.showVariablePanel ?? flatShowVariablePanel;
  const showDefinitionMessages =
    config?.showDefinitionMessages ?? flatShowDefinitionMessages;
  const showDefinitionMessageContent =
    config?.showDefinitionMessageContent ?? flatShowDefinitionMessageContent;
  const showPreExecutionGate =
    config?.showPreExecutionGate ?? flatShowPreExecutionGate;
  const preExecutionMessage =
    config?.preExecutionMessage ?? flatPreExecutionMessage;
  const bypassGateSeconds =
    config?.bypassGateSeconds ?? flatBypassGateSeconds;
  const hideReasoning = config?.hideReasoning ?? flatHideReasoning;
  const hideToolResults = config?.hideToolResults ?? flatHideToolResults;
  const variablesPanelStyle =
    config?.variablesPanelStyle ?? flatVariablesPanelStyle;

  // ── Trace: launch envelope ────────────────────────────────────────────────
  // One line summarizing what the caller actually sent, then a structured
  // view of the live runtime/scope so "variable didn't map" bugs surface
  // immediately in the console.
  if (typeof window !== "undefined") {
    console.groupCollapsed(
      `%c[Shortcut] launchAgentExecution ${shortcutId ? `shortcut=${shortcutId}` : agentId ? `agent=${agentId}` : "manual"}`,
      "color:#6366f1;font-weight:bold",
    );
    console.log("source:", sourceFeature ?? "(unset)");
    console.log(
      "applicationScope (keys):",
      applicationScope ? Object.keys(applicationScope) : "(none)",
    );
    if (applicationScope) {
      for (const [k, v] of Object.entries(applicationScope)) {
        const preview =
          typeof v === "string"
            ? `"${v.slice(0, 80)}"${v.length > 80 ? "…" : ""} (${v.length} chars)`
            : v && typeof v === "object"
              ? `<${Array.isArray(v) ? "array" : "object"} ${Object.keys(v as object).length} keys>`
              : String(v);
        console.log(`  ${k} →`, preview);
      }
    }
    console.log(
      "userInput:",
      userInput ? `"${userInput.slice(0, 80)}"${userInput.length > 80 ? "…" : ""}` : "(none)",
    );
    console.log(
      "caller config override:",
      config ? Object.keys(config) : "(none)",
    );
    console.log("apiEndpointMode:", apiEndpointMode);
    console.groupEnd();
  }

  // =========================================================================
  // Step 0: Resolve visibility.
  //
  // Widget handle: the caller passes `widgetHandleId` (returned by
  // `useWidgetHandle` at the widget). The submit-body assembler reads the
  // handle live per-turn via `callbackManager.get` to derive `client_tools`;
  // `process-stream.ts` fires `handle.onComplete` / `handle.onError` at
  // stream end. Nothing to register or wrap here.
  // =========================================================================

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
  // Step 0.5: Ensure the agent's execution payload is in Redux before we
  // snapshot it into the instance. `createInstance*` reads
  // `state.agentDefinition.agents[agentId]` via `readAgentSnapshot` — if the
  // variable definitions haven't been fetched yet, the instance ends up with
  // `definitions: []` and subsequent `setUserVariableValues` writes are
  // silently dropped at assembly time (selectResolvedVariables only emits
  // values for defined vars).
  //
  // Applies to BOTH the direct-agent and the shortcut paths. Previously the
  // shortcut path assumed `buildAgentShortcutMenu` had already merged the
  // agent into Redux, but any programmatic trigger that runs before (or
  // independently of) the menu build leaves the snapshot empty and every
  // scope → variable mapping silently drops. Always verify.
  // =========================================================================
  const resolvedAgentId =
    agentId ??
    (shortcutId
      ? getShortcutRecordFromState(getState() as RootState, shortcutId)
          ?.agentId ?? null
      : null);

  if (resolvedAgentId) {
    const preState = getState() as RootState;
    const payload = selectAgentExecutionPayload(preState, resolvedAgentId);
    if (!payload.isReady) {
      if (typeof window !== "undefined") {
        console.log(
          `%c[Shortcut]%c agent ${resolvedAgentId} not loaded — fetching execution payload before mapping`,
          "color:#f59e0b;font-weight:bold",
          "color:inherit",
        );
      }
      await dispatch(fetchAgentExecutionMinimal(resolvedAgentId)).unwrap();
    }
  }

  // =========================================================================
  // Step 1: Route by trigger type and create instance
  // =========================================================================

  if (shortcutId) {
    const state = getState() as RootState;
    const shortcut = getShortcutRecordFromState(state, shortcutId);

    if (!shortcut) {
      throw new Error(`Shortcut ${shortcutId} not found in Redux`);
    }

    resolvedDisplayMode =
      displayModeOverride ??
      (shortcut.displayMode as ResultDisplayMode) ??
      "direct";

    conversationId = await dispatch(
      createInstanceFromShortcut({
        shortcutId,
        uiScopes: applicationScope ?? {},
        sourceFeature,
        displayMode: resolvedDisplayMode,
        autoRun,
        allowChat: allowChat ?? shortcut.allowChat,
        showPreExecutionGate,
        showAutoClearToggle,
        autoClearConversation,
        apiEndpointMode,
        showVariablePanel: resolvedShowVariablePanel,
        showDefinitionMessages: resolvedShowDefinitionMessages,
        showDefinitionMessageContent: resolvedShowDefinitionMessageContent,
        widgetHandleId,
        variablesPanelStyle,
        hideReasoning,
        hideToolResults,
        preExecutionMessage,
        bypassGateSeconds,
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
        apiEndpointMode,
        displayMode: resolvedDisplayMode,
        autoRun,
        allowChat,
        showPreExecutionGate,
        showVariablePanel: resolvedShowVariablePanel,
        showDefinitionMessages: resolvedShowDefinitionMessages,
        showDefinitionMessageContent: resolvedShowDefinitionMessageContent,
        widgetHandleId,
        variablesPanelStyle,
        hideReasoning,
        hideToolResults,
        preExecutionMessage,
        jsonExtraction,
        originalText,
        ...(isEphemeral !== undefined ? { isEphemeral } : {}),
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
        setDisplayModeAction({
          conversationId,
          displayMode: resolvedDisplayMode,
        }),
      );
    }
  } else {
    conversationId = await dispatch(
      createManualInstanceNoAgent({
        label: manual?.label,
        baseSettings: manual?.baseSettings,
        sourceFeature,
        widgetHandleId,
      }),
    ).unwrap();

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ conversationId, values: variables }));
    }

    if (displayModeOverride) {
      dispatch(
        setDisplayModeAction({
          conversationId,
          displayMode: resolvedDisplayMode,
        }),
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

  if (showPreExecutionGate) {
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
  // Step 4: Open the overlay for the resolved display Mode.
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

  const isManualMode = apiEndpointMode === "manual";

  if (
    resolvedDisplayMode === "direct" ||
    resolvedDisplayMode === "background" ||
    resolvedDisplayMode === "inline"
  ) {
    const executeThunk = isManualMode ? executeChatInstance : executeInstance;
    const result = await dispatch(executeThunk({ conversationId })).unwrap();

    const responseText = await pollForCompletion(getState, result.requestId);

    // Note: widget handle's onComplete is fired from process-stream.ts at
    // stream-end, not here — so it also fires for non-direct/non-background
    // modes (sidebar, panel, modal-full, etc.) which previously missed it.
    return {
      conversationId,
      requestId: result.requestId,
      responseText,
    };
  }

  if (isInteractive(resolvedDisplayMode) || resolvedDisplayMode === "toast") {
    const executeThunk = isManualMode ? executeChatInstance : executeInstance;
    const result = await dispatch(executeThunk({ conversationId })).unwrap();

    return {
      conversationId,
      requestId: result.requestId,
    };
  }

  return { conversationId };
});

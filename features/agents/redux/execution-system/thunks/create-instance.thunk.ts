/**
 * Create Instance Thunk
 *
 * The instance factory — handles all three creation paths:
 *   1. Manual: user opens the agent runner
 *   2. Shortcut: triggered by button/keyboard/context menu
 *   3. Test: created as part of parallel testing
 *
 * CRITICAL: This is the ONE moment where agentId is used legitimately.
 * We copy everything the instance needs from the agent definition ONCE.
 * After creation, no component, hook, selector, or thunk ever uses agentId
 * again — the instance is fully self-contained and isolated.
 *
 * If the agent is modified or deleted after this point, this instance
 * does not notice and does not care.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  AgentType,
  VariableDefinition,
} from "@/features/agents/types/agent-definition.types";
import type { LLMParams } from "@/features/agents/types";
import type { ApiEndpointMode } from "@/features/agents/types/instance.types";
import { executeInstance } from "./execute-instance.thunk";
import { executeChatInstance } from "./execute-chat-instance.thunk";

import { generateConversationId } from "../utils";
import {
  createInstance,
  destroyInstance,
} from "../conversations/conversations.slice";
import { setFocus } from "../conversation-focus/conversation-focus.slice";
import { initInstanceOverrides } from "../instance-model-overrides/instance-model-overrides.slice";
import {
  initInstanceVariables,
  setUserVariableValues,
} from "../instance-variable-values/instance-variable-values.slice";
import { initInstanceResources } from "../instance-resources/instance-resources.slice";
import {
  initInstanceContext,
  setContextEntries,
} from "../instance-context/instance-context.slice";
import {
  initInstanceUserInput,
  setUserInputText,
} from "../instance-user-input/instance-user-input.slice";
import { initInstanceClientTools } from "../instance-client-tools/instance-client-tools.slice";
import { initInstanceUIState } from "../instance-ui-state/instance-ui-state.slice";
import { initInstanceMessages } from "../messages/messages.slice";
import {
  InstanceOrigin,
  ResultDisplayMode,
  type JsonExtractionConfig,
  type SourceFeature,
  type VariableInputStyle,
} from "@/features/agents/types/instance.types";
import { mapScopeToInstance } from "@/features/agents/utils/scope-mapping";

// =============================================================================
// Shared helper — reads agent snapshot data. The ONLY place agentId is used.
// =============================================================================

function readAgentSnapshot(
  state: RootState,
  agentId: string,
): {
  agentType: AgentType;
  variableDefinitions: VariableDefinition[];
  baseSettings: Partial<LLMParams>;
  contextSlots: Array<{ key: string }>;
  isCreator: boolean;
} {
  const agent = state.agentDefinition.agents?.[agentId];
  return {
    agentType: agent?.agentType ?? "user",
    variableDefinitions: agent?.variableDefinitions ?? [],
    baseSettings: agent?.settings ?? {},
    contextSlots: agent?.contextSlots ?? [],
    isCreator: agent?.isOwner ?? false,
  };
}

// =============================================================================
// Manual Instance Creation
// =============================================================================

interface CreateManualInstanceArgs {
  agentId: string;
  /** When provided, uses this UUID instead of generating a new one. Useful for
   *  creating an instance keyed by a known server conversation UUID. */
  conversationId?: string;
  agentType?: AgentType;
  autoClearConversation?: boolean;
  showAutoClearToggle?: boolean;
  apiEndpointMode?: ApiEndpointMode;
  sourceFeature?: SourceFeature;
  autoRun?: boolean;
  allowChat?: boolean;
  usePreExecutionInput?: boolean;
  showVariablePanel?: boolean;
  showDefinitionMessages?: boolean;
  showDefinitionMessageContent?: boolean;
  displayMode?: ResultDisplayMode;
  widgetHandleId?: string | null;
  hideReasoning?: boolean;
  hideToolResults?: boolean;
  preExecutionMessage?: string | null;
  variableInputStyle?: VariableInputStyle;
  jsonExtraction?: JsonExtractionConfig | null;
  originalText?: string | null;
  /**
   * When true the conversation runs statelessly — server writes nothing to
   * the DB. Stamped onto the conversation record via `createInstance`; the
   * execute thunks branch on this flag to select endpoints and store flags.
   */
  isEphemeral?: boolean;
}

export const createManualInstance = createAsyncThunk<
  string,
  CreateManualInstanceArgs
>("instances/createManual", async (args, { dispatch, getState }) => {
  const {
    agentId,
    conversationId: providedConversationId,
    agentType,
    autoClearConversation = false,
    showAutoClearToggle,
    apiEndpointMode = "manual",
    sourceFeature = "agent-runner",
    autoRun,
    allowChat,
    usePreExecutionInput,
    showVariablePanel,
    showDefinitionMessages,
    showDefinitionMessageContent,
    displayMode,
    widgetHandleId,
    hideReasoning,
    hideToolResults,
    preExecutionMessage,
    variableInputStyle,
    jsonExtraction,
    originalText,
    isEphemeral,
  } = args;

  const conversationId = providedConversationId ?? generateConversationId();
  const state = getState() as RootState;

  const snapshot = readAgentSnapshot(state, agentId);
  const resolvedAgentType = agentType ?? snapshot.agentType;

  dispatch(
    createInstance({
      conversationId,
      agentId,
      agentType: resolvedAgentType,
      origin: "manual" as InstanceOrigin,
      sourceFeature,
      ...(isEphemeral !== undefined ? { isEphemeral } : {}),
    }),
  );

  dispatch(
    initInstanceOverrides({
      conversationId,
      baseSettings: snapshot.baseSettings,
    }),
  );
  dispatch(
    initInstanceVariables({
      conversationId,
      definitions: snapshot.variableDefinitions,
      scopeValues: {},
    }),
  );
  dispatch(initInstanceResources({ conversationId }));
  dispatch(initInstanceContext({ conversationId }));
  dispatch(initInstanceUserInput({ conversationId }));
  dispatch(initInstanceClientTools({ conversationId }));
  dispatch(
    initInstanceUIState({
      conversationId,
      displayMode,
      isCreator: snapshot.isCreator,
      autoClearConversation,
      showAutoClearToggle,
      autoRun,
      allowChat,
      usePreExecutionInput,
      showVariablePanel:
        showVariablePanel ?? snapshot.variableDefinitions.length > 0,
      showDefinitionMessages,
      showDefinitionMessageContent,
      widgetHandleId,
      hideReasoning,
      hideToolResults,
      preExecutionMessage,
      variableInputStyle,
      jsonExtraction,
      originalText,
    }),
  );
  dispatch(initInstanceMessages({ conversationId, apiEndpointMode }));

  return conversationId;
});

// =============================================================================
// Shortcut Instance Creation
// =============================================================================

interface CreateShortcutInstanceArgs {
  shortcutId: string;
  uiScopes: Record<string, unknown>;
  sourceFeature?: SourceFeature;
  displayMode?: ResultDisplayMode;
  autoRun?: boolean;
  allowChat?: boolean;
  usePreExecutionInput?: boolean;
  autoClearConversation?: boolean;
  showAutoClearToggle?: boolean;
  apiEndpointMode?: ApiEndpointMode;
  showVariablePanel?: boolean;
  showDefinitionMessages?: boolean;
  showDefinitionMessageContent?: boolean;
  widgetHandleId?: string | null;
  hideReasoning?: boolean;
  hideToolResults?: boolean;
  preExecutionMessage?: string | null;
  variableInputStyle?: VariableInputStyle;
  jsonExtraction?: JsonExtractionConfig | null;
  originalText?: string | null;
}

export const createInstanceFromShortcut = createAsyncThunk<
  string,
  CreateShortcutInstanceArgs
>("instances/createFromShortcut", async (args, { dispatch, getState }) => {
  const {
    shortcutId,
    uiScopes,
    sourceFeature = "context-menu",
    displayMode,
    autoRun,
    allowChat,
    usePreExecutionInput,
    autoClearConversation,
    showAutoClearToggle,
    apiEndpointMode = "agent",
    showVariablePanel,
    showDefinitionMessages,
    showDefinitionMessageContent,
    widgetHandleId,
    hideReasoning,
    hideToolResults,
    preExecutionMessage,
    variableInputStyle,
    jsonExtraction,
    originalText,
  } = args;

  const conversationId = generateConversationId();
  const state = getState() as RootState;
  const shortcut = state.agentShortcut[shortcutId];

  if (!shortcut) throw new Error(`Shortcut ${shortcutId} not found`);

  const { agentId } = shortcut;

  const snapshot = readAgentSnapshot(state, agentId);

  dispatch(
    createInstance({
      conversationId,
      agentId,
      agentType: snapshot.agentType,
      origin: "shortcut" as InstanceOrigin,
      shortcutId,
      sourceFeature,
    }),
  );

  dispatch(
    initInstanceOverrides({
      conversationId,
      baseSettings: snapshot.baseSettings,
    }),
  );
  dispatch(
    initInstanceVariables({
      conversationId,
      definitions: snapshot.variableDefinitions,
      scopeValues: {},
    }),
  );
  dispatch(initInstanceResources({ conversationId }));
  dispatch(initInstanceContext({ conversationId }));
  dispatch(initInstanceUserInput({ conversationId }));
  dispatch(initInstanceClientTools({ conversationId }));
  dispatch(
    initInstanceUIState({
      conversationId,
      displayMode: (displayMode ?? shortcut.resultDisplay) as ResultDisplayMode,
      autoRun,
      allowChat: allowChat ?? shortcut.allowChat,
      usePreExecutionInput,
      autoClearConversation,
      showAutoClearToggle,
      showVariablePanel: showVariablePanel ?? shortcut.showVariables,
      showDefinitionMessages,
      showDefinitionMessageContent,
      widgetHandleId,
      isCreator: snapshot.isCreator,
      hideReasoning,
      hideToolResults,
      preExecutionMessage,
      variableInputStyle,
      jsonExtraction,
      originalText,
    }),
  );

  const { variableValues, contextEntries } = mapScopeToInstance(
    uiScopes,
    shortcut.scopeMappings,
    snapshot.variableDefinitions,
    snapshot.contextSlots,
  );

  if (shortcut.applyVariables && Object.keys(variableValues).length > 0) {
    dispatch(setUserVariableValues({ conversationId, values: variableValues }));
  }

  if (contextEntries.length > 0) {
    dispatch(setContextEntries({ conversationId, entries: contextEntries }));
  }

  dispatch(
    initInstanceMessages({ conversationId, apiEndpointMode: apiEndpointMode }),
  );

  return conversationId;
});

// =============================================================================
// Test Instance Creation (parallel testing)
// =============================================================================

interface CreateTestInstanceArgs {
  agentId: string;
  agentType?: AgentType;
  variables?: Record<string, unknown>;
  overrides?: Partial<LLMParams>;
  userInput?: string;
  sourceFeature?: SourceFeature;
}

export const createTestInstance = createAsyncThunk<
  string,
  CreateTestInstanceArgs
>(
  "instances/createTest",
  async (
    {
      agentId,
      agentType,
      variables,
      overrides,
      userInput,
      sourceFeature = "agent-builder",
    },
    { dispatch, getState },
  ) => {
    const conversationId = generateConversationId();
    const state = getState() as RootState;

    const snapshot = readAgentSnapshot(state, agentId);
    const resolvedAgentType = agentType ?? snapshot.agentType;

    dispatch(
      createInstance({
        conversationId,
        agentId,
        agentType: resolvedAgentType,
        origin: "test" as InstanceOrigin,
        sourceFeature,
      }),
    );

    dispatch(
      initInstanceOverrides({
        conversationId,
        baseSettings: snapshot.baseSettings,
      }),
    );
    dispatch(
      initInstanceVariables({
        conversationId,
        definitions: snapshot.variableDefinitions,
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ conversationId }));
    dispatch(initInstanceContext({ conversationId }));
    dispatch(initInstanceUserInput({ conversationId, text: userInput }));
    dispatch(initInstanceClientTools({ conversationId }));
    dispatch(
      initInstanceUIState({
        conversationId,
        isCreator: snapshot.isCreator,
        showVariablePanel: snapshot.variableDefinitions.length > 0,
      }),
    );
    dispatch(initInstanceMessages({ conversationId }));

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ conversationId, values: variables }));
    }

    if (overrides && Object.keys(overrides).length > 0) {
      const { setOverrides } =
        await import("../instance-model-overrides/instance-model-overrides.slice");
      dispatch(setOverrides({ conversationId, changes: overrides }));
    }

    return conversationId;
  },
);

// =============================================================================
// Manual Instance Creation (no agent — direct chat/custom)
// =============================================================================

interface CreateManualInstanceNoAgentArgs {
  label?: string;
  agentType?: AgentType;
  variableDefinitions?: VariableDefinition[];
  baseSettings?: Partial<LLMParams>;
  userInput?: string;
  sourceFeature?: SourceFeature;
  widgetHandleId?: string | null;
}

export const createManualInstanceNoAgent = createAsyncThunk<
  string,
  CreateManualInstanceNoAgentArgs
>(
  "instances/createManualNoAgent",
  async (
    {
      agentType = "user",
      variableDefinitions = [],
      baseSettings = {},
      userInput,
      sourceFeature,
      widgetHandleId,
    },
    { dispatch },
  ) => {
    const conversationId = generateConversationId();

    dispatch(
      createInstance({
        conversationId,
        agentId: "",
        agentType,
        origin: "manual" as InstanceOrigin,
        sourceFeature,
      }),
    );

    dispatch(initInstanceOverrides({ conversationId, baseSettings }));
    dispatch(
      initInstanceVariables({
        conversationId,
        definitions: variableDefinitions,
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ conversationId }));
    dispatch(initInstanceContext({ conversationId }));
    dispatch(initInstanceUserInput({ conversationId, text: userInput }));
    dispatch(initInstanceClientTools({ conversationId }));
    dispatch(
      initInstanceUIState({
        conversationId,
        widgetHandleId,
        showVariablePanel: variableDefinitions.length > 0,
      }),
    );
    dispatch(initInstanceMessages({ conversationId }));

    return conversationId;
  },
);

// =============================================================================
// Start New Conversation (non-destructive — old conversation stays cached)
// =============================================================================

interface StartNewConversationArgs {
  currentConversationId: string;
  surfaceKey: string;
}

/**
 * Creates a fresh conversation for the same agent without destroying the old one.
 * Re-snapshots the agent definition so any unsaved builder edits are picked up.
 * Dispatches setFocus to switch the surface to the new conversation.
 * The old conversation remains fully cached in Redux.
 */
export const startNewConversation = createAsyncThunk<
  string,
  StartNewConversationArgs
>(
  "instances/startNewConversation",
  async ({ currentConversationId, surfaceKey }, { dispatch, getState }) => {
    const state = getState() as RootState;

    const instance =
      state.conversations.byConversationId[currentConversationId];
    if (!instance) {
      throw new Error(`Conversation ${currentConversationId} not found`);
    }

    const { agentId, sourceFeature } = instance;
    const currentUIState =
      state.instanceUIState.byConversationId[currentConversationId];
    const currentInputEntry =
      state.instanceUserInput.byConversationId[currentConversationId];

    const snapshot = agentId ? readAgentSnapshot(state, agentId) : null;
    const newConversationId = generateConversationId();

    dispatch(
      createInstance({
        conversationId: newConversationId,
        agentId,
        agentType: snapshot?.agentType ?? instance.agentType,
        origin: instance.origin as InstanceOrigin,
        sourceFeature: sourceFeature as SourceFeature,
      }),
    );

    dispatch(
      initInstanceOverrides({
        conversationId: newConversationId,
        baseSettings: snapshot?.baseSettings ?? {},
      }),
    );
    dispatch(
      initInstanceVariables({
        conversationId: newConversationId,
        definitions: snapshot?.variableDefinitions ?? [],
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ conversationId: newConversationId }));
    dispatch(initInstanceContext({ conversationId: newConversationId }));
    // Carry the last-submitted snapshot across reset so /build engineers can
    // re-apply the same input with tweaked settings.
    dispatch(
      initInstanceUserInput({
        conversationId: newConversationId,
        lastSubmittedText: currentInputEntry?.lastSubmittedText,
        lastSubmittedUserValues: currentInputEntry?.lastSubmittedUserValues,
      }),
    );
    dispatch(initInstanceClientTools({ conversationId: newConversationId }));
    dispatch(
      initInstanceUIState({
        conversationId: newConversationId,
        displayMode: currentUIState?.displayMode,
        isCreator: snapshot?.isCreator ?? currentUIState?.isCreator ?? false,
        autoClearConversation: currentUIState?.autoClearConversation ?? true,
        showAutoClearToggle: currentUIState?.showAutoClearToggle,
        autoRun: currentUIState?.autoRun,
        allowChat: currentUIState?.allowChat,
        usePreExecutionInput: currentUIState?.usePreExecutionInput,
        showVariablePanel:
          (snapshot?.variableDefinitions?.length ?? 0) > 0 ||
          (currentUIState?.showVariablePanel ?? false),
        showDefinitionMessages: currentUIState?.showDefinitionMessages,
        showDefinitionMessageContent:
          currentUIState?.showDefinitionMessageContent,
        hiddenMessageCount: currentUIState?.hiddenMessageCount,
        widgetHandleId: currentUIState?.widgetHandleId,
        submitOnEnter: currentUIState?.submitOnEnter,
        reuseConversationId: currentUIState?.reuseConversationId,
        builderAdvancedSettings: currentUIState?.builderAdvancedSettings,
        hideReasoning: currentUIState?.hideReasoning,
        hideToolResults: currentUIState?.hideToolResults,
        preExecutionMessage: currentUIState?.preExecutionMessage,
        variableInputStyle: currentUIState?.variableInputStyle,
        jsonExtraction: currentUIState?.jsonExtraction,
        originalText: currentUIState?.originalText,
      }),
    );
    dispatch(
      initInstanceMessages({
        conversationId: newConversationId,
        apiEndpointMode: "agent",
      }),
    );

    dispatch(setFocus({ surfaceKey, conversationId: newConversationId }));

    return newConversationId;
  },
);

// =============================================================================
// Start New Conversation and Execute (autoClearConversation path)
// =============================================================================

interface StartNewConversationAndExecuteArgs {
  currentConversationId: string;
  surfaceKey: string;
  debug?: boolean;
}

interface StartNewConversationAndExecuteResult {
  newConversationId: string;
  requestId: string;
}

/**
 * Non-destructive auto-clear submit path.
 *
 * When `autoClearConversation` is ON and the conversation already has history,
 * submitting creates a NEW conversation alongside the old one:
 *   1. Read current variable values and user input text from the old conversation
 *   2. Create a new conversation by re-snapshotting the agent definition
 *   3. Transfer variable values and user input into the new conversation
 *   4. Switch focus to the new conversation via setFocus (no callback needed)
 *   5. Execute on the new conversation (fresh agent call)
 *
 * The old conversation stays fully cached in Redux.
 */
export const startNewConversationAndExecute = createAsyncThunk<
  StartNewConversationAndExecuteResult,
  StartNewConversationAndExecuteArgs
>(
  "instances/startNewConversationAndExecute",
  async (
    { currentConversationId, surfaceKey, debug = false },
    { dispatch, getState },
  ) => {
    const state = getState() as RootState;

    const currentInput =
      state.instanceUserInput.byConversationId[currentConversationId];
    const currentVariables =
      state.instanceVariableValues.byConversationId[currentConversationId];
    const currentUIState =
      state.instanceUIState.byConversationId[currentConversationId];

    // Read the authoritative apiEndpointMode from the history slice
    const currentMode =
      state.messages.byConversationId[currentConversationId]?.apiEndpointMode ??
      "agent";
    const isManualMode = currentMode === "manual";

    const userInputText = currentInput?.text ?? "";
    const userValues = currentVariables?.userValues ?? {};

    const instance =
      state.conversations.byConversationId[currentConversationId];
    if (!instance) {
      throw new Error(`Conversation ${currentConversationId} not found`);
    }
    const { agentId, origin, sourceFeature } = instance;

    const newConversationId = generateConversationId();
    const snapshot = agentId ? readAgentSnapshot(state, agentId) : null;

    dispatch(
      createInstance({
        conversationId: newConversationId,
        agentId,
        agentType: snapshot?.agentType ?? instance.agentType,
        origin: origin as InstanceOrigin,
        sourceFeature: sourceFeature as SourceFeature,
      }),
    );

    dispatch(
      initInstanceOverrides({
        conversationId: newConversationId,
        baseSettings: snapshot?.baseSettings ?? {},
      }),
    );
    dispatch(
      initInstanceVariables({
        conversationId: newConversationId,
        definitions: snapshot?.variableDefinitions ?? [],
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ conversationId: newConversationId }));
    dispatch(initInstanceContext({ conversationId: newConversationId }));
    // Carry the last-submitted snapshot across the autoClear boundary so the
    // re-apply affordance remains available on the new conversation.
    dispatch(
      initInstanceUserInput({
        conversationId: newConversationId,
        lastSubmittedText: currentInput?.lastSubmittedText,
        lastSubmittedUserValues: currentInput?.lastSubmittedUserValues,
      }),
    );
    dispatch(initInstanceClientTools({ conversationId: newConversationId }));
    dispatch(
      initInstanceUIState({
        conversationId: newConversationId,
        displayMode: currentUIState?.displayMode,
        isCreator: snapshot?.isCreator ?? currentUIState?.isCreator ?? false,
        autoClearConversation: true,
        showAutoClearToggle: currentUIState?.showAutoClearToggle,
        autoRun: currentUIState?.autoRun,
        allowChat: currentUIState?.allowChat,
        usePreExecutionInput: currentUIState?.usePreExecutionInput,
        showVariablePanel:
          (snapshot?.variableDefinitions?.length ?? 0) > 0 ||
          (currentUIState?.showVariablePanel ?? false),
        showDefinitionMessages: currentUIState?.showDefinitionMessages,
        showDefinitionMessageContent:
          currentUIState?.showDefinitionMessageContent,
        hiddenMessageCount: currentUIState?.hiddenMessageCount,
        widgetHandleId: currentUIState?.widgetHandleId,
        submitOnEnter: currentUIState?.submitOnEnter ?? true,
        reuseConversationId: currentUIState?.reuseConversationId ?? false,
        builderAdvancedSettings: currentUIState?.builderAdvancedSettings,
        hideReasoning: currentUIState?.hideReasoning,
        hideToolResults: currentUIState?.hideToolResults,
        preExecutionMessage: currentUIState?.preExecutionMessage,
        variableInputStyle: currentUIState?.variableInputStyle,
        jsonExtraction: currentUIState?.jsonExtraction,
        originalText: currentUIState?.originalText,
      }),
    );
    dispatch(
      initInstanceMessages({
        conversationId: newConversationId,
        apiEndpointMode: currentMode,
      }),
    );

    if (Object.keys(userValues).length > 0) {
      dispatch(
        setUserVariableValues({
          conversationId: newConversationId,
          values: userValues,
        }),
      );
    }
    if (userInputText) {
      dispatch(
        setUserInputText({
          conversationId: newConversationId,
          text: userInputText,
        }),
      );
    }

    dispatch(setFocus({ surfaceKey, conversationId: newConversationId }));

    const result = isManualMode
      ? await dispatch(
          executeChatInstance({ conversationId: newConversationId }),
        ).unwrap()
      : await dispatch(
          executeInstance({ conversationId: newConversationId, debug }),
        ).unwrap();

    return {
      newConversationId,
      requestId: result.requestId,
    };
  },
);

/** @deprecated Use startNewConversationAndExecute */
export const reInstanceAndExecute = startNewConversationAndExecute;

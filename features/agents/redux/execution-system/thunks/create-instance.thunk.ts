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
import { getShortcutRecordFromState } from "@/features/agents/redux/agent-shortcuts/selectors";
import { executeInstance } from "./execute-instance.thunk";
import { executeChatInstance } from "./execute-chat-instance.thunk";

import { generateConversationId } from "../utils";
import {
  createInstance,
  destroyInstance,
} from "../conversations/conversations.slice";
import {
  setFocus,
  setInputFocus,
  setDisplayFocus,
} from "../conversation-focus/conversation-focus.slice";
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
import type { InstanceContextEntry } from "@/features/agents/types/instance.types";
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
  type VariablesPanelStyle,
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
  showPreExecutionGate?: boolean;
  showVariablePanel?: boolean;
  showDefinitionMessages?: boolean;
  showDefinitionMessageContent?: boolean;
  displayMode?: ResultDisplayMode;
  widgetHandleId?: string | null;
  hideReasoning?: boolean;
  hideToolResults?: boolean;
  preExecutionMessage?: string | null;
  variablesPanelStyle?: VariablesPanelStyle;
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
    showPreExecutionGate,
    showVariablePanel,
    showDefinitionMessages,
    showDefinitionMessageContent,
    displayMode,
    widgetHandleId,
    hideReasoning,
    hideToolResults,
    preExecutionMessage,
    variablesPanelStyle,
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
      showPreExecutionGate,
      showVariablePanel:
        showVariablePanel ?? snapshot.variableDefinitions.length > 0,
      showDefinitionMessages,
      showDefinitionMessageContent,
      widgetHandleId,
      hideReasoning,
      hideToolResults,
      preExecutionMessage,
      variablesPanelStyle,
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
  showPreExecutionGate?: boolean;
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
  variablesPanelStyle?: VariablesPanelStyle;
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
    showPreExecutionGate,
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
    variablesPanelStyle,
    jsonExtraction,
    originalText,
  } = args;

  const conversationId = generateConversationId();
  const state = getState() as RootState;
  const shortcut = getShortcutRecordFromState(state, shortcutId);

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
      showPreExecutionGate,
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
      variablesPanelStyle,
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
        showPreExecutionGate: currentUIState?.showPreExecutionGate,
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
        variablesPanelStyle: currentUIState?.variablesPanelStyle,
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
        showPreExecutionGate: currentUIState?.showPreExecutionGate,
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
        variablesPanelStyle: currentUIState?.variablesPanelStyle,
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

// =============================================================================
// Split Input Into New Conversation
// =============================================================================

interface SplitInputIntoNewConversationArgs {
  /**
   * The conversation the user just submitted. Becomes the "display" id;
   * continues streaming. We read the submitted text + userValues from its
   * `lastSubmittedText` / `lastSubmittedUserValues` snapshot (captured by
   * `markInputSubmitted` a moment earlier in the smart-execute flow).
   */
  currentConversationId: string;
  surfaceKey: string;
}

interface SplitInputIntoNewConversationResult {
  newConversationId: string;
}

/**
 * Autoclear's "split" step — called immediately after a submit.
 *
 * Creates a fresh conversation (same agent snapshot, same UI state) pre-populated
 * with the text + variables the user just submitted, then points ONLY the input
 * focus slot at it. The display slot stays on `currentConversationId` so the
 * user watches the stream land into the previous conversation while typing the
 * next turn into the new one.
 *
 * Nothing is executed here — this is pure preparation for the NEXT turn.
 */
export const splitInputIntoNewConversation = createAsyncThunk<
  SplitInputIntoNewConversationResult,
  SplitInputIntoNewConversationArgs
>(
  "instances/splitInputIntoNewConversation",
  async ({ currentConversationId, surfaceKey }, { dispatch, getState }) => {
    const state = getState() as RootState;

    const currentInput =
      state.instanceUserInput.byConversationId[currentConversationId];
    const currentUIState =
      state.instanceUIState.byConversationId[currentConversationId];
    const instance =
      state.conversations.byConversationId[currentConversationId];
    if (!instance) {
      throw new Error(`Conversation ${currentConversationId} not found`);
    }
    const { agentId, origin, sourceFeature } = instance;
    const snapshot = agentId ? readAgentSnapshot(state, agentId) : null;

    // The text + userValues the user just submitted. These are captured onto
    // the current conversation by markInputSubmitted BEFORE smart-execute
    // kicks off execution, so they're guaranteed to be present here.
    const carryText = currentInput?.lastSubmittedText ?? "";
    const carryUserValues = currentInput?.lastSubmittedUserValues ?? {};

    const currentMode =
      state.messages.byConversationId[currentConversationId]?.apiEndpointMode ??
      "agent";

    const newConversationId = generateConversationId();

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

    // Carry context entries forward onto the fresh conversation so the
    // engineer's slot values persist across the autoclear boundary. The
    // builder-side localStorage seed will also attempt this, but doing it
    // here removes the race with the hook's useEffect.
    const currentContextMap =
      state.instanceContext.byConversationId[currentConversationId];
    if (currentContextMap) {
      const carriedEntries: InstanceContextEntry[] =
        Object.values(currentContextMap);
      if (carriedEntries.length > 0) {
        dispatch(
          setContextEntries({
            conversationId: newConversationId,
            entries: carriedEntries.map((e) => ({
              key: e.key,
              value: e.value,
              slotMatched: e.slotMatched,
              type: e.type,
              label: e.label,
            })),
          }),
        );
      }
    }

    dispatch(
      initInstanceUserInput({
        conversationId: newConversationId,
        text: carryText,
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
        showPreExecutionGate: currentUIState?.showPreExecutionGate,
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
        variablesPanelStyle: currentUIState?.variablesPanelStyle,
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

    if (Object.keys(carryUserValues).length > 0) {
      dispatch(
        setUserVariableValues({
          conversationId: newConversationId,
          values: carryUserValues,
        }),
      );
    }

    // initInstanceUserInput sets `text` but the setUserInputText path is what
    // the undo stack uses — re-apply via setUserInputText so the snapshot is
    // consistent and the input slice's phase/undo invariants hold.
    if (carryText) {
      dispatch(
        setUserInputText({
          conversationId: newConversationId,
          text: carryText,
          userValues: carryUserValues,
        }),
      );
    }

    // Catch the display up to the conversation that's now streaming, and
    // move ONLY the input focus onto the fresh conversation.
    dispatch(
      setDisplayFocus({
        surfaceKey,
        conversationId: currentConversationId,
      }),
    );
    dispatch(setInputFocus({ surfaceKey, conversationId: newConversationId }));

    return { newConversationId };
  },
);

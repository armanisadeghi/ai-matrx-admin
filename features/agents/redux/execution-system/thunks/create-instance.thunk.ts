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
import type { ConversationMode } from "../instance-conversation-history/instance-conversation-history.slice";
import { executeInstance } from "./execute-instance.thunk";
import { executeChatInstance } from "./execute-chat-instance.thunk";

import { generateInstanceId } from "../utils";
import {
  createInstance,
  destroyInstance,
} from "../execution-instances/execution-instances.slice";
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
import { initInstanceHistory } from "../instance-conversation-history/instance-conversation-history.slice";
import {
  InstanceOrigin,
  ResultDisplayMode,
  type SourceFeature,
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
  agentType?: AgentType;
  autoClearConversation?: boolean;
  mode?: ConversationMode;
  sourceFeature?: SourceFeature;
}

export const createManualInstance = createAsyncThunk<
  string,
  CreateManualInstanceArgs
>(
  "instances/createManual",
  async (
    {
      agentId,
      agentType,
      autoClearConversation = false,
      mode = "agent",
      sourceFeature = "agent-runner",
    },
    { dispatch, getState },
  ) => {
    const instanceId = generateInstanceId();
    const state = getState() as RootState;

    const snapshot = readAgentSnapshot(state, agentId);
    const resolvedAgentType = agentType ?? snapshot.agentType;

    dispatch(
      createInstance({
        instanceId,
        agentId,
        agentType: resolvedAgentType,
        origin: "manual" as InstanceOrigin,
        sourceFeature,
      }),
    );

    dispatch(
      initInstanceOverrides({
        instanceId,
        baseSettings: snapshot.baseSettings,
      }),
    );
    dispatch(
      initInstanceVariables({
        instanceId,
        definitions: snapshot.variableDefinitions,
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ instanceId }));
    dispatch(initInstanceContext({ instanceId }));
    dispatch(initInstanceUserInput({ instanceId }));
    dispatch(initInstanceClientTools({ instanceId }));
    dispatch(
      initInstanceUIState({
        instanceId,
        isCreator: snapshot.isCreator,
        autoClearConversation,
        showVariablePanel: snapshot.variableDefinitions.length > 0,
      }),
    );
    dispatch(initInstanceHistory({ instanceId, mode }));

    return instanceId;
  },
);

// =============================================================================
// Shortcut Instance Creation
// =============================================================================

interface CreateShortcutInstanceArgs {
  shortcutId: string;
  uiScopes: Record<string, unknown>;
  sourceFeature?: SourceFeature;
  displayMode?: ResultDisplayMode;
  allowChat?: boolean;
  showVariables?: boolean;
}

export const createInstanceFromShortcut = createAsyncThunk<
  string,
  CreateShortcutInstanceArgs
>(
  "instances/createFromShortcut",
  async (
    {
      shortcutId,
      uiScopes,
      sourceFeature = "context-menu",
      displayMode,
      allowChat,
      showVariables,
    },
    { dispatch, getState },
  ) => {
    const instanceId = generateInstanceId();
    const state = getState() as RootState;
    const shortcut = state.agentShortcut[shortcutId];

    if (!shortcut) throw new Error(`Shortcut ${shortcutId} not found`);

    const { agentId } = shortcut;

    const snapshot = readAgentSnapshot(state, agentId);

    // 1. Create instance shell with source tracking
    dispatch(
      createInstance({
        instanceId,
        agentId,
        agentType: snapshot.agentType,
        origin: "shortcut" as InstanceOrigin,
        shortcutId,
        sourceFeature,
      }),
    );

    // 2. Initialize sibling slices with snapshotted data
    dispatch(
      initInstanceOverrides({
        instanceId,
        baseSettings: snapshot.baseSettings,
      }),
    );
    dispatch(
      initInstanceVariables({
        instanceId,
        definitions: snapshot.variableDefinitions,
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ instanceId }));
    dispatch(initInstanceContext({ instanceId }));
    dispatch(initInstanceUserInput({ instanceId }));
    dispatch(initInstanceClientTools({ instanceId }));
    dispatch(
      initInstanceUIState({
        instanceId,
        displayMode: (displayMode ??
          shortcut.resultDisplay) as ResultDisplayMode,
        allowChat: allowChat ?? shortcut.allowChat,
        showVariablePanel: showVariables ?? shortcut.showVariables,
        isCreator: snapshot.isCreator,
      }),
    );

    // 3. Apply scope mappings via universal utility
    const { variableValues, contextEntries } = mapScopeToInstance(
      uiScopes,
      shortcut.scopeMappings,
      snapshot.variableDefinitions,
      snapshot.contextSlots,
    );

    if (shortcut.applyVariables && Object.keys(variableValues).length > 0) {
      dispatch(setUserVariableValues({ instanceId, values: variableValues }));
    }

    if (contextEntries.length > 0) {
      dispatch(setContextEntries({ instanceId, entries: contextEntries }));
    }

    dispatch(initInstanceHistory({ instanceId }));

    return instanceId;
  },
);

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
    const instanceId = generateInstanceId();
    const state = getState() as RootState;

    const snapshot = readAgentSnapshot(state, agentId);
    const resolvedAgentType = agentType ?? snapshot.agentType;

    dispatch(
      createInstance({
        instanceId,
        agentId,
        agentType: resolvedAgentType,
        origin: "test" as InstanceOrigin,
        sourceFeature,
      }),
    );

    dispatch(
      initInstanceOverrides({
        instanceId,
        baseSettings: snapshot.baseSettings,
      }),
    );
    dispatch(
      initInstanceVariables({
        instanceId,
        definitions: snapshot.variableDefinitions,
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ instanceId }));
    dispatch(initInstanceContext({ instanceId }));
    dispatch(initInstanceUserInput({ instanceId, text: userInput }));
    dispatch(initInstanceClientTools({ instanceId }));
    dispatch(
      initInstanceUIState({
        instanceId,
        isCreator: snapshot.isCreator,
        showVariablePanel: snapshot.variableDefinitions.length > 0,
      }),
    );
    dispatch(initInstanceHistory({ instanceId }));

    if (variables && Object.keys(variables).length > 0) {
      dispatch(setUserVariableValues({ instanceId, values: variables }));
    }

    if (overrides && Object.keys(overrides).length > 0) {
      const { setOverrides } =
        await import("../instance-model-overrides/instance-model-overrides.slice");
      dispatch(setOverrides({ instanceId, changes: overrides }));
    }

    return instanceId;
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
      sourceFeature = "chat",
    },
    { dispatch },
  ) => {
    const instanceId = generateInstanceId();

    dispatch(
      createInstance({
        instanceId,
        agentId: "",
        agentType,
        origin: "manual" as InstanceOrigin,
        sourceFeature,
      }),
    );

    dispatch(initInstanceOverrides({ instanceId, baseSettings }));
    dispatch(
      initInstanceVariables({
        instanceId,
        definitions: variableDefinitions,
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ instanceId }));
    dispatch(initInstanceContext({ instanceId }));
    dispatch(initInstanceUserInput({ instanceId, text: userInput }));
    dispatch(initInstanceClientTools({ instanceId }));
    dispatch(
      initInstanceUIState({
        instanceId,
        showVariablePanel: variableDefinitions.length > 0,
      }),
    );
    dispatch(initInstanceHistory({ instanceId }));

    return instanceId;
  },
);

// =============================================================================
// Recreate Manual Instance (reset conversation, re-snapshot agent)
// =============================================================================

/**
 * Destroys the current instance and creates a fresh one for the same agent.
 * Re-snapshots the agent definition so any unsaved builder edits are picked up.
 * Preserves autoClearConversation and isCreator from the old UI state.
 *
 * Usage:
 *   dispatch(recreateManualInstance(instanceId)).unwrap().then(onNewInstance)
 */
export const recreateManualInstance = createAsyncThunk<string, string>(
  "instances/recreateManual",
  async (currentInstanceId, { dispatch, getState }) => {
    const state = getState() as RootState;

    const instance = state.executionInstances.byInstanceId[currentInstanceId];
    if (!instance) {
      throw new Error(`Instance ${currentInstanceId} not found`);
    }

    const { agentId, sourceFeature } = instance;
    const currentUIState =
      state.instanceUIState.byInstanceId[currentInstanceId];

    const snapshot = agentId ? readAgentSnapshot(state, agentId) : null;
    const newInstanceId = generateInstanceId();

    dispatch(
      createInstance({
        instanceId: newInstanceId,
        agentId,
        agentType: snapshot?.agentType ?? instance.agentType,
        origin: instance.origin as InstanceOrigin,
        sourceFeature: sourceFeature as SourceFeature,
      }),
    );

    dispatch(
      initInstanceOverrides({
        instanceId: newInstanceId,
        baseSettings: snapshot?.baseSettings ?? {},
      }),
    );
    dispatch(
      initInstanceVariables({
        instanceId: newInstanceId,
        definitions: snapshot?.variableDefinitions ?? [],
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ instanceId: newInstanceId }));
    dispatch(initInstanceContext({ instanceId: newInstanceId }));
    dispatch(initInstanceUserInput({ instanceId: newInstanceId }));
    dispatch(initInstanceClientTools({ instanceId: newInstanceId }));
    dispatch(
      initInstanceUIState({
        instanceId: newInstanceId,
        isCreator: snapshot?.isCreator ?? currentUIState?.isCreator ?? false,
        autoClearConversation: currentUIState?.autoClearConversation ?? true,
        showVariablePanel:
          (snapshot?.variableDefinitions.length ?? 0) > 0 ||
          (currentUIState?.showVariablePanel ?? false),
      }),
    );
    dispatch(initInstanceHistory({ instanceId: newInstanceId, mode: "agent" }));

    dispatch(destroyInstance(currentInstanceId));

    return newInstanceId;
  },
);

// =============================================================================
// Re-Instance and Execute (autoClearConversation path)
// =============================================================================

interface ReInstanceAndExecuteArgs {
  /** The current instance that has existing history */
  currentInstanceId: string;
  /** Called with the new instanceId so the parent component can update its state */
  onNewInstance: (newInstanceId: string) => void;
  debug?: boolean;
  /** When true, uses executeChatInstance instead of executeInstance and sets mode to "chat" */
  useChat?: boolean;
}

interface ReInstanceAndExecuteResult {
  newInstanceId: string;
  requestId: string;
  conversationId: string | null;
}

/**
 * Auto-Clear submit path.
 *
 * When `autoClearConversation` is ON and the instance already has conversation
 * history, submitting should NOT continue the existing conversation.
 * Instead:
 *   1. Read current variable values and user input text from the old instance
 *   2. Create a brand-new instance by re-snapshotting the agent definition
 *      (picks up any unsaved builder edits)
 *   3. Transfer variable values and user input into the new instance
 *   4. Destroy the old instance (clears the display)
 *   5. Execute on the new instance (fresh agent call, no conversationId)
 *
 * The `onNewInstance` callback lets the parent component swap its local
 * `instanceId` state so the display automatically binds to the new instance.
 */
export const reInstanceAndExecute = createAsyncThunk<
  ReInstanceAndExecuteResult,
  ReInstanceAndExecuteArgs
>(
  "instances/reInstanceAndExecute",
  async (
    { currentInstanceId, onNewInstance, debug = false, useChat = false },
    { dispatch, getState },
  ) => {
    const state = getState() as RootState;

    // Read what the user has filled in on the old instance BEFORE destroying it
    const currentInput =
      state.instanceUserInput.byInstanceId[currentInstanceId];
    const currentVariables =
      state.instanceVariableValues.byInstanceId[currentInstanceId];
    const currentUIState =
      state.instanceUIState.byInstanceId[currentInstanceId];

    const userInputText = currentInput?.text ?? "";
    const userValues = currentVariables?.userValues ?? {};

    // Retrieve the agentId stored in the instance record (agentId is only read
    // during instance creation — this is the next creation, so it's still valid)
    const instance = state.executionInstances.byInstanceId[currentInstanceId];
    if (!instance) {
      throw new Error(`Instance ${currentInstanceId} not found`);
    }
    const { agentId, origin, sourceFeature } = instance;

    const newInstanceId = generateInstanceId();
    const snapshot = agentId ? readAgentSnapshot(state, agentId) : null;

    dispatch(
      createInstance({
        instanceId: newInstanceId,
        agentId,
        agentType: snapshot?.agentType ?? instance.agentType,
        origin: origin as InstanceOrigin,
        sourceFeature: sourceFeature as SourceFeature,
      }),
    );

    dispatch(
      initInstanceOverrides({
        instanceId: newInstanceId,
        baseSettings: snapshot?.baseSettings ?? {},
      }),
    );
    dispatch(
      initInstanceVariables({
        instanceId: newInstanceId,
        definitions: snapshot?.variableDefinitions ?? [],
        scopeValues: {},
      }),
    );
    dispatch(initInstanceResources({ instanceId: newInstanceId }));
    dispatch(initInstanceContext({ instanceId: newInstanceId }));
    dispatch(initInstanceUserInput({ instanceId: newInstanceId }));
    dispatch(initInstanceClientTools({ instanceId: newInstanceId }));
    dispatch(
      initInstanceUIState({
        instanceId: newInstanceId,
        isCreator: snapshot?.isCreator ?? currentUIState?.isCreator ?? false,
        autoClearConversation: true,
        showVariablePanel:
          (snapshot?.variableDefinitions.length ?? 0) > 0 ||
          (currentUIState?.showVariablePanel ?? false),
        submitOnEnter: currentUIState?.submitOnEnter ?? true,
        reuseConversationId: currentUIState?.reuseConversationId ?? false,
        builderAdvancedSettings: currentUIState?.builderAdvancedSettings,
      }),
    );
    dispatch(
      initInstanceHistory({
        instanceId: newInstanceId,
        mode: useChat ? "chat" : "agent",
      }),
    );

    // Transfer whatever the user had filled in
    if (Object.keys(userValues).length > 0) {
      dispatch(
        setUserVariableValues({
          instanceId: newInstanceId,
          values: userValues,
        }),
      );
    }
    if (userInputText) {
      dispatch(
        setUserInputText({ instanceId: newInstanceId, text: userInputText }),
      );
    }

    // Notify the parent component to swap its instanceId — this causes the
    // display to immediately switch to the (empty) new instance
    onNewInstance(newInstanceId);

    // Destroy the old instance after the parent has been notified
    dispatch(destroyInstance(currentInstanceId));

    // Execute on the new instance — route to the correct thunk based on mode
    const result = useChat
      ? await dispatch(
          executeChatInstance({ instanceId: newInstanceId }),
        ).unwrap()
      : await dispatch(
          executeInstance({ instanceId: newInstanceId, debug }),
        ).unwrap();

    return {
      newInstanceId,
      requestId: result.requestId,
      conversationId: result.conversationId,
    };
  },
);

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
} from "@/features/agents/redux/agent-definition/types";
import type { LLMParams } from "@/features/agents/types";

import { generateInstanceId } from "../utils";
import { createInstance } from "../execution-instances/execution-instances.slice";
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
import { initInstanceUserInput } from "../instance-user-input/instance-user-input.slice";
import { initInstanceClientTools } from "../instance-client-tools/instance-client-tools.slice";
import { initInstanceUIState } from "../instance-ui-state/instance-ui-state.slice";
import { initInstanceHistory } from "../instance-conversation-history/instance-conversation-history.slice";
import {
  InstanceOrigin,
  ResultDisplayMode,
} from "@/features/agents/types/instance.types";

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
  /** Optional — if omitted, read from agentDefinition at creation time */
  agentType?: AgentType;
  /**
   * When true, conversation history is wiped after each submission so every
   * send starts a fresh agent call. Defaults to false.
   * Set true in builder/test panels.
   */
  autoClearConversation?: boolean;
}

export const createManualInstance = createAsyncThunk<
  string,
  CreateManualInstanceArgs
>(
  "instances/createManual",
  async ({ agentId, agentType, autoClearConversation = false }, { dispatch, getState }) => {
    const instanceId = generateInstanceId();
    const state = getState() as RootState;

    // Read agent snapshot ONCE — last time agentId is used
    const snapshot = readAgentSnapshot(state, agentId);
    const resolvedAgentType = agentType ?? snapshot.agentType;

    // 1. Create the instance shell
    dispatch(
      createInstance({
        instanceId,
        agentId,
        agentType: resolvedAgentType,
        origin: "manual" as InstanceOrigin,
      }),
    );

    // 2. Initialize all sibling slices with snapshotted data
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
      }),
    );
    dispatch(initInstanceHistory({ instanceId }));

    return instanceId;
  },
);

// =============================================================================
// Shortcut Instance Creation
// =============================================================================

interface CreateShortcutInstanceArgs {
  shortcutId: string;
  /**
   * Values from the UI (e.g., selected text, current item, recent history).
   * These get mapped to variables/context via the shortcut's scopeMappings.
   */
  uiScopes: Record<string, unknown>;
}

export const createInstanceFromShortcut = createAsyncThunk<
  string,
  CreateShortcutInstanceArgs
>(
  "instances/createFromShortcut",
  async ({ shortcutId, uiScopes }, { dispatch, getState }) => {
    const instanceId = generateInstanceId();
    const state = getState() as RootState;
    const shortcut = state.agentShortcut[shortcutId];

    if (!shortcut) throw new Error(`Shortcut ${shortcutId} not found`);

    const { agentId } = shortcut;

    // Read agent snapshot ONCE — last time agentId is used
    const snapshot = readAgentSnapshot(state, agentId);
    const slotKeys = new Set(snapshot.contextSlots.map((s) => s.key));

    // 1. Create instance shell
    dispatch(
      createInstance({
        instanceId,
        agentId,
        agentType: snapshot.agentType,
        origin: "shortcut" as InstanceOrigin,
        shortcutId,
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
        displayMode: shortcut.resultDisplay as ResultDisplayMode,
        allowChat: shortcut.allowChat,
        showVariablePanel: shortcut.showVariables,
        isCreator: snapshot.isCreator,
      }),
    );

    // 3. Apply scope mappings
    const mappings = shortcut.scopeMappings ?? [];
    const variableValues: Record<string, unknown> = {};
    const contextEntries: Array<{
      key: string;
      value: unknown;
      slotMatched?: boolean;
      label?: string;
    }> = [];
    const mappedKeys = new Set<string>();

    for (const mapping of mappings) {
      const value = uiScopes[mapping.sourceKey];
      if (value === undefined) continue;

      mappedKeys.add(mapping.sourceKey);

      if (mapping.mapTo === "variable") {
        variableValues[mapping.targetKey] = value;
      } else {
        contextEntries.push({
          key: mapping.targetKey,
          value,
          slotMatched: slotKeys.has(mapping.targetKey),
          label: mapping.targetKey,
        });
      }
    }

    // 4. Unmapped UI scopes fall through to context as ad-hoc
    for (const [key, value] of Object.entries(uiScopes)) {
      if (!mappedKeys.has(key) && value !== undefined) {
        contextEntries.push({
          key,
          value,
          slotMatched: slotKeys.has(key),
          label: key,
        });
      }
    }

    // 5. Apply variable values
    if (shortcut.applyVariables && Object.keys(variableValues).length > 0) {
      dispatch(setUserVariableValues({ instanceId, values: variableValues }));
    }

    // 6. Apply context entries
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
  /** Pre-configured variable values for this test case */
  variables?: Record<string, unknown>;
  /** Pre-configured overrides for this test case */
  overrides?: Partial<LLMParams>;
  /** Pre-configured user input for this test case */
  userInput?: string;
}

export const createTestInstance = createAsyncThunk<
  string,
  CreateTestInstanceArgs
>(
  "instances/createTest",
  async (
    { agentId, agentType, variables, overrides, userInput },
    { dispatch, getState },
  ) => {
    const instanceId = generateInstanceId();
    const state = getState() as RootState;

    // Read agent snapshot ONCE — last time agentId is used
    const snapshot = readAgentSnapshot(state, agentId);
    const resolvedAgentType = agentType ?? snapshot.agentType;

    // 1. Create instance shell
    dispatch(
      createInstance({
        instanceId,
        agentId,
        agentType: resolvedAgentType,
        origin: "test" as InstanceOrigin,
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
    dispatch(initInstanceUserInput({ instanceId, text: userInput }));
    dispatch(initInstanceClientTools({ instanceId }));
    dispatch(
      initInstanceUIState({ instanceId, isCreator: snapshot.isCreator }),
    );
    dispatch(initInstanceHistory({ instanceId }));

    // 3. Apply pre-configured values
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
  /** An identifier for display/tracking only — not used to look up any Redux state */
  label?: string;
  agentType?: AgentType;
  variableDefinitions?: VariableDefinition[];
  baseSettings?: Partial<LLMParams>;
  userInput?: string;
}

/**
 * Create an instance without a source agent.
 * Use this for direct chat, custom tool invocations, or any flow
 * where you want full control over the configuration from the start.
 */
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
    },
    { dispatch },
  ) => {
    const instanceId = generateInstanceId();

    // No agentId — create shell without one, using a placeholder
    dispatch(
      createInstance({
        instanceId,
        agentId: "",
        agentType,
        origin: "manual" as InstanceOrigin,
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
    dispatch(initInstanceUIState({ instanceId }));
    dispatch(initInstanceHistory({ instanceId }));

    return instanceId;
  },
);

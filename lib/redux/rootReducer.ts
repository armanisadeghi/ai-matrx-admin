// lib/redux/rootReducer.ts
"use client";
import { combineReducers, Reducer } from "@reduxjs/toolkit";
import { featureSchemas } from "./dynamic/featureSchema";
import { createFeatureSlice } from "./slices/featureSliceCreator";
import { createModuleSlice } from "./slices/moduleSliceCreator";
import { moduleSchemas, ModuleName } from "./dynamic/moduleSchema";
import layoutReducer from "./slices/layoutSlice";
import formReducer from "./slices/formSlice";
import userReducer from "./slices/userSlice";

import userPreferencesReducer from "./slices/userPreferencesSlice";
import testRoutesReducer from "./slices/testRoutesSlice";
import flashcardChatReducer from "./slices/flashcardChatSlice";
import adminDebugReducer from "./slices/adminDebugSlice";
import themeReducer from "@/styles/themes/themeSlice";
import { InitialReduxState } from "@/types/reduxTypes";
import { createGlobalCacheSlice } from "@/lib/redux/schema/globalCacheSlice";
import uiReducer from "./ui/uiSlice";
import {
  entitySliceRegistry,
  initializeEntitySlices,
} from "./entity/entitySlice";
import { fieldReducer } from "@/lib/redux/concepts/fields/fieldSlice";
import { storageReducer } from "./storage";
import { createFileSystemSlice } from "./fileSystem/slice";
import { AvailableBuckets, FileManagement } from "./fileSystem/types";
import { UnifiedSchemaCache } from "@/types/entityTypes";

import socketConnectionReducer from "./socket-io/slices/socketConnectionsSlice";
import socketResponseReducer from "./socket-io/slices/socketResponseSlice";
import socketTasksReducer from "./socket-io/slices/socketTasksSlice";
import { componentDefinitionsSlice } from "./app-runner/slices/componentDefinitionsSlice";
import { appBuilderSlice } from "./app-builder/slices/appBuilderSlice";
import { appletBuilderSlice } from "./app-builder/slices/appletBuilderSlice";
import { containerBuilderSlice } from "./app-builder/slices/containerBuilderSlice";
import { fieldBuilderSlice } from "./app-builder/slices/fieldBuilderSlice";
import customAppRuntimeSlice from "./app-runner/slices/customAppRuntimeSlice";
import customAppletRuntimeSlice from "./app-runner/slices/customAppletRuntimeSlice";

// import { brokerValuesSlice } from "./app-runner/slices/brokerValuesSlice";
// import brokersSlice from "./app-runner/slices/brokerSlice";
import brokerSlice from "./brokerSlice/slice";
import overlaySlice from "./slices/overlaySlice";
import overlayDataReducer from "./slices/overlayDataSlice";
import voicePadReducer from "./slices/voicePadSlice";
import windowManagerReducer from "./slices/windowManagerSlice";
import dbFunctionNodeSlice from "./workflows/db-function-node/dbFunctionNodeSlice";
import workflowSlice from "./workflow/slice";
import workflowNodeSlice from "./workflow-nodes/slice";
import canvasReducer from "@/features/canvas/redux/canvasSlice";
import textDiffReducer from "./slices/textDiffSlice";
import noteVersionsReducer from "./slices/noteVersionsSlice";
import notesReducer from "@/features/notes/redux/slice";
import messagingReducer from "@/features/messaging/redux/messagingSlice";
import smsReducer from "@/features/sms/redux/smsSlice";
import adminPreferencesReducer from "./slices/adminPreferencesSlice";
import apiConfigReducer from "./slices/apiConfigSlice";
import activeChatReducer from "../../features/agents/redux/old/activeChatSlice";
import entitySystemReducer from "./slices/entitySystemSlice";
import urlSyncReducer from "./slices/urlSyncSlice";

// Agent cache — unified slim/core/operational store for user prompts + builtins + shared
import agentCacheReducer from "./slices/agentCacheSlice";
import agentDefinitionReducer from "@/features/agents/redux/agent-definition/slice";
import { agentConversationsReducer } from "@/features/agents/redux/agent-conversations";
import agentShortcutReducer from "@/features/agents/redux/agent-shortcuts/slice";
import { agentAppReducer } from "@/features/agents/redux/agent-apps/slice";
import agentConsumersReducer from "@/features/agents/redux/agent-consumers/slice";
import toolsReducer from "@/features/agents/redux/tools/tools.slice";
// import agentExecutionReducer from "@/features/agents/_garbage/agent-execution/slice";

// Prompt system
import promptCacheReducer from "./slices/promptCacheSlice";
import promptConsumersReducer from "./slices/promptConsumersSlice";
import contextMenuCacheReducer from "./slices/contextMenuCacheSlice";
import promptRunnerReducer from "./slices/promptRunnerSlice";
import promptExecutionReducer from "./prompt-execution/slice";
import actionCacheReducer from "./prompt-execution/actionCacheSlice";
import promptEditorReducer from "./slices/promptEditorSlice";
import modelRegistryReducer from "../../features/ai-models/redux/modelRegistrySlice";
import { chatConversationsReducer } from "@/features/agents/redux/old/OLD-cx-message-actions";
import { messageActionsReducer } from "@/features/agents/redux/old/OLD-cx-message-actions/messageActionsSlice";
import { agentSettingsReducer } from "./slices/agent-settings";

import cxConversationsReducer from "@/features/agents/redux/old/OLD-cx-conversation/cx-conversations.slice";
import artifactsReducer from "./slices/artifactsSlice";
import htmlPagesReducer from "./slices/htmlPagesSlice";

import mcpReducer from "@/features/agents/redux/mcp/mcp.slice";
import appContextReducer from "@/features/agent-context/redux/appContextSlice";
import hierarchyReducer from "@/features/agent-context/redux/hierarchySlice";
import organizationsReducer from "@/features/agent-context/redux/organizationsSlice";
import projectsReducer from "@/features/agent-context/redux/projectsSlice";
import tasksReducer from "@/features/agent-context/redux/tasksSlice";
import {
  scopeTypesReducer,
  scopesReducer,
  scopeAssignmentsReducer,
  scopeContextReducer,
} from "@/features/agent-context/redux/scope";

import { instanceUIStateReducer } from "@/features/agents/redux/execution-system/instance-ui-state";
import { instanceClientToolsReducer } from "@/features/agents/redux/execution-system/instance-client-tools";
import { instanceContextReducer } from "@/features/agents/redux/execution-system/instance-context";
import { instanceModelOverridesReducer } from "@/features/agents/redux/execution-system/instance-model-overrides";
import { instanceVariableValuesReducer } from "@/features/agents/redux/execution-system/instance-variable-values";
import { instanceResourcesReducer } from "@/features/agents/redux/execution-system/instance-resources";
import { instanceUserInputReducer } from "@/features/agents/redux/execution-system/instance-user-input";
import { executionInstancesReducer } from "@/features/agents/redux/execution-system/execution-instances";
import { activeRequestsReducer } from "@/features/agents/redux/execution-system/active-requests";
import { instanceConversationHistoryReducer } from "@/features/agents/redux/execution-system/instance-conversation-history";
import { conversationFocusReducer } from "@/features/agents/redux/execution-system/conversation-focus";
import agentAssistantMarkdownDraftReducer from "@/features/agents/redux/agent-assistant-markdown-draft.slice";

export type FileSystemState = { [K in AvailableBuckets]: FileManagement };

export const availableBuckets = [
  "userContent",
  "Audio",
  "Images",
  "Documents",
  "Videos",
  "Code",
  "any-file",
  "userContent",
  "code-editor",
  "Notes",
  "Spreadsheets",
  "audio-recordings",
  "app-assets",
] as const;

const fileSystemReducers = availableBuckets.reduce<{
  [K in AvailableBuckets]: Reducer<FileManagement>;
}>(
  (acc, bucket) => {
    acc[bucket] = createFileSystemSlice(bucket).reducer;
    return acc;
  },
  {} as { [K in AvailableBuckets]: Reducer<FileManagement> },
);

const featureReducers = Object.keys(featureSchemas).reduce(
  (acc, featureName) => {
    const featureSchema =
      featureSchemas[featureName as keyof typeof featureSchemas];
    const featureSlice = createFeatureSlice(featureName as any, featureSchema);
    acc[featureName] = featureSlice.reducer;
    return acc;
  },
  {} as Record<string, any>,
);

const moduleReducers = Object.keys(moduleSchemas).reduce(
  (acc, moduleName) => {
    const moduleSchema =
      moduleSchemas[moduleName as keyof typeof moduleSchemas];
    const moduleSlice = createModuleSlice(
      moduleName as ModuleName,
      moduleSchema,
    );
    acc[moduleName] = moduleSlice.reducer;
    return acc;
  },
  {} as Record<string, any>,
);

export const createRootReducer = (initialState: InitialReduxState) => {
  const entityNames = initialState.globalCache?.entityNames ?? [];
  const hasEntities = entityNames.length > 0;

  if (hasEntities) {
    console.warn(
      "[WARNING REDUX STARTED WITH LARGE INITIAL STATE] --- WARNING... ENTITIES MUST BE LAZY LOADED",
    );
  }

  initializeEntitySlices(initialState.globalCache.schema);
  const entityReducers = Object.fromEntries(
    Array.from(entitySliceRegistry.entries()).map(([key, slice]) => [
      key,
      slice.reducer,
    ]),
  );

  const globalCacheSlice = createGlobalCacheSlice(
    initialState.globalCache as UnifiedSchemaCache,
  );

  const entitiesReducer =
    Object.keys(entityReducers).length > 0
      ? combineReducers(entityReducers)
      : (((state: Record<string, unknown> = {}) => state) as Reducer);

  return combineReducers({
    user: userReducer,
    userPreferences: userPreferencesReducer,

    adminDebug: adminDebugReducer,
    overlays: overlaySlice,
    overlayData: overlayDataReducer,
    voicePad: voicePadReducer,
    windowManager: windowManagerReducer,
    urlSync: urlSyncReducer,

    // Canvas and Artifacts system ----------
    canvas: canvasReducer,
    // Artifact tracking — universal registry for all AI-generated content
    artifacts: artifactsReducer,
    // HTML pages — editor session state + page catalog
    htmlPages: htmlPagesReducer,

    // Text diff system
    textDiff: textDiffReducer,
    noteVersions: noteVersionsReducer,
    notes: notesReducer,
    // SMS integration
    sms: smsReducer,

    theme: themeReducer,

    ...featureReducers,
    ...moduleReducers,
    fileSystem: combineReducers(fileSystemReducers) as Reducer<FileSystemState>,
    entities: entitiesReducer,
    entityFields: fieldReducer,
    layout: layoutReducer,
    form: formReducer,
    testRoutes: testRoutesReducer,
    flashcardChat: flashcardChatReducer,
    globalCache: globalCacheSlice.reducer,
    ui: uiReducer,
    storage: storageReducer,

    // Active chat page state (selected agent, block mode, agent picker)
    activeChat: activeChatReducer,

    // Unified chat conversation UI slice (replaces ChatContext + prompt-execution for display)
    chatConversations: chatConversationsReducer,

    // Instance-based message action overlays (Save to Notes, Email, Auth Gate, etc.)
    messageActions: messageActionsReducer,

    // ===== OLD SOCKET.IO SYSTEM (DEPRECATED) ====
    socketConnections: socketConnectionReducer,
    socketResponse: socketResponseReducer,
    socketTasks: socketTasksReducer,

    // ==== OLD APPLET SYSTEM (DEPRECATED) ====
    componentDefinitions: componentDefinitionsSlice.reducer,
    appBuilder: appBuilderSlice.reducer,
    appletBuilder: appletBuilderSlice.reducer,
    containerBuilder: containerBuilderSlice.reducer,
    fieldBuilder: fieldBuilderSlice.reducer,
    customAppRuntime: customAppRuntimeSlice,
    customAppletRuntime: customAppletRuntimeSlice,
    broker: brokerSlice, // Concept broker implementation

    // OLD PROMPT SYSTEM - WELL-BUILT but built on socket.io and recipes, not agents. (DEPRECATED)
    contextMenuCache: contextMenuCacheReducer,
    agentCache: agentCacheReducer,
    promptCache: promptCacheReducer,
    promptConsumers: promptConsumersReducer,
    promptRunner: promptRunnerReducer,
    promptExecution: promptExecutionReducer,
    actionCache: actionCacheReducer,

    dbFunctionNode: dbFunctionNodeSlice,

    workflows: workflowSlice,
    workflowNodes: workflowNodeSlice,

    // Prompt Editor (Redux)
    promptEditor: promptEditorReducer,

    // Messaging system
    messaging: messagingReducer,

    // Admin preferences (legacy server fields migrated to apiConfig — kept for UI-only prefs)
    adminPreferences: adminPreferencesReducer,

    // Entity system load status (on-demand schema + slices)
    entitySystem: entitySystemReducer,

    // Agent Settings — unified settings management for all agent/prompt contexts
    // (builder, chat session overrides, multi-agent testing)
    agentSettings: agentSettingsReducer,

    // ==================================== RELATED TO AGENTS: ====================================

    // cx_ conversation sidebar list — Tier 1/2 from cx_conversation table
    cxConversations: cxConversationsReducer,

    modelRegistry: modelRegistryReducer,

    // API config — single source of truth for active server, health, and call log
    apiConfig: apiConfigReducer,

    // NEW AGENTS SYSTEM =======================================================

    // Layer 1 — Agent Source
    agentDefinition: agentDefinitionReducer,
    agentConversations: agentConversationsReducer,
    agentShortcut: agentShortcutReducer,
    // agentApp — scaffolded alongside agentShortcut. Thunks are stubbed until
    // the App DB surface ships; the slice is registered so consumers can
    // read/write state without further plumbing later.
    agentApp: agentAppReducer,
    agentConsumers: agentConsumersReducer,
    tools: toolsReducer,

    // Layer 2 — App Context (scope injected automatically into every API call by callApi)
    appContext: appContextReducer,

    // Hierarchy tree cache — org/project/task tree from RPC
    hierarchy: hierarchyReducer,

    // Normalized entity slices (hydrated from hierarchy RPC, with data-level tracking)
    organizations: organizationsReducer,
    projects: projectsReducer,
    tasks: tasksReducer,

    // Scope system — ctx_scope_types, ctx_scopes, ctx_scope_assignments, resolved context
    scopeTypes: scopeTypesReducer,
    scopes: scopesReducer,
    scopeAssignments: scopeAssignmentsReducer,
    scopeContext: scopeContextReducer,

    // Layer 3 — Prompt Instances
    executionInstances: executionInstancesReducer,
    instanceModelOverrides: instanceModelOverridesReducer,
    instanceVariableValues: instanceVariableValuesReducer,
    instanceResources: instanceResourcesReducer,
    instanceContext: instanceContextReducer,
    instanceUserInput: instanceUserInputReducer,
    instanceClientTools: instanceClientToolsReducer,
    instanceUIState: instanceUIStateReducer,

    // // Layer 4 — Request Execution
    activeRequests: activeRequestsReducer,
    instanceConversationHistory: instanceConversationHistoryReducer,

    // Surface Focus Registry — tracks which conversationId is active per UI surface
    conversationFocus: conversationFocusReducer,
    agentAssistantMarkdownDraft: agentAssistantMarkdownDraftReducer,

    // MCP Catalog — global server registry + per-user connection state
    mcp: mcpReducer,

    // Just garbage that makes no sense!
    // agentExecution: agentExecutionReducer,
  });
};

// buttonBuilder: buttonBuilderSlice.reducer,
// brokerMapping: brokerMappingSlice.reducer,
// recipeBuilder: recipeBuilderSlice.reducer,
// workflowBuilder: workflowBuilderSlice.reducer,

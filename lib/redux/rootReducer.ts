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
import aiChatReducer from "./slices/aiChatSlice";
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
import { conversationReducer } from "./features/aiChats/conversationSlice";
import { messagesReducer } from "./features/aiChats/messagesSlice";
import { newMessageReducer } from "./features/aiChats/newMessageSlice";
import chatDisplayReducer from "./features/aiChats/chatDisplaySlice";
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
import dbFunctionNodeSlice from "./workflows/db-function-node/dbFunctionNodeSlice";
import workflowSlice from "./workflow/slice";
import workflowNodeSlice from "./workflow-nodes/slice";
import canvasReducer from "@/features/canvas/redux/canvasSlice";
import textDiffReducer from "./slices/textDiffSlice";
import noteVersionsReducer from "./slices/noteVersionsSlice";
import messagingReducer from "@/features/messaging/redux/messagingSlice";
import smsReducer from "@/features/sms/redux/smsSlice";
import adminPreferencesReducer from "./slices/adminPreferencesSlice";
import appContextReducer from "./slices/appContextSlice";
import apiConfigReducer from "./slices/apiConfigSlice";
import activeChatReducer from "./slices/activeChatSlice";
import entitySystemReducer from "./slices/entitySystemSlice";

// Agent cache — unified slim/core/operational store for user prompts + builtins + shared
import agentCacheReducer from "./slices/agentCacheSlice";
import agentDefinitionReducer from "@/features/agents/redux/agent-definition/slice";
import agentShortcutReducer from "@/features/agents/redux/agent-shortcuts/slice";
import agentConsumersReducer from "@/features/agents/redux/agent-consumers/slice";
import agentExecutionReducer from "@/features/agents/redux/agent-execution/slice";

// Prompt system
import promptCacheReducer from "./slices/promptCacheSlice";
import promptConsumersReducer from "./slices/promptConsumersSlice";
import contextMenuCacheReducer from "./slices/contextMenuCacheSlice";
import promptRunnerReducer from "./slices/promptRunnerSlice";
import promptExecutionReducer from "./prompt-execution/slice";
import actionCacheReducer from "./prompt-execution/actionCacheSlice";
import promptEditorReducer from "./slices/promptEditorSlice";
import modelRegistryReducer from "../../features/ai-models/redux/modelRegistrySlice";
import { chatConversationsReducer } from "@/features/cx-conversation/redux";
import { messageActionsReducer } from "@/features/cx-conversation/redux/messageActionsSlice";
import artifactsReducer from "./slices/artifactsSlice";
import htmlPagesReducer from "./slices/htmlPagesSlice";
import { agentSettingsReducer } from "./slices/agent-settings";

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
    ...featureReducers,
    ...moduleReducers,
    fileSystem: combineReducers(fileSystemReducers) as Reducer<FileSystemState>,
    entities: entitiesReducer,
    entityFields: fieldReducer,
    layout: layoutReducer,
    theme: themeReducer,
    form: formReducer,
    user: userReducer,
    userPreferences: userPreferencesReducer,
    testRoutes: testRoutesReducer,
    flashcardChat: flashcardChatReducer,
    aiChat: aiChatReducer,
    adminDebug: adminDebugReducer,
    globalCache: globalCacheSlice.reducer,
    ui: uiReducer,
    storage: storageReducer,
    conversation: conversationReducer,
    messages: messagesReducer,
    newMessage: newMessageReducer,
    chatDisplay: chatDisplayReducer,

    socketConnections: socketConnectionReducer,
    socketResponse: socketResponseReducer,
    socketTasks: socketTasksReducer,

    componentDefinitions: componentDefinitionsSlice.reducer,

    appBuilder: appBuilderSlice.reducer,
    appletBuilder: appletBuilderSlice.reducer,
    containerBuilder: containerBuilderSlice.reducer,
    fieldBuilder: fieldBuilderSlice.reducer,

    customAppRuntime: customAppRuntimeSlice,
    customAppletRuntime: customAppletRuntimeSlice,

    broker: brokerSlice, // Concept broker implementation

    overlays: overlaySlice,
    overlayData: overlayDataReducer,
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

    canvas: canvasReducer,

    // Text diff system
    textDiff: textDiffReducer,
    noteVersions: noteVersionsReducer,

    // Prompt Editor (Redux)
    promptEditor: promptEditorReducer,
    modelRegistry: modelRegistryReducer,

    // Messaging system
    messaging: messagingReducer,

    // SMS integration
    sms: smsReducer,

    // API config — single source of truth for active server, health, and call log
    apiConfig: apiConfigReducer,

    // Admin preferences (legacy server fields migrated to apiConfig — kept for UI-only prefs)
    adminPreferences: adminPreferencesReducer,

    // App context — unified "where are you working" hierarchy (org → workspace → project → task → conversation)
    appContext: appContextReducer,

    // Active chat page state (selected agent, block mode, agent picker)
    activeChat: activeChatReducer,

    // Unified chat conversation UI slice (replaces ChatContext + prompt-execution for display)
    chatConversations: chatConversationsReducer,

    // Instance-based message action overlays (Save to Notes, Email, Auth Gate, etc.)
    messageActions: messageActionsReducer,

    // Entity system load status (on-demand schema + slices)
    entitySystem: entitySystemReducer,

    // Artifact tracking — universal registry for all AI-generated content
    artifacts: artifactsReducer,

    // HTML pages — editor session state + page catalog
    htmlPages: htmlPagesReducer,

    // Agent Settings — unified settings management for all agent/prompt contexts
    // (builder, chat session overrides, multi-agent testing)
    agentSettings: agentSettingsReducer,

    // NEW AGENTS SYSTEM =======================================================

    // Layer 1 — Agent Source
    agentDefinition: agentDefinitionReducer,
    agentShortcut: agentShortcutReducer,
    agentConsumers: agentConsumersReducer,
    agentExecution: agentExecutionReducer,

    // // (remaining layers — pending)
    // agents: agentsReducer,
    // agentModelConfig: agentModelConfigReducer,
    // agentVariableDefinitions: agentVariableDefinitionsReducer,
    // agentTools: agentToolsReducer,
    // agentContextSlots: agentContextSlotsReducer,
    // agentShortcuts: agentShortcutsReducer,

    // // Layer 2 — Active Scopes
    // activeScopes: activeScopesReducer,

    // // Layer 3 — Prompt Instances
    // promptInstances: promptInstancesReducer,
    // instanceModelOverrides: instanceModelOverridesReducer,
    // instanceVariableValues: instanceVariableValuesReducer,
    // instanceResources: instanceResourcesReducer,
    // instanceContext: instanceContextReducer,
    // instanceUserInput: instanceUserInputReducer,
    // instanceClientTools: instanceClientToolsReducer,
    // instanceUIState: instanceUIStateReducer,

    // // Layer 4 — Request Execution
    // activeRequests: activeRequestsReducer,
  });
};

// buttonBuilder: buttonBuilderSlice.reducer,
// brokerMapping: brokerMappingSlice.reducer,
// recipeBuilder: recipeBuilderSlice.reducer,
// workflowBuilder: workflowBuilderSlice.reducer,

// lib/redux/liteRootReducer.ts
// Lightweight root reducer for SSR and public routes — no entities, no sagas, no socket.io
"use client";

import { combineReducers } from "@reduxjs/toolkit";

// Core UI
import layoutReducer from "./slices/layoutSlice";
import themeReducer from "@/styles/themes/themeSlice";
import overlaySlice from "./slices/overlaySlice";
import overlayDataReducer from "./slices/overlayDataSlice";

// Message actions instance tracking (registers per-message context for overlay dispatch)
import { messageActionsReducer } from "@/features/cx-conversation/redux/messageActionsSlice";

// Artifact registry + HTML page sessions (used by HtmlPreviewBridge in OverlayController)
import artifactsReducer from "./slices/artifactsSlice";
import htmlPagesReducer from "./slices/htmlPagesSlice";

// User
import userReducer from "./slices/userSlice";
import userPreferencesReducer from "./slices/userPreferencesSlice";

// Admin
import adminPreferencesReducer from "./slices/adminPreferencesSlice";
import adminDebugReducer from "./slices/adminDebugSlice";

// API config — single source of truth for active server, health, and call log
import apiConfigReducer from "./slices/apiConfigSlice";

// Canvas
import canvasReducer from "@/features/canvas/redux/canvasSlice";

// Prompt system (all start empty, hydrate on demand)
import promptCacheReducer from "./slices/promptCacheSlice";
import promptRunnerReducer from "./slices/promptRunnerSlice";
import promptExecutionReducer from "./prompt-execution/slice";
import actionCacheReducer from "./prompt-execution/actionCacheSlice";
import modelRegistryReducer from "./slices/modelRegistrySlice";

// Socket.IO (connection starts disconnected, connects on-demand via LazySocketInitializer)
import socketConnectionReducer from "./socket-io/slices/socketConnectionsSlice";

// Execution infrastructure (empty initial state, populated only during active AI tasks)
import socketResponseReducer from "./socket-io/slices/socketResponseSlice";
import socketTasksReducer from "./socket-io/slices/socketTasksSlice";
import brokerReducer from "./brokerSlice/slice";

// Messaging (empty until messaging panel opens, hydrated by LazyMessagingInitializer)
import messagingReducer from "@/features/messaging/redux/messagingSlice";

// SMS
import smsReducer from "@/features/sms/redux/smsSlice";

// Unified conversation system (empty until chat session starts)
import { chatConversationsReducer } from "@/features/cx-conversation/redux";

// Chat system (empty until chat page loads)
import { conversationReducer } from "./features/aiChats/conversationSlice";
import { messagesReducer } from "./features/aiChats/messagesSlice";
import { newMessageReducer } from "./features/aiChats/newMessageSlice";
import chatDisplayReducer from "./features/aiChats/chatDisplaySlice";
import aiChatReducer from "./slices/aiChatSlice";
import flashcardChatReducer from "./slices/flashcardChatSlice";

// Text editing (empty until editor loads)
import textDiffReducer from "./slices/textDiffSlice";
import noteVersionsReducer from "./slices/noteVersionsSlice";
import promptEditorReducer from "./slices/promptEditorSlice";

// UI state (empty)
import uiReducer from "./ui/uiSlice";
import formReducer from "./slices/formSlice";
import testRoutesReducer from "./slices/testRoutesSlice";

// Entity system tracking (starts uninitialized, set when entities are loaded on-demand)
import entitySystemReducer from "./slices/entitySystemSlice";

// Context menu cache (populated server-side via get_ssr_shell_data RPC)
import contextMenuCacheReducer from "./slices/contextMenuCacheSlice";

// Active chat page state (selected agent, block mode, agent picker)
import activeChatReducer from "./slices/activeChatSlice";

// App context (org/workspace/project/task/conversation scope — required by callApi resolveScope)
import appContextReducer from "./slices/appContextSlice";

// ============================================================================
// LITE ROOT REDUCER — SSR Shell + Public Routes
// ============================================================================
// All slices initialize with empty/default state. No blocking fetches.
// Store is created instantly, then hydrated after render via RPC or thunks.
//
// INCLUDED:
// - layout, theme, overlays: Core UI state
// - user, userPreferences: Identity and settings
// - adminPreferences, adminDebug: Admin tools (lazy, only active for admins)
// - canvas: Canvas panel state
// - promptCache, promptRunner, promptExecution, actionCache: Prompt system
// - modelRegistry: AI model list (pre-populated from SSR RPC; thunk skipped if hydrated)
// - socketConnections: Socket.io connection state (starts disconnected, lazy-connect)
// - socketResponse, socketTasks: Execution task tracking (empty until AI execution)
// - broker: Key-value broker (empty, no auto-providers; populated by streaming events)
// - sms: SMS conversations (unreadTotal pre-populated; full list fetched on demand)
// - contextMenuCache: Raw context_menu_unified_view rows (pre-populated from SSR RPC)
//
// - messaging: Direct messages (empty, lazy-initialized on first panel open)
// - conversation, messages, newMessage, chatDisplay: AI chat system
// - aiChat, flashcardChat: Chat features
// - textDiff, noteVersions: Text editing/versioning
// - promptEditor: Prompt editor state
// - ui, form, testRoutes: General UI state
//
// EXCLUDED (require entities, sagas, or dynamic injection via replaceReducer):
// - entities, globalCache, entityFields: Entity system (~134 slices + 108K schema)
// - workflows, workflowNodes: Saga-dependent
// - appBuilder, appletBuilder, etc.: Feature-specific builders (injected with entity system)
// - fileSystem: Bucket-based file management (injected via provider packs)
// - storage: File storage state (injected with fileSystem)
// - componentDefinitions: App runner component defs (injected on demand)
// - customAppRuntime, customAppletRuntime: App runners (injected on demand)
// ============================================================================

/**
 * Creates a lightweight root reducer for SSR and public routes.
 *
 * ~90% smaller than the full root reducer. All slices start empty.
 * Keys match the full root reducer so selectors and hooks are portable.
 */
export const createLiteRootReducer = () => {
  return combineReducers({
    // Core UI
    layout: layoutReducer,
    theme: themeReducer,
    overlays: overlaySlice,
    overlayData: overlayDataReducer,

    // Message action instance tracking (content + sessionId per message bar)
    messageActions: messageActionsReducer,

    // Artifact registry + HTML page sessions (required by HtmlPreviewBridge, available in all routes)
    artifacts: artifactsReducer,
    htmlPages: htmlPagesReducer,

    // User
    user: userReducer,
    userPreferences: userPreferencesReducer,

    // API config — single source of truth for active server, health, and call log
    apiConfig: apiConfigReducer,

    // Admin
    adminPreferences: adminPreferencesReducer,
    adminDebug: adminDebugReducer,

    // Canvas
    canvas: canvasReducer,

    // Prompt system
    promptCache: promptCacheReducer,
    promptRunner: promptRunnerReducer,
    promptExecution: promptExecutionReducer,
    actionCache: actionCacheReducer,
    modelRegistry: modelRegistryReducer,

    // Socket.IO connection (starts disconnected, connects on-demand)
    socketConnections: socketConnectionReducer,

    // Execution infrastructure (all start empty, populated during AI tasks)
    socketResponse: socketResponseReducer,
    socketTasks: socketTasksReducer,
    broker: brokerReducer,

    // Messaging (starts empty, initialized when messaging panel opens)
    messaging: messagingReducer,

    // SMS
    sms: smsReducer,

    // Unified conversation system (starts empty, initialized per session)
    chatConversations: chatConversationsReducer,

    // Chat system (all start empty, populated when chat pages load)
    conversation: conversationReducer,
    messages: messagesReducer,
    newMessage: newMessageReducer,
    chatDisplay: chatDisplayReducer,
    aiChat: aiChatReducer,
    flashcardChat: flashcardChatReducer,

    // Text editing
    textDiff: textDiffReducer,
    noteVersions: noteVersionsReducer,
    promptEditor: promptEditorReducer,

    // UI state
    ui: uiReducer,
    form: formReducer,
    testRoutes: testRoutesReducer,

    // Entity system status (tracks on-demand loading)
    entitySystem: entitySystemReducer,

    // Context menu cache (SSR pre-populated, no client fetch)
    contextMenuCache: contextMenuCacheReducer,

    // Active chat page state (selected agent, block mode, agent picker)
    activeChat: activeChatReducer,

    // App context scope — required by callApi.resolveScope() for org/workspace/project/task/conversation
    appContext: appContextReducer,
  });
};

// Type for the lite root state
export type LiteRootState = ReturnType<
  ReturnType<typeof createLiteRootReducer>
>;

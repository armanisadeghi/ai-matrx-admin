// lib/redux/liteRootReducer.ts
// Lightweight root reducer for SSR and public routes — no entities, no sagas, no socket.io
"use client";

import { combineReducers } from "@reduxjs/toolkit";

// Core UI
import layoutReducer from "./slices/layoutSlice";
import themeReducer from "@/styles/themes/themeSlice";
import overlaySlice from "./slices/overlaySlice";

// User
import userReducer from "./slices/userSlice";
import userPreferencesReducer from "./slices/userPreferencesSlice";

// Admin
import adminPreferencesReducer from "./slices/adminPreferencesSlice";
import adminDebugReducer from "./slices/adminDebugSlice";

// Canvas
import canvasReducer from "../../features/canvas/redux/canvasSlice";

// Prompt system (all start empty, hydrate on demand)
import promptCacheReducer from "./slices/promptCacheSlice";
import promptRunnerReducer from "./slices/promptRunnerSlice";
import promptExecutionReducer from "./prompt-execution/slice";
import actionCacheReducer from "./prompt-execution/actionCacheSlice";
import modelRegistryReducer from "./slices/modelRegistrySlice";

// Execution infrastructure (empty initial state, populated only during active AI tasks)
import socketResponseReducer from "./socket-io/slices/socketResponseSlice";
import socketTasksReducer from "./socket-io/slices/socketTasksSlice";
import brokerReducer from "./brokerSlice/slice";

// SMS
import smsReducer from "../../features/sms/redux/smsSlice";

// Context menu cache (populated server-side via get_ssr_shell_data RPC)
import contextMenuCacheReducer from "./slices/contextMenuCacheSlice";

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
// - socketResponse, socketTasks: Execution task tracking (empty until AI execution)
// - broker: Key-value broker (empty, no auto-providers; populated by streaming events)
// - sms: SMS conversations (unreadTotal pre-populated; full list fetched on demand)
// - contextMenuCache: Raw context_menu_unified_view rows (pre-populated from SSR RPC)
//
// EXCLUDED (require entities, sagas, or socket.io):
// - entities, globalCache, entityFields: Entity system (~134 slices + 108K schema)
// - socketConnections: Socket.io connection middleware (not needed for FastAPI path)
// - workflows, workflowNodes: Saga-dependent
// - appBuilder, appletBuilder, etc.: Feature-specific builders
// - fileSystem: Bucket-based file management
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

        // User
        user: userReducer,
        userPreferences: userPreferencesReducer,

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

        // Execution infrastructure (all start empty, populated during AI tasks)
        socketResponse: socketResponseReducer,
        socketTasks: socketTasksReducer,
        broker: brokerReducer,

        // SMS
        sms: smsReducer,

        // Context menu cache (SSR pre-populated, no client fetch)
        contextMenuCache: contextMenuCacheReducer,
    });
};

// Type for the lite root state
export type LiteRootState = ReturnType<ReturnType<typeof createLiteRootReducer>>;

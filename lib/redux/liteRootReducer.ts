// lib/redux/liteRootReducer.ts
// Lightweight root reducer for public/lite routes that don't need entities, socket.io, or sagas
"use client";

import { combineReducers } from "@reduxjs/toolkit";
import layoutReducer from "./slices/layoutSlice";
import userReducer from "./slices/userSlice";
import userPreferencesReducer from "./slices/userPreferencesSlice";
import { themeReducer } from "@/styles/themes";
import uiReducer from "./ui/uiSlice";
import overlaySlice from "./slices/overlaySlice";
import canvasReducer from "../../features/canvas/redux/canvasSlice";
import textDiffReducer from "./slices/textDiffSlice";
import noteVersionsReducer from "./slices/noteVersionsSlice";

// Prompt system
import promptCacheReducer from "./slices/promptCacheSlice";
import promptRunnerReducer from "./slices/promptRunnerSlice";
import promptExecutionReducer from "./prompt-execution/slice";
import modelRegistryReducer from "./slices/modelRegistrySlice";

/**
 * Creates a lightweight root reducer for routes that don't need:
 * - Entity system (50+ dynamic slices based on schema)
 * - Socket.io integration
 * - Redux Saga middleware
 * - File system reducers
 * - Global schema cache
 * 
 * This reducer is ~70-80% smaller than the full root reducer.
 */
export const createLiteRootReducer = () => {
    return combineReducers({
        // Core UI state
        layout: layoutReducer,
        theme: themeReducer,
        ui: uiReducer,
        overlays: overlaySlice,

        // User state (optional - can be empty for public routes)
        user: userReducer,
        userPreferences: userPreferencesReducer,
        // Prompt system
        promptCache: promptCacheReducer,
        promptRunner: promptRunnerReducer,
        promptExecution: promptExecutionReducer,
        modelRegistry: modelRegistryReducer,

        // Feature-specific state
        canvas: canvasReducer,
        textDiff: textDiffReducer,
        noteVersions: noteVersionsReducer,
    });
};

// Type for the lite root state
export type LiteRootState = ReturnType<ReturnType<typeof createLiteRootReducer>>;

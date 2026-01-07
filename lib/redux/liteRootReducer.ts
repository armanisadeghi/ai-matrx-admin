// lib/redux/liteRootReducer.ts
// Lightweight root reducer for public/lite routes that don't need entities, socket.io, or sagas
"use client";

import { combineReducers } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import userPreferencesReducer from "./slices/userPreferencesSlice";
import adminPreferencesReducer from "./slices/adminPreferencesSlice";
// Import directly from themeSlice to avoid loading ThemeProvider (which imports full store)
import themeReducer from "@/styles/themes/themeSlice";
import overlaySlice from "./slices/overlaySlice";
import layoutReducer from "./slices/layoutSlice";

// ============================================================================
// LITE ROOT REDUCER - Core slices for public routes
// ============================================================================
// Includes user-related state that's needed across public routes.
// Excludes feature-specific slices that are only needed in certain contexts.
//
// INCLUDED (essential for public routes):
// - layout, theme, overlays: Core UI state
// - user: User identity and auth state
// - userPreferences: User settings (theme, voice, AI prefs, etc.)
// - adminPreferences: Admin-only settings (server override, etc.) - lightweight
//
// EXCLUDED (feature-specific, add via feature providers if needed):
// - canvasReducer: Only for chat+canvas features
// - promptCache, promptRunner, promptExecution: Only for prompt system
// - modelRegistry: Only for AI model selection
// - textDiff, noteVersions: Only for note editing
// ============================================================================

/**
 * Creates a lightweight root reducer for public routes.
 * 
 * Core slices for user-aware public pages:
 * - layout: Window/layout state
 * - theme: Light/dark mode
 * - user: User identity (id, email, metadata)
 * - userPreferences: User settings and preferences
 * - overlays: Modal/overlay state
 * 
 * This is ~80% smaller than the full root reducer.
 * Slices initialize with empty/default state - no blocking fetches.
 */
export const createLiteRootReducer = () => {
    return combineReducers({
        // Core UI state
        layout: layoutReducer,
        theme: themeReducer,
        overlays: overlaySlice,
        
        // User state (initializes empty, populated after auth)
        user: userReducer,
        userPreferences: userPreferencesReducer,
        
        // Admin preferences (lightweight, only used when admin)
        adminPreferences: adminPreferencesReducer,
    });
};

// Type for the lite root state
export type LiteRootState = ReturnType<ReturnType<typeof createLiteRootReducer>>;

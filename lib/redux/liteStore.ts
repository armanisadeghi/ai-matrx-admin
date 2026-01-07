// lib/redux/liteStore.ts
// Lightweight store for public/lite routes - no sagas, no socket.io, no entity system
"use client";

import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import { createLiteRootReducer, LiteRootState } from "@/lib/redux/liteRootReducer";
import { loggerMiddleware } from "@/utils/logger";
import { enableMapSet } from "immer";
import { LiteInitialReduxState } from "@/types/reduxTypes";

// Store reference for utility access (separate from main store)
let liteStoreInstance: LiteAppStore | null = null;

/**
 * Creates a lightweight Redux store without:
 * - Redux Saga middleware
 * - Socket.io middleware
 * - Entity saga middleware
 * - Storage middleware (optional, excluded for simplicity)
 * 
 * This store is ideal for:
 * - Public routes that need some Redux state
 * - Lite authenticated routes that don't need entity system
 * - Faster initial load times
 * 
 * @param initialState - Optional initial state (no schema required)
 */
export const makeLiteStore = (initialState?: LiteInitialReduxState) => {
    const rootReducer = createLiteRootReducer();

    const store = configureStore({
        reducer: rootReducer,
        preloadedState: initialState as Partial<LiteRootState>,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false,
                immutableCheck: false,
                actionCreatorCheck: false,
            }).concat(loggerMiddleware),
        devTools: process.env.NODE_ENV !== "production",
    });

    // Keep reference for utility access
    liteStoreInstance = store;

    return store;
};

export type LiteAppStore = ReturnType<typeof makeLiteStore>;
export type LiteAppDispatch = LiteAppStore["dispatch"];
export type LiteAppThunk<ReturnType = void> = ThunkAction<ReturnType, LiteRootState, unknown, Action>;

// Re-export LiteRootState for convenience
export type { LiteRootState };

// Getter for utilities to access lite store
export const getLiteStore = (): LiteAppStore | null => liteStoreInstance;

enableMapSet();

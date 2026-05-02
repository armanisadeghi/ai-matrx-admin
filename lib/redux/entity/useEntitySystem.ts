// @ts-nocheck

"use client";

// useEntitySystem — On-demand entity system initialization.
// Routes that need entity data call initialize() on mount.
// Fetches schema from /api/schema, injects entity slices via replaceReducer(),
// and dispatches globalCache data to Redux.

import { useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  setEntitySystemLoading,
  setEntitySystemInitialized,
  setEntitySystemError,
} from "@/lib/redux/slices/entitySystemSlice";
import {
  injectEntityReducers,
  isEntitySystemInjected,
} from "./injectEntityReducers";

export function useEntitySystem() {
  const dispatch = useAppDispatch();
  const isInitialized = useAppSelector((s) => s.entitySystem.initialized);
  const isLoading = useAppSelector((s) => s.entitySystem.loading);
  const error = useAppSelector((s) => s.entitySystem.error);
  const initRef = useRef(false);

  const initialize = useCallback(async () => {
    // Already initialized or in progress
    if (isInitialized || isEntitySystemInjected() || initRef.current) return;
    initRef.current = true;

    dispatch(setEntitySystemLoading());

    try {
      // Fetch schema from server
      const response = await fetch("/api/schema");
      if (!response.ok) {
        throw new Error(`Schema fetch failed: ${response.status}`);
      }

      const schema = await response.json();

      // Inject entity slices into the running store
      const success = injectEntityReducers(schema);
      if (!success && !isEntitySystemInjected()) {
        throw new Error("Failed to inject entity reducers");
      }

      dispatch(setEntitySystemInitialized());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[useEntitySystem] Initialization failed:", message);
      dispatch(setEntitySystemError(message));
      initRef.current = false;
    }
  }, [isInitialized, dispatch]);

  return {
    isInitialized,
    isLoading,
    error,
    initialize,
  };
}

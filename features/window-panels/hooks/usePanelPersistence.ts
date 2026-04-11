"use client";

/**
 * @deprecated
 * localStorage-based window persistence.
 * SUPERSEDED by WindowPersistenceManager + windowPersistenceService (Supabase-backed).
 * This hook is no longer called anywhere in production code.
 * Retained temporarily so git history is meaningful; safe to delete in a follow-up cleanup.
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { restoreWindowState } from "@/lib/redux/slices/windowManagerSlice";

const STORAGE_KEY = "matrx_window_manager_state";

export function usePanelPersistence() {
  const dispatch = useAppDispatch();
  const windows = useAppSelector((state) => state.windowManager.windows);

  // 1. Initial hydration from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          dispatch(restoreWindowState(parsed));
        }
      }
    } catch (err) {
      console.warn(
        "Failed to restore window manager state from local storage",
        err,
      );
    }
  }, [dispatch]);

  // 2. Sync to local storage on change.
  // Only persist when at least one window is mounted; clear storage when none
  // are registered so stale entries don't re-surface as phantoms on next load.
  useEffect(() => {
    try {
      const entries = Object.entries(windows);
      if (entries.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn("Failed to save window manager state to local storage", err);
    }
  }, [windows]);
}

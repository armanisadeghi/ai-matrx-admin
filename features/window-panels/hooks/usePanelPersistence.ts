"use client";

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
      console.warn("Failed to restore window manager state from local storage", err);
    }
  }, [dispatch]);

  // 2. Sync to local storage on change
  useEffect(() => {
    try {
      if (Object.keys(windows).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
      }
    } catch (err) {
      console.warn("Failed to save window manager state to local storage", err);
    }
  }, [windows]);
}

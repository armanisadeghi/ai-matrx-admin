"use client";

/**
 * THE DEBUG SWITCH PERSISTS ON THE SERVER (Arman, 2026-10-14): debug mode stays on for an admin
 * across reloads, navigations, tabs and devices until they turn it off. Before this it lived only
 * in `adminDebug.isDebugMode` (in-memory Redux) and every page load reset it to Off.
 *
 * Two-way bridge between the live switch (`adminDebug.isDebugMode`, which every debug-gated tool
 * reads) and the synced preference `userPreferences.system.debugMode` (IDB + `user_preferences`
 * row, broadcast across tabs). Runs only once the saved preferences have loaded, so the built-in
 * default never overwrites the saved value:
 *   - the saved value changed (load, another tab, another device) → the live switch follows;
 *   - the live switch changed (any toggle in the app) → the saved value follows.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode, setDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import type { RootState } from "@/lib/redux/store";

const selectSavedDebugMode = (state: RootState): boolean =>
  state.userPreferences?.system?.debugMode === true;

export function useDebugModePersistence(enabled: boolean): void {
  const dispatch = useAppDispatch();
  const loaded = useAppSelector(selectPreferencesLoadStatus) === "loaded";
  const saved = useAppSelector(selectSavedDebugMode);
  const live = Boolean(useAppSelector(selectIsDebugMode));
  const lastSaved = useRef<boolean | null>(null);
  const lastLive = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled || !loaded) return;
    if (lastSaved.current !== saved) {
      lastSaved.current = saved;
      lastLive.current = saved;
      if (live !== saved) dispatch(setDebugMode(saved));
      return;
    }
    if (lastLive.current !== live) {
      lastLive.current = live;
      if (live !== saved) dispatch(setPreference({ module: "system", preference: "debugMode", value: live }));
    }
  }, [enabled, loaded, saved, live, dispatch]);
}

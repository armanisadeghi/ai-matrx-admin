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
 *
 * REGRESSION GUARD (MKT-127, 2026-10-15): the bridge's memory (what it last saw) lives at MODULE
 * scope, not in the component. When it lived in refs, every remount of the provider started with
 * "never seen the saved value" and forced the live switch back to whatever the saved record said
 * — so a switch turned on but not yet saved (or saved a moment later than the remount) snapped
 * Off on a page change. A switch flipped while the preferences were still loading is the person's
 * choice: it is saved, never overwritten by the loaded value. Guard:
 * `features/admin/__tests__/debug-mode-persists.test.tsx`.
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode, setDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import type { RootState } from "@/lib/redux/store";

const selectSavedDebugMode = (state: RootState): boolean =>
  state.userPreferences?.system?.debugMode === true;

export interface DebugBridgeMemory {
  /** Saved value last acted on; null = not adopted yet this page load. */
  lastSaved: boolean | null;
  lastLive: boolean | null;
  /** The live switch as first seen, before the saved preferences loaded. */
  liveAtStart: boolean | null;
}

export type DebugBridgeStep = "none" | "live<-saved" | "saved<-live";

export const freshDebugBridgeMemory = (): DebugBridgeMemory => ({
  lastSaved: null,
  lastLive: null,
  liveAtStart: null,
});

let memory: DebugBridgeMemory = freshDebugBridgeMemory();

/** Test seam: forget everything (a new page load). */
export function resetDebugBridgeMemory(): void {
  memory = freshDebugBridgeMemory();
}

/** One decision of the bridge. Mutates `m`; returns what the caller must dispatch. */
export function stepDebugBridge(
  m: DebugBridgeMemory,
  input: { loaded: boolean; saved: boolean; live: boolean },
): DebugBridgeStep {
  const { loaded, saved, live } = input;
  if (m.liveAtStart === null) m.liveAtStart = live;
  if (!loaded) {
    // A cold start or a retry: the saved record is not here yet. Adopt it again when it is.
    if (m.lastSaved !== null) m.lastSaved = null;
    return "none";
  }
  if (m.lastSaved === null) {
    m.lastSaved = saved;
    // The person flipped the switch while the saved value was still loading: that is a choice.
    if (m.lastLive === null && live !== m.liveAtStart) {
      m.lastLive = live;
      return live !== saved ? "saved<-live" : "none";
    }
    m.lastLive = saved;
    return live !== saved ? "live<-saved" : "none";
  }
  if (m.lastSaved !== saved) {
    m.lastSaved = saved;
    m.lastLive = saved;
    return live !== saved ? "live<-saved" : "none";
  }
  if (m.lastLive !== live) {
    m.lastLive = live;
    return live !== saved ? "saved<-live" : "none";
  }
  return "none";
}

export function useDebugModePersistence(enabled: boolean): void {
  const dispatch = useAppDispatch();
  const loaded = useAppSelector(selectPreferencesLoadStatus) === "loaded";
  const saved = useAppSelector(selectSavedDebugMode);
  const live = Boolean(useAppSelector(selectIsDebugMode));

  useEffect(() => {
    if (!enabled) return;
    const step = stepDebugBridge(memory, { loaded, saved, live });
    if (step === "live<-saved") dispatch(setDebugMode(saved));
    else if (step === "saved<-live") {
      dispatch(setPreference({ module: "system", preference: "debugMode", value: live }));
    }
  }, [enabled, loaded, saved, live, dispatch]);
}

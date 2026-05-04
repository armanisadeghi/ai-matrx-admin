"use client";

/**
 * useStudioSettings — convenience wrapper around the per-session settings
 * registry. Returns the active settings (with global defaults filled in
 * for any missing fields), plus a debounced setter that batches rapid
 * slider drags into a single Supabase write.
 *
 * The hook is read-once-on-mount + updates as the user changes settings.
 * It does NOT watch for external mutations (e.g. another tab editing the
 * same session) — Phase 11's realtime middleware is the venue for that.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  CLEANING_INTERVAL_DEFAULT_MS,
  CLEANING_INTERVAL_MAX_MS,
  CLEANING_INTERVAL_MIN_MS,
  CONCEPT_INTERVAL_DEFAULT_MS,
  CONCEPT_INTERVAL_MAX_MS,
  CONCEPT_INTERVAL_MIN_MS,
  DEFAULT_CLEANING_SHORTCUT_ID,
  DEFAULT_CONCEPT_SHORTCUT_ID,
  DEFAULT_MODULE_ID,
  MODULE_INTERVAL_DEFAULT_MS,
  MODULE_INTERVAL_MAX_MS,
  MODULE_INTERVAL_MIN_MS,
} from "../constants";
import { getModule } from "../modules/registry";
import {
  fetchSessionSettingsThunk,
  updateSessionSettingsThunk,
} from "../redux/thunks";
import type { SessionSettings } from "../types";

/**
 * Effective settings = stored settings || global defaults. Used by every
 * read site so callers don't have to remember the fallback chain.
 */
export interface EffectiveSettings {
  cleaningShortcutId: string;
  cleaningIntervalMs: number;
  conceptShortcutId: string;
  conceptIntervalMs: number;
  moduleId: string;
  moduleShortcutId: string | null;
  moduleIntervalMs: number;
  showPriorModules: boolean;
}

const SETTINGS_DEBOUNCE_MS = 350;

export function useStudioSettings(sessionId: string | null) {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((s) =>
    sessionId ? s.transcriptStudio.settingsBySession[sessionId] : undefined,
  );
  const sessionModuleId = useAppSelector(
    (s) =>
      sessionId ? s.transcriptStudio.byId[sessionId]?.moduleId : undefined,
  );

  // Lazy fetch on first mount per session.
  const fetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!sessionId) return;
    if (fetchedRef.current.has(sessionId)) return;
    fetchedRef.current.add(sessionId);
    void dispatch(fetchSessionSettingsThunk({ sessionId }));
  }, [sessionId, dispatch]);

  const effective: EffectiveSettings = useMemo(() => {
    const moduleId =
      stored?.moduleId ?? sessionModuleId ?? DEFAULT_MODULE_ID;
    const moduleDef = getModule(moduleId);
    return {
      cleaningShortcutId:
        stored?.cleaningShortcutId ?? DEFAULT_CLEANING_SHORTCUT_ID,
      cleaningIntervalMs:
        stored?.cleaningIntervalMs ?? CLEANING_INTERVAL_DEFAULT_MS,
      conceptShortcutId:
        stored?.conceptShortcutId ?? DEFAULT_CONCEPT_SHORTCUT_ID,
      conceptIntervalMs:
        stored?.conceptIntervalMs ?? CONCEPT_INTERVAL_DEFAULT_MS,
      moduleId,
      moduleShortcutId:
        stored?.moduleShortcutId ?? moduleDef?.defaultShortcutId ?? null,
      moduleIntervalMs:
        stored?.moduleIntervalMs ??
        moduleDef?.defaultIntervalMs ??
        MODULE_INTERVAL_DEFAULT_MS,
      showPriorModules: stored?.showPriorModules ?? false,
    };
  }, [stored, sessionModuleId]);

  // Debounced writer — slider drags fire every animation frame. We coalesce
  // up to SETTINGS_DEBOUNCE_MS into a single upsert. Module switches and
  // shortcut picks fire immediately (they're not slider-driven).
  const pendingPatchRef = useRef<
    Partial<Omit<SessionSettings, "sessionId">>
  >({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPatch = useCallback(() => {
    if (!sessionId) return;
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (Object.keys(patch).length === 0) return;
    void dispatch(
      updateSessionSettingsThunk({ sessionId, ...patch }),
    );
  }, [dispatch, sessionId]);

  const update = useCallback(
    (
      patch: Partial<Omit<SessionSettings, "sessionId">>,
      options?: { immediate?: boolean },
    ) => {
      if (!sessionId) return;
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      if (options?.immediate) {
        flushPatch();
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushPatch, SETTINGS_DEBOUNCE_MS);
    },
    [sessionId, flushPatch],
  );

  // Flush on unmount so a quick close doesn't drop a pending edit.
  useEffect(() => {
    return () => {
      flushPatch();
    };
  }, [flushPatch]);

  return {
    stored,
    effective,
    update,
    flushNow: flushPatch,
    /** Bounds — surfaced for the IntervalSlider clamping. */
    bounds: {
      cleaning: {
        min: CLEANING_INTERVAL_MIN_MS,
        max: CLEANING_INTERVAL_MAX_MS,
      },
      concept: {
        min: CONCEPT_INTERVAL_MIN_MS,
        max: CONCEPT_INTERVAL_MAX_MS,
      },
      module: {
        min: MODULE_INTERVAL_MIN_MS,
        max: MODULE_INTERVAL_MAX_MS,
      },
    },
  };
}

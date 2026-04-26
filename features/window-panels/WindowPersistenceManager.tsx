"use client";

/**
 * WindowPersistenceManager
 *
 * Replaces the localStorage-based UrlPanelManager for window geometry/state persistence.
 *
 * This component wraps all overlay children in OverlayController.
 * It provides WindowPersistenceContext so every WindowPanel can:
 *  - Retrieve its existing sessionId (loaded from DB on hydration)
 *  - Trigger a save (piggyback on data-save or explicit user action)
 *  - Clean up its DB row on close
 *
 * On mount it fetches all window_sessions rows for the current user and:
 *  1. Dispatches openOverlay for each row so OverlayController mounts the component
 *  2. Dispatches restoreWindowState so geometry is in Redux before windowPanel registers
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/slices/userSlice";
import {
  openOverlay,
  pruneStaleInstances,
} from "@/lib/redux/slices/overlaySlice";
import { restoreWindowState } from "@/lib/redux/slices/windowManagerSlice";
import {
  loadWindowSessions,
  saveWindowSession,
  deleteWindowSession,
} from "./service/windowPersistenceService";
import {
  getRegistryEntryByOverlayId,
  getRegistryEntryBySlug,
  type PanelState,
} from "./registry/windowRegistry";
import type { WindowEntry } from "@/lib/redux/slices/windowManagerSlice";
import { clampRectToCurrentViewport } from "./utils/rectClamp";

// ─── Context ──────────────────────────────────────────────────────────────────

export interface WindowPersistenceContextValue {
  /**
   * Get the existing DB session id for an overlayId, if one was loaded
   * during hydration. Returns undefined for windows opened fresh this session.
   */
  getSessionId: (overlayId: string) => string | undefined;

  /**
   * Persist the current state for a window.
   * Upserts a window_sessions row. No-op for ephemeral windows.
   *
   * @param overlayId  The window's overlay ID
   * @param panelState Chrome state (geometry, sidebar, z-index, etc.)
   * @param data       Window-type-specific content state
   * @param onSaved    Called with the session id after successful save
   */
  saveWindow: (
    overlayId: string,
    panelState: PanelState,
    data: Record<string, unknown>,
    onSaved?: (sessionId: string) => void,
  ) => void;

  /**
   * Delete the DB row for a window.
   * Called when the user closes a window. No-op if no row exists.
   */
  closeWindow: (overlayId: string) => void;

  /** True once the initial DB hydration completes. */
  hydrated: boolean;
}

const WindowPersistenceContext = createContext<WindowPersistenceContextValue>({
  getSessionId: () => undefined,
  saveWindow: () => undefined,
  closeWindow: () => undefined,
  hydrated: false,
});

/**
 * Hook for WindowPanel components to access persistence operations.
 * Must be used inside <WindowPersistenceManager>.
 */
export function useWindowPersistence(): WindowPersistenceContextValue {
  return useContext(WindowPersistenceContext);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WindowPersistenceManagerProps {
  children: React.ReactNode;
}

export function WindowPersistenceManager({
  children,
}: WindowPersistenceManagerProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const [hydrated, setHydrated] = useState(false);

  /**
   * Maps overlayId → sessionId for all persisted rows.
   * Ref (not state) so save/close callbacks always see the latest value
   * without triggering re-renders.
   */
  const sessionMapRef = useRef<Map<string, string>>(new Map());

  // ── Hydrate on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    // One-time migration off the legacy `matrx_window_manager_state`
    // localStorage sidecar. Reads the old blob, seeds Redux geometry
    // synchronously, then removes the key. Later DB hydration will
    // overwrite geometry with the authoritative row. Safe no-op on
    // subsequent loads once the key is gone.
    //
    // Delete this block after the next release cycle — by then every
    // active user will have hydrated at least once.
    try {
      const LEGACY_LS_KEY = "matrx_window_manager_state";
      const saved = localStorage.getItem(LEGACY_LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, WindowEntry> | null;
        if (parsed && typeof parsed === "object") {
          // Clamp each stored rect into the current viewport before seeding
          // Redux — the saved geometry may be from a larger screen.
          const clamped: Record<string, WindowEntry> = {};
          for (const [id, entry] of Object.entries(parsed)) {
            if (!entry || typeof entry !== "object") continue;
            clamped[id] = {
              ...entry,
              windowed: entry.windowed
                ? clampRectToCurrentViewport(entry.windowed)
                : entry.windowed,
            };
          }
          dispatch(restoreWindowState(clamped));
        }
        localStorage.removeItem(LEGACY_LS_KEY);
      }
    } catch {
      // Malformed LS blob — drop silently.
    }

    if (!userId) {
      setHydrated(true);
      return;
    }

    let cancelled = false;

    async function hydrate() {
      try {
        const sessions = await loadWindowSessions(userId!);
        if (cancelled) return;

        // Geometry restore payload: overlayId → WindowEntry shape
        const windowEntries: Record<string, WindowEntry> = {};

        for (const session of sessions) {
          // window_type column stores the slug (e.g. "notes-window")
          const regEntry = getRegistryEntryBySlug(session.window_type);
          if (!regEntry) continue;

          // Track the session id keyed by overlayId (used by WindowPanel)
          sessionMapRef.current.set(regEntry.overlayId, session.id);

          // Re-open the overlay in Redux so OverlayController mounts the component
          dispatch(
            openOverlay({
              overlayId: regEntry.overlayId,
              data: (session.data ?? {}) as Record<string, unknown>,
            }),
          );

          // Build the geometry entry for windowManagerSlice. Clamp the
          // restored rect into the current viewport — a rect saved at a
          // larger screen can land off-screen on a smaller device.
          const ps = session.panel_state as PanelState | null;
          if (ps?.rect) {
            const clamped = clampRectToCurrentViewport(ps.rect);
            windowEntries[regEntry.overlayId] = {
              id: regEntry.overlayId,
              title: session.label ?? regEntry.label,
              state: ps.windowState ?? "windowed",
              windowed: clamped,
              preMinimizedRect: null,
              zIndex: ps.zIndex ?? 1000,
              traySlot: null,
              // Popout state never restores from DB — see restoreWindowState reducer.
              popoutMode: null,
              prePopoutRect: null,
            };
          }
        }

        if (Object.keys(windowEntries).length > 0) {
          dispatch(restoreWindowState(windowEntries));
        }
      } catch (err) {
        console.warn("WindowPersistenceManager: hydration failed", err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Idle GC sweep ──────────────────────────────────────────────────────────
  //
  // Every 30 minutes (idle-only), prune closed multi-instance overlay entries
  // that haven't been used in the same window. Keeps `state.overlays` from
  // growing unbounded when users repeatedly open/close Content Editors,
  // Smart Code Editor instances, image viewers, etc. Singleton slots are
  // preserved so stable-reference selectors don't thrash.
  useEffect(() => {
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;

    const runSweep = () => {
      const idleRun = () =>
        dispatch(pruneStaleInstances({ olderThanMs: THIRTY_MINUTES_MS }));

      // Prefer requestIdleCallback so the sweep never steals paint time.
      // Fall back to a microtask on Safari (no rIC support yet).
      const w = window as unknown as {
        requestIdleCallback?: (cb: () => void) => number;
      };
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(idleRun);
      } else {
        setTimeout(idleRun, 0);
      }
    };

    const interval = window.setInterval(runSweep, THIRTY_MINUTES_MS);
    return () => window.clearInterval(interval);
  }, [dispatch]);

  // ── Context callbacks ───────────────────────────────────────────────────────

  const getSessionId = useCallback(
    (overlayId: string): string | undefined =>
      sessionMapRef.current.get(overlayId),
    [],
  );

  const saveWindow = useCallback(
    (
      overlayId: string,
      panelState: PanelState,
      data: Record<string, unknown>,
      onSaved?: (sessionId: string) => void,
    ) => {
      if (!userId) return;

      const regEntry = getRegistryEntryByOverlayId(overlayId);
      if (!regEntry || regEntry.ephemeral) return;

      const existingSessionId = sessionMapRef.current.get(overlayId);

      saveWindowSession({
        sessionId: existingSessionId,
        userId,
        windowType: regEntry.slug,
        label: regEntry.label,
        panelState,
        data,
      })
        .then((sessionId) => {
          sessionMapRef.current.set(overlayId, sessionId);
          onSaved?.(sessionId);
        })
        .catch((err) => {
          console.warn(
            `WindowPersistenceManager: save failed for overlayId="${overlayId}"`,
            err,
          );
        });
    },
    [userId],
  );

  const closeWindow = useCallback((overlayId: string) => {
    const sessionId = sessionMapRef.current.get(overlayId);
    if (!sessionId) return;
    sessionMapRef.current.delete(overlayId);
    deleteWindowSession(sessionId).catch((err) => {
      console.warn(
        `WindowPersistenceManager: delete failed for overlayId="${overlayId}" session="${sessionId}"`,
        err,
      );
    });
  }, []);

  const contextValue: WindowPersistenceContextValue = {
    getSessionId,
    saveWindow,
    closeWindow,
    hydrated,
  };

  return (
    <WindowPersistenceContext.Provider value={contextValue}>
      {children}
    </WindowPersistenceContext.Provider>
  );
}

/**
 * hooks/useTheme.ts — SHIM.
 *
 * Routes legacy `useTheme()` calls to the sync-engine-owned Redux theme slice.
 * All 45 call sites across the codebase are transparently preserved by
 * returning a union of the two historical shapes (legacy context-hook shape:
 * `{ mode, toggleMode }`; legacy external-store shape:
 * `{ theme, setTheme, resolvedTheme, systemTheme }`).
 *
 * Provider-resilient: `Toaster` / `Sonner` / other layout-level consumers
 * render OUTSIDE `StoreProvider`. Reading Redux via `useAppSelector` would
 * throw there. Instead, this hook subscribes to the Redux store through
 * `ReactReduxContext` when available, and falls back to a DOM-class read
 * otherwise — mirroring the pre-shim `hooks/useTheme.ts` external-store
 * behavior for those call sites.
 *
 * This file is **scheduled for deletion**; see
 * `docs/concepts/full-sync-boardcast-storage/phase-1b-shim-cleanup.md`.
 * Phase 1.C mechanically migrates every consumer to direct selectors;
 * Phase 1.D deletes this file outright.
 *
 * Do NOT add new consumers of this hook. Use the sync-engine selectors
 * directly.
 */

"use client";

import { useCallback, useContext, useSyncExternalStore } from "react";
import { ReactReduxContext } from "react-redux";
import { setMode, toggleMode, type ThemeMode } from "@/styles/themes/themeSlice";

export interface UseThemeShimReturn {
    // Legacy context-hook shape (36 consumers).
    mode: ThemeMode;
    toggleMode: () => void;
    // Legacy external-store shape (9 consumers).
    theme: ThemeMode;
    setTheme: (t: ThemeMode) => void;
    resolvedTheme: ThemeMode;
    systemTheme: ThemeMode;
    // Convenience additions documented in the shim spec.
    isDark: boolean;
    toggleTheme: () => void;
}

interface ThemeRootSlice {
    theme?: { mode?: ThemeMode };
}

function readModeFromDOM(): ThemeMode {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme(): UseThemeShimReturn {
    // `ReactReduxContext` is undefined when rendered above `<Provider>` —
    // e.g. `<Toaster />` sitting in `app/layout.tsx` outside `StoreProvider`.
    const ctx = useContext(ReactReduxContext);

    const mode = useSyncExternalStore<ThemeMode>(
        (onStoreChange) => {
            if (!ctx?.store) return () => {};
            return ctx.store.subscribe(onStoreChange);
        },
        () => {
            if (ctx?.store) {
                const state = ctx.store.getState() as ThemeRootSlice;
                return state.theme?.mode ?? readModeFromDOM();
            }
            return readModeFromDOM();
        },
        // Server snapshot — no DOM access during SSR; default matches the
        // themeSlice initial state.
        () => "dark",
    );

    const setTheme = useCallback(
        (t: ThemeMode) => {
            ctx?.store?.dispatch(setMode(t));
        },
        [ctx],
    );

    const toggleModeFn = useCallback(() => {
        ctx?.store?.dispatch(toggleMode());
    }, [ctx]);

    // systemTheme is best-effort — the sync engine's `SyncBootScript`
    // owns first-paint OS-preference application.
    const systemTheme: ThemeMode =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";

    return {
        mode,
        toggleMode: toggleModeFn,
        theme: mode,
        setTheme,
        resolvedTheme: mode,
        systemTheme,
        isDark: mode === "dark",
        toggleTheme: toggleModeFn,
    };
}

/**
 * styles/themes/ThemeProvider.tsx — SHIM.
 *
 * Pass-through provider component + re-exported `useTheme` hook. Exists only
 * to keep the 36 legacy imports (`import { useTheme } from
 * "@/styles/themes/ThemeProvider"`) and 3 `<ThemeProvider>` mounts working
 * while Phase 1.C mechanically migrates consumers to direct Redux selectors.
 *
 * Post-shim behavior:
 *   - `<ThemeProvider>` renders children only. NO React context, NO Redux
 *     dispatches, NO DOM mutations, NO cookie writes, NO localStorage writes.
 *     The sync engine owns all of that now (`SyncBootScript` pre-paints; the
 *     middleware broadcasts + persists; `bootSync` rehydrates).
 *   - `useTheme` is re-exported from `@/hooks/useTheme` so both import paths
 *     return the identical union shape.
 *
 * **Scheduled for deletion.** Phase 1.D removes this file and the three
 * `<ThemeProvider>` JSX mounts. See
 * `docs/concepts/full-sync-boardcast-storage/phase-1b-shim-cleanup.md`.
 *
 * Do NOT add new consumers.
 */

"use client";

import React from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeProviderProps {
    children: React.ReactNode;
    /** Accepted for backwards compat; ignored by the shim. */
    defaultTheme?: ThemeMode;
    /** Accepted for backwards compat; ignored by the shim. */
    enableSystem?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    return <>{children}</>;
};

export { useTheme } from "@/hooks/useTheme";

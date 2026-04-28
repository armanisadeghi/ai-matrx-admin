"use client";

import React from "react";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import StoreProvider from "@/providers/StoreProvider";
import { InitialReduxState, LiteInitialReduxState } from "@/types/reduxTypes";
import { PublicAuthSync } from "./PublicAuthSync";

// ─── BEGIN PROBE: legacy OverlayController bundle exclusion ────────────────
// TEMPORARY — mirrors the same probe in `app/DeferredSingletons.tsx`.
// See that file for full rationale. To revert: uncomment all four
// "PROBE-RESTORE" blocks here and in DeferredSingletons.tsx.
// ───────────────────────────────────────────────────────────────────────────

// PROBE-RESTORE (1/4) — `dynamic` import (only used by legacy controller)
// import dynamic from "next/dynamic";

// PROBE-RESTORE (2/4) — legacy controller dynamic import
// const OverlayController = dynamic(
//   () => import("@/components/overlays/OverlayController"),
//   { ssr: false },
// );
import UnifiedOverlayController from "@/features/window-panels/UnifiedOverlayController";

// PROBE-RESTORE (3/4) — env-flag toggle
// const USE_OVERLAYS_V2 =
//   process.env.NEXT_PUBLIC_OVERLAYS_V2 === "1" ||
//   process.env.NEXT_PUBLIC_OVERLAYS_V2 === "true";
// ─── END PROBE ─────────────────────────────────────────────────────────────

interface PublicProvidersProps {
  children: React.ReactNode;
  initialState?: LiteInitialReduxState;
}

/**
 * Minimal client boundary for public routes.
 *
 * Server-rendered children (layout shell, header markup, page content)
 * pass through as already-rendered React nodes — they are NOT converted
 * to client components. Only the provider wrappers themselves ship JS.
 *
 * Auth sync runs after a 100ms delay inside PublicAuthSync so it never
 * blocks the initial paint.
 */
export function PublicProviders({
  children,
  initialState,
}: PublicProvidersProps) {
  return (
    <ReactQueryProvider>
      <StoreProvider
        initialState={
          initialState as Partial<InitialReduxState> & LiteInitialReduxState
        }
      >
        <TooltipProvider delayDuration={200}>
          <PublicAuthSync />
          {/* PROBE-RESTORE (4/4) — original ternary:
              {USE_OVERLAYS_V2 ? <UnifiedOverlayController /> : <OverlayController />} */}
          <UnifiedOverlayController />
          {children}
        </TooltipProvider>
      </StoreProvider>
    </ReactQueryProvider>
  );
}

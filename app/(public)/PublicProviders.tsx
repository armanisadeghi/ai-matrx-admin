"use client";

import React from "react";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import StoreProvider from "@/providers/StoreProvider";
import { InitialReduxState, LiteInitialReduxState } from "@/types/reduxTypes";
import { PublicAuthSync } from "./PublicAuthSync";
import OverlayController from "@/components/overlays/OverlayController";

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
      <StoreProvider initialState={initialState as Partial<InitialReduxState> & LiteInitialReduxState}>
        <TooltipProvider delayDuration={200}>
          <PublicAuthSync />
          <OverlayController />
          {children}
        </TooltipProvider>
      </StoreProvider>
    </ReactQueryProvider>
  );
}

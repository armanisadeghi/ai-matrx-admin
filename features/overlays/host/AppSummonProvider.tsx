"use client";

/**
 * The app's SummonProvider + WindowsProvider: the ONE app store (summonReducers + createSummonMiddleware are
 * mounted in lib/redux), the app's ports, every rendered overlay inside the chat surface layer
 * boundary, and the admin "Copy for AI" report in the error card.
 */
import { Suspense, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { locationRouter, type RouterPort } from "@ai-matrx/summon";
import { SummonProvider, type OverlayErrorExtrasContext } from "@ai-matrx/summon/react";
import { useNextRouterPort } from "@ai-matrx/summon/next";
import { WindowsProvider, WindowTraySync } from "@ai-matrx/summon/window-host";
import { SurfaceLayerBoundary } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useAppStore } from "@/lib/redux/hooks";
import { AppWindowSelectionSurface } from "./AppWindowSelectionSurface";
import { createAppOverlayPorts } from "./ports";

/** Escape belongs to the organization gate (and anything marked to yield) before any window. */
const ESCAPE_YIELD = "[data-organization-gate], [data-overlay-escape-yield]";

// Shown only when an overlay crashes; never in the provider's static graph.
const OverlayErrorCopyForAi = dynamic(() => import("./OverlayErrorCopyForAi"), { ssr: false });

const renderInSurfaceLayer = (node: ReactNode) => <SurfaceLayerBoundary>{node}</SurfaceLayerBoundary>;
const errorReportExtras = (ctx: OverlayErrorExtrasContext) => <OverlayErrorCopyForAi {...ctx} />;

/** useNextRouterPort reads search params, so it sits in its own Suspense island. */
function RouterPortBridge({ onPort }: { onPort: (port: RouterPort) => void }) {
  const port = useNextRouterPort();
  // PUBLISHED IN AN EFFECT, NEVER IN RENDER: `onPort` sets the PARENT's state, and doing that while this child
  // renders is React's "Cannot update a component (`AppSummonProvider`) while rendering a different
  // component (`RouterPortBridge`)" (walk 2026-10-17, D13).
  useEffect(() => {
    onPort(port);
  }, [port, onPort]);
  return null;
}

export function AppSummonProvider({ children }: { children: ReactNode }) {
  const store = useAppStore();
  const [base] = useState(() => createAppOverlayPorts(store));
  const [router, setRouter] = useState<RouterPort>(locationRouter);
  const [ports, setPorts] = useState(() => ({ ...base, router: locationRouter }));
  if (ports.router !== router) setPorts({ ...base, router });
  return (
    <SummonProvider store={store} ports={ports} renderWrapper={renderInSurfaceLayer} errorReportExtras={errorReportExtras}>
      <Suspense fallback={null}>
        <RouterPortBridge onPort={setRouter} />
      </Suspense>
      {/* Window host options + viewport/tray sync for every WindowPanel, page-local ones included
          (the light window-host section: never loads WindowPanel). */}
      <WindowsProvider selectionSurface={AppWindowSelectionSurface} escapeYieldSelector={ESCAPE_YIELD}>
        <WindowTraySync />
        {children}
      </WindowsProvider>
    </SummonProvider>
  );
}

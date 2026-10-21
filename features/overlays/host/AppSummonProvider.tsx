"use client";

/**
 * The app's summon root. Light by design (owner bar: "next to nothing until triggered"): it hands
 * the ONE app store to summon's context and records the app's settings — ports, the chat surface
 * layer around every rendered overlay, the admin "Copy for AI" report in the error card, and the
 * window options. The summon core (slices + middleware, injected by the store's gate), the host and
 * the window runtime (AppSummonRuntime) load on the first trigger, never in a route's first load.
 */
import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SummonRoot, type OverlayErrorExtrasContext, type OverlayRenderContext } from "@ai-matrx/summon/boot-root";
import { SurfaceLayerBoundary } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useAppStore } from "@/lib/redux/hooks";
import { AppWindowSelectionSurface } from "./AppWindowSelectionSurface";
import { appRouterPort } from "./appRouterPort";
import { createAppOverlayPorts } from "./ports";

/** Escape belongs to the organization gate (and anything marked to yield) before any window. */
const WINDOWS = { selectionSurface: AppWindowSelectionSurface, escapeYieldSelector: "[data-organization-gate], [data-overlay-escape-yield]" };

// Shown only when an overlay crashes; never in the provider's static graph.
const OverlayErrorCopyForAi = dynamic(() => import("./OverlayErrorCopyForAi"), { ssr: false });

// `data-overlay-id` marks each rendered overlay for the sweep's on-screen proof (scripts/overlays/sweep.ts);
// `display: contents` gives the wrapper no box of its own, so layout is unchanged.
const renderInSurfaceLayer = (node: ReactNode, ctx: OverlayRenderContext) => (
  <div data-overlay-id={ctx.overlayId} data-overlay-instance={ctx.instanceId} style={{ display: "contents" }}>
    <SurfaceLayerBoundary>{node}</SurfaceLayerBoundary>
  </div>
);
const errorReportExtras = (ctx: OverlayErrorExtrasContext) => <OverlayErrorCopyForAi {...ctx} />;
const loadRuntime = () => import("./AppSummonRuntime");

export function AppSummonProvider({ children }: { children: ReactNode }) {
  const store = useAppStore();
  const [ports] = useState(() => ({ ...createAppOverlayPorts(store), router: appRouterPort }));
  return (
    <SummonRoot
      store={store}
      ports={ports}
      renderWrapper={renderInSurfaceLayer}
      errorReportExtras={errorReportExtras}
      windows={WINDOWS}
      runtime={loadRuntime}
    >
      {children}
    </SummonRoot>
  );
}

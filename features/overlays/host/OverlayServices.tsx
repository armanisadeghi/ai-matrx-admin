"use client";

/**
 * Render-free services that must run before anything opens: the `?panels=` link manager (every
 * definition's link.hydrate) and persistence (the person's open windows and saved component
 * state). Mounted by the deferred singleton core; an open they trigger loads the overlay world.
 */
import { Suspense, useEffect } from "react";
import { allOverlayMeta, closeAllInstancesOfOverlay, openOverlay, selectIsOverlayOpen, type OverlayId, type StateWithOverlays, mintInstanceId } from "@ai-matrx/summon/open";
import { OverlayLinkManager } from "@ai-matrx/summon/url";
import { OverlayPersistence } from "@ai-matrx/summon/persistence";
import { useAppStore } from "@/lib/redux/hooks";
import { ensureAppOverlaysRegistered } from "@/features/overlays/definitions/register";

ensureAppOverlaysRegistered();

declare global {
  interface Window {
    /** Dev builds, or a build made with NEXT_PUBLIC_OVERLAYS_SWEEP=1: the overlay sweep (scripts/overlays/sweep.ts) opens overlays through it. */
    __overlaysTest?: {
      ids(): string[];
      open(id: string, data?: Record<string, unknown>): string;
      close(id: string): void;
      isOpen(id: string, instanceId: string): boolean;
      /** Ask an awaitable overlay exactly as its opener does (requestOverlay); resolves with its answer. */
      request(id: string, request: unknown, cancel?: unknown): Promise<unknown>;
    };
  }
}

export function OverlayServices() {
  const store = useAppStore();
  useEffect(() => {
    // NEXT_PUBLIC_* is inlined at build time: a normal production build compiles this hook out.
    if (process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_OVERLAYS_SWEEP !== "1") return;
    window.__overlaysTest = {
      ids: () => allOverlayMeta().map((m) => m.id),
      open: (id, data) => {
        const multi = allOverlayMeta().find((m) => m.id === id)?.instance === "multi";
        const instanceId = multi ? mintInstanceId(id) : "default";
        store.dispatch(openOverlay({ overlayId: id as OverlayId, instanceId, data: data ?? {} }));
        return instanceId;
      },
      close: (id) => void store.dispatch(closeAllInstancesOfOverlay({ overlayId: id as OverlayId })),
      // a closed singleton keeps its entry with isOpen false: presence is not "open"
      isOpen: (id, instanceId) => selectIsOverlayOpen(store.getState() as StateWithOverlays, id as OverlayId, instanceId),
      request: (id, request, cancel = null) =>
        import("@/features/overlays/requestOverlay").then((m) => m.requestOverlay(id, request, { cancel })),
    };
    return () => {
      delete window.__overlaysTest;
    };
  }, [store]);
  return (
    <>
      <Suspense fallback={null}>
        <OverlayLinkManager />
      </Suspense>
      <OverlayPersistence />
    </>
  );
}

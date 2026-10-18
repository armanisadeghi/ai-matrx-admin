"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "liveIntegrationsWindow" as const;

export interface LiveIntegrationsWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createLiveIntegrationsWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (): LiveIntegrationsWindowHandle => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenLiveIntegrationsWindow() {
  const store = useAppStore();
  return useMemo(() => createLiveIntegrationsWindowOpener(store), [store]);
}

/** Declarative form for callers that own the window's mount lifecycle. */
export function LiveIntegrationsWindowController(): null {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(openOverlay({ overlayId: OVERLAY_ID }));
    return () => {
      dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
    };
  }, [dispatch]);
  return null;
}

export type LiveIntegrationsWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    liveIntegrationsWindow: OverlayWire<LiveIntegrationsWindowDefinitionData>;
  }
}

"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/boot";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "liveIntegrationsWindow" as const;

export interface LiveIntegrationsWindowHandle {
  close: () => void;
}

export interface OpenLiveIntegrationsWindowOptions {
  /** The chat the person came from: what they connect in the window joins it. */
  conversationId?: string;
  /** Land on this provider's detail (a catalog slug, or a first-party id such as `google`). */
  provider?: string;
  /** Land on the list with this search typed — what the person searched in the chat's + menu. */
  search?: string;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createLiveIntegrationsWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (options?: OpenLiveIntegrationsWindowOptions): LiveIntegrationsWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          conversationId: options?.conversationId ?? null,
          provider: options?.provider ?? null,
          search: options?.search ?? null,
          // Every open starts the window afresh — on its list, or where it was asked to land — even
          // when it was already open (or minimized) on some connector's detail from an earlier visit.
          openedAt: Date.now(),
        },
      }),
    );
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

export type LiveIntegrationsWindowDefinitionData = OpenLiveIntegrationsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    liveIntegrationsWindow: OverlayWire<LiveIntegrationsWindowDefinitionData>;
  }
}

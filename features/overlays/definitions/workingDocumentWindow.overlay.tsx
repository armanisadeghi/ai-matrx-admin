"use client";

/**
 * Opener for the `workingDocumentWindow` overlay.
 *
 * - `useOpenWorkingDocumentWindow()` — imperative hook. Call to open the
 *   working document for a conversation in a floating window; returns a handle
 *   with `instanceId` + `close()`.
 * - `<WorkingDocumentWindowController />` — declarative wrapper.
 *
 * Multi-instance, keyed by conversationId: one window per conversation, so
 * re-opening for the same conversation focuses/replaces the existing one
 * instead of stacking duplicates.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";
import { workingDocumentInstanceId } from "./opener-instance-ids";

const OVERLAY_ID = "workingDocumentWindow" as const;

export interface OpenWorkingDocumentWindowOptions {
  conversationId: string;
}

export interface WorkingDocumentWindowHandle {
  instanceId: string;
  close: () => void;
}

const instanceIdFor = workingDocumentInstanceId;

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createWorkingDocumentWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenWorkingDocumentWindowOptions): WorkingDocumentWindowHandle => {
    const instanceId = instanceIdFor(opts.conversationId);
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        instanceId,
        data: { conversationId: opts.conversationId },
      }),
    );
    return {
      instanceId,
      close: () =>
        dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
    };
  };
}

export function useOpenWorkingDocumentWindow() {
  const store = useAppStore();
  return useMemo(() => createWorkingDocumentWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export function WorkingDocumentWindowController(
  props: OpenWorkingDocumentWindowOptions,
): null {
  const open = useOpenWorkingDocumentWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

export type WorkingDocumentWindowDefinitionData = OpenWorkingDocumentWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    workingDocumentWindow: OverlayWire<WorkingDocumentWindowDefinitionData>;
  }
}

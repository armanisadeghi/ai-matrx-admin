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

import { useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { workingDocumentInstanceId } from "./opener-instance-ids";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "workingDocumentWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

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
    opener.open(dispatch, { instanceId, data: { conversationId: opts.conversationId } });
    return {
      instanceId,
      close: () =>
        dispatch(opener.close(instanceId)),
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
export const WorkingDocumentWindowController = hookController<OpenWorkingDocumentWindowOptions>(useOpenWorkingDocumentWindow);

export type WorkingDocumentWindowDefinitionData = OpenWorkingDocumentWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    workingDocumentWindow: OverlayWire<WorkingDocumentWindowDefinitionData>;
  }
}

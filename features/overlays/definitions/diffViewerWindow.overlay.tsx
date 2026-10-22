"use client";

/**
 * Opener for the `diffViewerWindow` overlay (canonical diff core in a
 * movable WindowPanel).
 *
 * - `useOpenDiffViewerWindow()` — imperative hook. Returns a handle with
 *   `instanceId` and `close()`. Multi-instance: each call spawns a fresh
 *   window (pass a stable `instanceId` to reuse one).
 * - `<DiffViewerWindowController />` — declarative wrapper.
 */

import { useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import type { DiffEngine, DiffView } from "@ai-matrx/diff/react";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";
import { mintInstanceId } from "@ai-matrx/summon/boot";

const OVERLAY_ID = "diffViewerWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenDiffViewerWindowOptions {
  original: string;
  modified: string;
  originalLabel?: string;
  modifiedLabel?: string;
  title?: string | null;
  engine?: DiffEngine;
  language?: string;
  defaultView?: DiffView;
  /** Stable instance id. Omit for a fresh window each call. */
  instanceId?: string;
}

export interface DiffViewerWindowHandle {
  instanceId: string;
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createDiffViewerWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenDiffViewerWindowOptions): DiffViewerWindowHandle => {
    const instanceId = opts.instanceId ?? mintInstanceId(OVERLAY_ID);
    opener.open(dispatch, { instanceId, data: {
          windowInstanceId: instanceId,
          original: opts.original,
          modified: opts.modified,
          originalLabel: opts.originalLabel ?? "Original",
          modifiedLabel: opts.modifiedLabel ?? "Modified",
          title: opts.title ?? null,
          engine: opts.engine ?? "auto",
          language: opts.language ?? null,
          defaultView: opts.defaultView ?? "split",
        } });
    return {
      instanceId,
      close: () =>
        dispatch(opener.close(instanceId)),
    };
  };
}

export function useOpenDiffViewerWindow() {
  const store = useAppStore();
  return useMemo(() => createDiffViewerWindowOpener(store), [store]);
}

export const DiffViewerWindowController = hookController<OpenDiffViewerWindowOptions>(useOpenDiffViewerWindow);

export type DiffViewerWindowDefinitionData = OpenDiffViewerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    diffViewerWindow: OverlayWire<DiffViewerWindowDefinitionData>;
  }
}

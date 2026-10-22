"use client";

/**
 * Opener for the `imageViewer` overlay.
 *
 * - `useOpenImageViewerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `openImageViewer(dispatch, payload)` — the imperative dispatcher, for call
 *   sites that already hold an `AppDispatch` and open the viewer from inside a
 *   callback where a hook cannot run (mirrors `openLiveRunWindowAction`).
 * - `<ImageViewerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay, mintInstanceId } from "@ai-matrx/summon/open";
import type { AppDispatch } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "imageViewer" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenImageViewerWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  images: string[];
  initialIndex?: number;
  alts?: string[];
  title?: string;
}

export interface ImageViewerWindowHandle {
  instanceId: string;
  close: () => void;
}

/**
 * Payload for the imperative dispatcher. Same shape as the hook's options —
 * kept as its own name because the 5 call sites that use it predate the
 * openers layer and read better with a `payload` noun.
 */
export interface OpenImageViewerPayload {
  images: string[];
  initialIndex?: number;
  alts?: string[];
  title?: string;
  /** Supply a stable id when you need multiple independent viewers open at once. */
  instanceId?: string;
}

/**
 * Imperative opener — dispatches `openOverlay` and nothing else. It never
 * imports `ImageViewerWindow`, so a caller gets the open path without pulling
 * `<WindowPanel>` and the rest of the window-panels chunk graph into its
 * bundle. `OverlayWorldHost`'s per-overlay `dynamic()` still owns the only
 * import of the component itself.
 *
 * Defaults `instanceId` to `"default"` so repeat clicks reuse ONE viewer
 * instead of stacking a new window per click.
 */
export function openImageViewer(
  dispatch: AppDispatch,
  payload: OpenImageViewerPayload,
) {
  opener.open(dispatch, { instanceId: payload.instanceId ?? "default", data: {
        images: payload.images,
        initialIndex: payload.initialIndex ?? 0,
        alts: payload.alts,
        title: payload.title,
      } });
}

export function useOpenImageViewerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenImageViewerWindowOptions): ImageViewerWindowHandle => {
      const instanceId = opts.instanceId ?? mintInstanceId(OVERLAY_ID);
      opener.open(dispatch, { instanceId, data: {
            images: opts.images,
            initialIndex: opts.initialIndex,
            alts: opts.alts,
            title: opts.title,
          } });
      return {
        instanceId,
        close: () => dispatch(opener.close(instanceId)),
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ImageViewerWindowController = hookController<OpenImageViewerWindowOptions>(useOpenImageViewerWindow);

export type ImageViewerDefinitionData = OpenImageViewerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    imageViewer: OverlayWire<ImageViewerDefinitionData>;
  }
}

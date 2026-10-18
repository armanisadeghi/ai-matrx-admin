"use client";

/**
 * Opener for the `cropStudioWindow` overlay.
 *
 * - `useOpenCropStudioWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CropStudioWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "cropStudioWindow" as const;

export interface OpenCropStudioWindowOptions {
  initialFolderId?: string | null;
  defaultFolderPath?: string;
  initialAspect?: number;
}

export interface CropStudioWindowHandle {
  close: () => void;
}

export function useOpenCropStudioWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenCropStudioWindowOptions = {}): CropStudioWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialFolderId: opts.initialFolderId,
            defaultFolderPath: opts.defaultFolderPath,
            initialAspect: opts.initialAspect,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
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
export function CropStudioWindowController(props: OpenCropStudioWindowOptions): null {
  const open = useOpenCropStudioWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialFolderId, props.defaultFolderPath, props.initialAspect]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CropStudioWindowDefinitionData = OpenCropStudioWindowOptions;

export const cropStudioWindowOverlay = defineOverlay<CropStudioWindowDefinitionData>()({
  id: "cropStudioWindow",
  label: "Crop Studio Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          folderId: null as string | null,
          defaultFolderPath: "Images/Crops",
          aspect: null as number | null,
        },
    windowId: "crop-studio-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "crop_studio",
    hydrate: (ctx) => import("./cropStudioWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    cropStudioWindow: OverlayWire<CropStudioWindowDefinitionData>;
  }
}

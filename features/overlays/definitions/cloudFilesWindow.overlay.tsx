"use client";

/**
 * Opener for the `cloudFilesWindow` overlay.
 *
 * - `useOpenCloudFilesWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CloudFilesWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "cloudFilesWindow" as const;

export interface OpenCloudFilesWindowOptions {
  /** TODO: tighten to `CloudFilesWindowTab` once that type is imported. */
  initialTab?: unknown;
}

export interface CloudFilesWindowHandle {
  close: () => void;
}

export function useOpenCloudFilesWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenCloudFilesWindowOptions = {}): CloudFilesWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialTab: opts.initialTab,
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
export function CloudFilesWindowController(props: OpenCloudFilesWindowOptions): null {
  const open = useOpenCloudFilesWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialTab]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CloudFilesWindowDefinitionData = OpenCloudFilesWindowOptions;

export const cloudFilesWindowOverlay = defineOverlay<CloudFilesWindowDefinitionData>()({
  id: "cloudFilesWindow",
  label: "Cloud Files Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialTab: "browse" },
    windowId: "cloud-files-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "cloud_files", aliases: ["files"],
    hydrate: (ctx) => import("./cloudFilesWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    cloudFilesWindow: OverlayWire<CloudFilesWindowDefinitionData>;
  }
}

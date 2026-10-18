"use client";

/**
 * Opener for the `cloudBrowserWindow` overlay (the Cloud Browser panel).
 *
 * - `useOpenCloudBrowserWindow()` — imperative hook; returns a `close()` handle.
 * - `<CloudBrowserWindowController />` — declarative wrapper.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { CLOUD_BROWSER_OVERLAY_ID } from "@/features/cloud-browser/constants";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = CLOUD_BROWSER_OVERLAY_ID;

export interface OpenCloudBrowserWindowOptions {
  initialProfileId?: string | null;
}

export interface CloudBrowserWindowHandle {
  close: () => void;
}

export function useOpenCloudBrowserWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenCloudBrowserWindowOptions = {}): CloudBrowserWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: { initialProfileId: opts.initialProfileId ?? null },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function CloudBrowserWindowController(
  props: OpenCloudBrowserWindowOptions,
): null {
  const open = useOpenCloudBrowserWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialProfileId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CloudBrowserWindowDefinitionData = OpenCloudBrowserWindowOptions;

export const cloudBrowserWindowOverlay = /* @__PURE__ */ defineOverlay<CloudBrowserWindowDefinitionData>()({
  id: "cloudBrowserWindow",
  label: "Cloud Browser",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    cloudBrowserWindow: OverlayWire<CloudBrowserWindowDefinitionData>;
  }
}

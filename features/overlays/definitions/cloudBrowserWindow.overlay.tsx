"use client";

/**
 * Opener for the `cloudBrowserWindow` overlay (the Cloud Browser panel).
 *
 * - `useOpenCloudBrowserWindow()` — imperative hook; returns a `close()` handle.
 * - `<CloudBrowserWindowController />` — declarative wrapper.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { CLOUD_BROWSER_OVERLAY_ID } from "@/features/cloud-browser/constants";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = CLOUD_BROWSER_OVERLAY_ID;
const opener = createOpener<object>(OVERLAY_ID);

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
      opener.open(dispatch, { data: { initialProfileId: opts.initialProfileId ?? null } });
      return {
        close: () => dispatch(opener.close()),
      };
    },
    [dispatch],
  );
}

export const CloudBrowserWindowController = hookController<OpenCloudBrowserWindowOptions>(useOpenCloudBrowserWindow);

export type CloudBrowserWindowDefinitionData = OpenCloudBrowserWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    cloudBrowserWindow: OverlayWire<CloudBrowserWindowDefinitionData>;
  }
}

"use client";

/**
 * Opener for the `captureInspectorWindow` overlay.
 *
 * - `useOpenCaptureInspectorWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<CaptureInspectorWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "captureInspectorWindow" as const;

export interface OpenCaptureInspectorWindowOptions {
  initialExchangeId?: string | null;
}

export interface CaptureInspectorWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenCaptureInspectorWindowOptions>(OVERLAY_ID);

export const useOpenCaptureInspectorWindow = opener.useOpen;

export const CaptureInspectorWindowController = opener.Controller;

export type CaptureInspectorWindowDefinitionData = OpenCaptureInspectorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    captureInspectorWindow: OverlayWire<CaptureInspectorWindowDefinitionData>;
  }
}

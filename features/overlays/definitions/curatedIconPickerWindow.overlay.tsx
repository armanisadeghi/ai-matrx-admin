"use client";

/**
 * Opener for the `curatedIconPickerWindow` overlay.
 *
 * Re-exports the canonical hand-written opener (full callback-aware API
 * via the callback registry for `onIconPick`/`onClose`).
 */
import {
  useOpenCuratedIconPickerWindow,
  type OpenCuratedIconPickerOptions,
  type CuratedIconPickerHandle,
} from "@/features/window-panels/windows/icons/useOpenCuratedIconPickerWindow";
import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";
import { hookController } from "./app-opener";

export {
  useOpenCuratedIconPickerWindow,
  type OpenCuratedIconPickerOptions,
  type CuratedIconPickerHandle,
};

export const CuratedIconPickerWindowController = hookController<OpenCuratedIconPickerOptions>(useOpenCuratedIconPickerWindow);

export type CuratedIconPickerWindowDefinitionData = OpenCuratedIconPickerOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    curatedIconPickerWindow: UntypedOverlayWire;
  }
}

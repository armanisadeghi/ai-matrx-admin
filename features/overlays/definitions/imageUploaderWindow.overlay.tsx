"use client";

/**
 * Opener for the `imageUploaderWindow` overlay.
 *
 * Re-exports the canonical hand-written opener from window-panels/windows/image/
 * so callers in the new `features/overlays/definitions/` location get the full
 * callback-aware API (`onUploaded`, `onCleared`, etc., wired through the
 * callback registry). The codegen-generated stub for this overlay was
 * replaced because it would have lost the callback contract.
 *
 * Also exposes `<ImageUploaderWindowController />` for the declarative form,
 * matching the convention every other opener uses. The Controller component
 * is a thin wrapper that creates a handle on mount and disposes on unmount.
 */
import { useEffect } from "react";
import {
  useOpenImageUploaderWindow,
  type OpenImageUploaderWindowOptions,
  type ImageUploaderWindowHandle,
} from "@/features/window-panels/windows/image/useOpenImageUploaderWindow";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";

export {
  useOpenImageUploaderWindow,
  type OpenImageUploaderWindowOptions,
  type ImageUploaderWindowHandle,
};

/**
 * Declarative form. Renders nothing visible; opens the window on mount,
 * closes it on unmount. Use when overlay state is naturally expressed as
 * component lifecycle.
 *
 * Re-creates the handle if `windowInstanceId` changes; otherwise stable.
 * Callback identity changes do NOT re-open the window — the handlers are
 * fed to the underlying callback group and updates would require a
 * dispose/reopen cycle. Pass stable functions (or memoize them) for
 * predictable behavior.
 */
export function ImageUploaderWindowController(
  props: OpenImageUploaderWindowOptions,
): null {
  const open = useOpenImageUploaderWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
    // The window's IDENTITY is the instance id; callback handler identity
    // doesn't justify a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.windowInstanceId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ImageUploaderWindowDefinitionData = OpenImageUploaderWindowOptions;

export const imageUploaderWindowOverlay = /* @__PURE__ */ defineOverlay<ImageUploaderWindowDefinitionData>()({
  id: "imageUploaderWindow",
  label: "Image Uploader Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null,
          preset: "social",
          bucket: null,
          folder: null,
          title: null,
          description: null,
          currentUrl: null,
          allowUrlPaste: true,
        },
    windowId: "image-uploader-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    imageUploaderWindow: UntypedOverlayWire;
  }
}

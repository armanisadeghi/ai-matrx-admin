"use client";

// The `imageViewer` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./imageViewer.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ImageViewerDefinitionData } from "./imageViewer.overlay";

export const imageViewerOverlay = defineOverlay<ImageViewerDefinitionData>()({
  id: "imageViewer",
  label: "Image Viewer",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          images: [],
          initialIndex: 0,
          alts: undefined,
          title: undefined,
        },
    windowId: "image-viewer-window",
    mobile: "fullscreen",
  },
});

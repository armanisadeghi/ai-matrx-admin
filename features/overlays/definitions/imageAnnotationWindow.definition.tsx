"use client";

// The `imageAnnotationWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./imageAnnotationWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ImageAnnotationWindowDefinitionData } from "./imageAnnotationWindow.overlay";

export const imageAnnotationWindowOverlay = defineOverlay<ImageAnnotationWindowDefinitionData>()({
  id: "imageAnnotationWindow",
  label: "Image Annotation",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null,
          sourceFileId: null,
          sourceUrl: null,
          sourceFilename: null,
          defaultFolder: null,
          title: null,
          overwriteSource: false,
        },
    windowId: "image-annotation-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});

"use client";

// The `imageUploaderWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./imageUploaderWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ImageUploaderWindowDefinitionData } from "./imageUploaderWindow.overlay";

export const imageUploaderWindowOverlay = defineOverlay<ImageUploaderWindowDefinitionData>()({
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

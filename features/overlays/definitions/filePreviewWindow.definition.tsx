"use client";

// The `filePreviewWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./filePreviewWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FilePreviewWindowDefinitionData } from "./filePreviewWindow.overlay";

export const filePreviewWindowOverlay = defineOverlay<FilePreviewWindowDefinitionData>()({
  id: "filePreviewWindow",
  label: "File Preview Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          fileId: null,
          pageNumber: null,
          navigationRequestId: null,
        },
    windowId: "file-preview-window",
    mobile: "fullscreen",
  },
  link: {
    key: "file_preview",
    hydrate: (ctx) => import("./filePreviewWindow.link").then((m) => m.hydrate(ctx)),
  },
});

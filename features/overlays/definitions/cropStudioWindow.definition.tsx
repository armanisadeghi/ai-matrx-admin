"use client";

// The `cropStudioWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./cropStudioWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CropStudioWindowDefinitionData } from "./cropStudioWindow.overlay";

export const cropStudioWindowOverlay = defineOverlay<CropStudioWindowDefinitionData>()({
  id: "cropStudioWindow",
  label: "Crop Studio Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          folderId: null as string | null,
          defaultFolderPath: "Images/Crops",
          aspect: null as number | null,
        },
    windowId: "crop-studio-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "crop_studio",
    hydrate: (ctx) => import("./cropStudioWindow.link").then((m) => m.hydrate(ctx)),
  },
});

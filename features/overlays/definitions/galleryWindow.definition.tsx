"use client";

// The `galleryWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./galleryWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GalleryWindowDefinitionData } from "./galleryWindow.overlay";

export const galleryWindowOverlay = defineOverlay<GalleryWindowDefinitionData>()({
  id: "galleryWindow",
  label: "Gallery Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          query: "",
          orientation: "all",
          viewMode: "grid",
          favorites: [],
        },
    windowId: "gallery-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "gallery",
    hydrate: (ctx) => import("./galleryWindow.link").then((m) => m.hydrate(ctx)),
  },
});

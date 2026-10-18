"use client";

// The `cloudFilesWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./cloudFilesWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CloudFilesWindowDefinitionData } from "./cloudFilesWindow.overlay";

export const cloudFilesWindowOverlay = defineOverlay<CloudFilesWindowDefinitionData>()({
  id: "cloudFilesWindow",
  label: "Cloud Files Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialTab: "browse" },
    windowId: "cloud-files-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "cloud_files", aliases: ["files"],
    hydrate: (ctx) => import("./cloudFilesWindow.link").then((m) => m.hydrate(ctx)),
  },
});

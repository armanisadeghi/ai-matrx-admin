"use client";

// The `browserFrameWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./browserFrameWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { BrowserFrameWindowDefinitionData } from "./browserFrameWindow.overlay";

export const browserFrameWindowOverlay = defineOverlay<BrowserFrameWindowDefinitionData>()({
  id: "browserFrameWindow",
  label: "Browser Frame Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          initialUrl: "https://lucide.dev/icons/",
          initialWindowTitle: null,
        },
    windowId: "browser-frame-window",
    mobile: "fullscreen",
  },
});

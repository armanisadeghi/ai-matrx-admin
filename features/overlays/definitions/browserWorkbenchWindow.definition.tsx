"use client";

// The `browserWorkbenchWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./browserWorkbenchWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { BrowserWorkbenchWindowDefinitionData } from "./browserWorkbenchWindow.overlay";

export const browserWorkbenchWindowOverlay = defineOverlay<BrowserWorkbenchWindowDefinitionData>()({
  id: "browserWorkbenchWindow",
  label: "Browser Workbench Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { bookmarks: [], tabs: [], activeTabId: null },
    windowId: "browser-workbench-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
    preservation: { dataKeys: ["tabs", "activeTabId"] },
  },
});

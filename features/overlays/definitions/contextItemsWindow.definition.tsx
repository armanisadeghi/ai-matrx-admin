"use client";

// The `contextItemsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./contextItemsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ContextItemsWindowDefinitionData } from "./contextItemsWindow.overlay";

export const contextItemsWindowOverlay = defineOverlay<ContextItemsWindowDefinitionData>()({
  id: "contextItemsWindow",
  label: "Context Items",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          scopeTypeId: null,
          initialItemId: null,
          openNewOnMount: false,
        },
    windowId: "context-items-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
});

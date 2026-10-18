"use client";

// The `observationalMemoryWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./observationalMemoryWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ObservationalMemoryWindowDefinitionData } from "./observationalMemoryWindow.overlay";

export const observationalMemoryWindowOverlay = defineOverlay<ObservationalMemoryWindowDefinitionData>()({
  id: "observationalMemoryWindow",
  label: "Observational Memory Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialSelectedConversationId: null },
    windowId: "observational-memory-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
});

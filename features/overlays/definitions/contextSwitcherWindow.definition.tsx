"use client";

// The `contextSwitcherWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./contextSwitcherWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ContextSwitcherWindowDefinitionData } from "./contextSwitcherWindow.overlay";

export const contextSwitcherWindowOverlay = defineOverlay<ContextSwitcherWindowDefinitionData>()({
  id: "contextSwitcherWindow",
  label: "Scope Switcher Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "context-switcher-window",
    mobile: "drawer",
  },
});

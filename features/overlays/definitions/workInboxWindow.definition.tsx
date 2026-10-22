"use client";

// The `workInboxWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./workInboxWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { WorkInboxWindowDefinitionData } from "./workInboxWindow.overlay";

export const workInboxWindowOverlay = defineOverlay<WorkInboxWindowDefinitionData>()({
  id: "workInboxWindow",
  label: "In your tables",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "work-inbox-window",
    mobile: "fullscreen",
  },
});

"use client";

// The `instanceUIStateWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./instanceUIStateWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { InstanceUIStateWindowDefinitionData } from "./instanceUIStateWindow.overlay";

export const instanceUIStateWindowOverlay = defineOverlay<InstanceUIStateWindowDefinitionData>()({
  id: "instanceUIStateWindow",
  label: "Instance U I State Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { selectedConversationId: null },
    windowId: "instance-ui-state-window",
    mobile: "card",
  },
});

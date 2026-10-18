"use client";

// The `resourcePickerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./resourcePickerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ResourcePickerWindowDefinitionData } from "./resourcePickerWindow.overlay";

export const resourcePickerWindowOverlay = defineOverlay<ResourcePickerWindowDefinitionData>()({
  id: "resourcePickerWindow",
  label: "Resource Picker Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { lastResourceType: null },
    windowId: "resource-picker-window",
    mobile: "drawer",
    ephemeral: true,
  },
});

"use client";

// The `curatedIconPickerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./curatedIconPickerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CuratedIconPickerWindowDefinitionData } from "./curatedIconPickerWindow.overlay";

export const curatedIconPickerWindowOverlay = defineOverlay<CuratedIconPickerWindowDefinitionData>()({
  id: "curatedIconPickerWindow",
  label: "Curated Icon Picker Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { callbackGroupId: null as string | null },
    windowId: "curated-icon-picker-window",
    mobile: "drawer",
    ephemeral: true,
  },
});

"use client";

// The `createBrandWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./createBrandWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CreateBrandWindowDefinitionData } from "./createBrandWindow.overlay";

export const createBrandWindowOverlay = defineOverlay<CreateBrandWindowDefinitionData>()({
  id: "createBrandWindow",
  label: "Add brand",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
      callbackGroupId: null as string | null,
    },
    windowId: "create-brand-window",
    mobile: "drawer",
    ephemeral: true,
  },
});

"use client";

// The `masterworkBuildWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./masterworkBuildWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MasterworkBuildWindowDefinitionData } from "./masterworkBuildWindow.overlay";

export const masterworkBuildWindowOverlay = defineOverlay<MasterworkBuildWindowDefinitionData>()({
  id: "masterworkBuildWindow",
  label: "Build a Masterwork",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          rulebookId: null as string | null,
        },
    windowId: "masterwork-build-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});

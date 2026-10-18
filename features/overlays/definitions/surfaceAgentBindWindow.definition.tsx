"use client";

// The `surfaceAgentBindWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./surfaceAgentBindWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SurfaceAgentBindWindowDefinitionData } from "./surfaceAgentBindWindow.overlay";

export const surfaceAgentBindWindowOverlay = defineOverlay<SurfaceAgentBindWindowDefinitionData>()({
  id: "surfaceAgentBindWindow",
  label: "Add Agent to Surface",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          surfaceName: "",
          initialAgentId: null as string | null,
          callbackGroupId: null as string | null,
        },
    windowId: "surface-agent-bind-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});

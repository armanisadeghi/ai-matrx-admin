"use client";

// The `surfaceContextInspector` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./surfaceContextInspector.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SurfaceContextInspectorDefinitionData } from "./surfaceContextInspector.overlay";

export const surfaceContextInspectorOverlay = defineOverlay<SurfaceContextInspectorDefinitionData>()({
  id: "surfaceContextInspector",
  label: "Surface Context Admin",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          surfaceName: null,
          scope: {},
          isEditable: false,
          preferRuntime: false,
        },
    windowId: "surface-context-inspector-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
    ephemeral: true,
  },
});

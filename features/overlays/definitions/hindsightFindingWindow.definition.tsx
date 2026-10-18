"use client";

// The `hindsightFindingWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./hindsightFindingWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { HindsightFindingWindowDefinitionData } from "./hindsightFindingWindow.overlay";

export const hindsightFindingWindowOverlay = defineOverlay<HindsightFindingWindowDefinitionData>()({
  id: "hindsightFindingWindow",
  label: "Hindsight Finding",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          finding: null,
          findings: [],
          agentId: null,
          audience: "product",
        },
    windowId: "hindsight-finding-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});

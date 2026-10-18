"use client";

// The `impactBatchWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./impactBatchWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ImpactBatchWindowDefinitionData } from "./impactBatchWindow.overlay";

export const impactBatchWindowOverlay = defineOverlay<ImpactBatchWindowDefinitionData>()({
  id: "impactBatchWindow",
  label: "Change impact",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          agentIds: null,
          mode: null,
          delta: null,
          batchLabel: null,
          sourceSentence: null,
          preselectedRungIds: null,
          surfaceName: null,
          posture: null,
          focusAgentId: null,
        },
    windowId: "impact-batch-window",
    mobile: "fullscreen",
    preservation: {
      dataKeys: [
        "agentIds",
        "mode",
        "delta",
        "batchLabel",
        "sourceSentence",
        "preselectedRungIds",
        "surfaceName",
        "posture",
        "focusAgentId",
      ],
      requiredDataKeys: ["agentIds", "mode"],
    },
  },
});

"use client";

// The `reviewWalkWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./reviewWalkWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ReviewWalkWindowDefinitionData } from "./reviewWalkWindow.overlay";

export const reviewWalkWindowOverlay = defineOverlay<ReviewWalkWindowDefinitionData>()({
  id: "reviewWalkWindow",
  label: "Review Walk",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          unitKind: null,
          unitId: null,
          agentId: null,
          agentName: null,
          roleLabel: null,
          detailLabel: null,
          stackIndex: 0,
        },
    windowId: "review-walk-window",
    mobile: "fullscreen",
    preservation: {
      dataKeys: ["unitKind", "unitId", "agentId", "agentName", "roleLabel", "detailLabel"],
      requiredDataKeys: ["unitKind", "unitId"],
    },
  },
  link: {
    key: "review_walk",
    hydrate: (ctx) => import("./reviewWalkWindow.link").then((m) => m.hydrate(ctx)),
  },
});

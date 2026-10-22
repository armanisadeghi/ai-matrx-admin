"use client";

// The `aiWatchWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./aiWatchWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AiWatchWindowDefinitionData } from "./aiWatchWindow.overlay";

export const aiWatchWindowOverlay = defineOverlay<AiWatchWindowDefinitionData>()({
  id: "aiWatchWindow",
  label: "Watch AI",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          windowInstanceId: null,
          requestId: null,
          userRequestId: null,
          workflowRunId: null,
          conversationId: null,
          nodeId: null,
          label: null,
        },
    windowId: "ai-watch-window",
    mobile: "card",
    // Never restored after a reload (Arman, 2026-10-22): a watch of one run is not a workspace.
    ephemeral: true,
  },
  link: {
    key: "ai-watch",
    hydrate: (ctx) => import("./aiWatchWindow.link").then((m) => m.hydrate(ctx)),
  },
});

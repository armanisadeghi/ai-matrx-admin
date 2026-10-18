"use client";

// The `approvalsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./approvalsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ApprovalsWindowDefinitionData } from "./approvalsWindow.overlay";

export const approvalsWindowOverlay = defineOverlay<ApprovalsWindowDefinitionData>()({
  id: "approvalsWindow",
  label: "Waiting on you",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "approvals-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  link: {
    key: "approvals",
    hydrate: (ctx) => import("./approvalsWindow.link").then((m) => m.hydrate(ctx)),
  },
});

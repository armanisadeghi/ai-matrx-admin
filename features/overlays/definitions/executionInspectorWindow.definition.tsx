"use client";

// The `executionInspectorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./executionInspectorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ExecutionInspectorWindowDefinitionData } from "./executionInspectorWindow.overlay";

export const executionInspectorWindowOverlay = defineOverlay<ExecutionInspectorWindowDefinitionData>()({
  id: "executionInspectorWindow",
  label: "Execution Inspector Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "exec-inspector-window",
    mobile: "card",
    ephemeral: true,
  },
  link: {
    key: "exec-inspector",
    hydrate: (ctx) => import("./executionInspectorWindow.link").then((m) => m.hydrate(ctx)),
  },
});

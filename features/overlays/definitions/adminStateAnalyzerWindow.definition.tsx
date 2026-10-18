"use client";

// The `adminStateAnalyzerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./adminStateAnalyzerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AdminStateAnalyzerWindowDefinitionData } from "./adminStateAnalyzerWindow.overlay";

export const adminStateAnalyzerWindowOverlay = defineOverlay<AdminStateAnalyzerWindowDefinitionData>()({
  id: "adminStateAnalyzerWindow",
  label: "Admin State Analyzer Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "state-analyzer-window",
    mobile: "card",
    ephemeral: true,
  },
  link: {
    key: "state_analyzer",
    hydrate: (ctx) => import("./adminStateAnalyzerWindow.link").then((m) => m.hydrate(ctx)),
  },
});

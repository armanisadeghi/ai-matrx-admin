"use client";

// The `alchemyPrepareWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the
// lazy summon runtime); the web app's WindowPort opens it through ./alchemyPrepareWindow.overlay.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AlchemyPrepareWindowDefinitionData } from "./alchemyPrepareWindow.overlay";

export const alchemyPrepareWindowOverlay = defineOverlay<AlchemyPrepareWindowDefinitionData>()({
  id: "alchemyPrepareWindow",
  label: "Prepare",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { handleId: "" },
    windowId: "alchemy-prepare",
    // The session is a live closure: a reload cannot bring it back, so the window is never restored.
    ephemeral: true,
  },
});

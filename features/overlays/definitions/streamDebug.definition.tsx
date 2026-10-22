"use client";

// The `streamDebug` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./streamDebug.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { StreamDebugDefinitionData } from "./streamDebug.overlay";

export const streamDebugOverlay = defineOverlay<StreamDebugDefinitionData>()({
  id: "streamDebug",
  label: "Stream Debug",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null, requestIdOverride: undefined },
    windowId: "stream-debug",
  },
});

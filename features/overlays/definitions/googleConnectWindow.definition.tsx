"use client";

// The `googleConnectWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./googleConnectWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GoogleConnectWindowDefinitionData } from "./googleConnectWindow.overlay";

export const googleConnectWindowOverlay = defineOverlay<GoogleConnectWindowDefinitionData>()({
  id: "googleConnectWindow",
  label: "Connect Google",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { reason: null },
    windowId: "google-connect-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  link: {
    key: "google_connect",
    hydrate: (ctx) => import("./googleConnectWindow.link").then((m) => m.hydrate(ctx)),
  },
});

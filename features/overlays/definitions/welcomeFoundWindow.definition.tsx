"use client";

// The `welcomeFoundWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./welcomeFoundWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { WelcomeFoundWindowDefinitionData } from "./welcomeFoundWindow.overlay";

export const welcomeFoundWindowOverlay = defineOverlay<WelcomeFoundWindowDefinitionData>()({
  id: "welcomeFoundWindow",
  label: "We found you",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "welcome-found-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  link: {
    key: "welcome-found",
    hydrate: (ctx) => import("./welcomeFoundWindow.link").then((m) => m.hydrate(ctx)),
  },
});

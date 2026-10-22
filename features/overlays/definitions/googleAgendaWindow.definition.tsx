"use client";

// The `googleAgendaWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./googleAgendaWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GoogleAgendaWindowDefinitionData } from "./googleAgendaWindow.overlay";

export const googleAgendaWindowOverlay = defineOverlay<GoogleAgendaWindowDefinitionData>()({
  id: "googleAgendaWindow",
  label: "Agenda",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "google-agenda-window",
    mobile: "fullscreen",
  },
  link: {
    key: "agenda",
    hydrate: (ctx) => import("./googleAgendaWindow.link").then((m) => m.hydrate(ctx)),
  },
});

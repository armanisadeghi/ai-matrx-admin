"use client";

// The `creatorHub` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./creatorHub.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CreatorHubDefinitionData } from "./creatorHub.overlay";

export const creatorHubOverlay = defineOverlay<CreatorHubDefinitionData>()({
  id: "creatorHub",
  label: "Creator Hub",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { activeTab: "settings" },
    windowId: "creator-hub-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "creator_hub",
    hydrate: (ctx) => import("./creatorHub.link").then((m) => m.hydrate(ctx)),
  },
});

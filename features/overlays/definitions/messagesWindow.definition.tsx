"use client";

// The `messagesWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./messagesWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MessagesWindowDefinitionData } from "./messagesWindow.overlay";

export const messagesWindowOverlay = defineOverlay<MessagesWindowDefinitionData>()({
  id: "messagesWindow",
  label: "Messages Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null, search: "" },
    windowId: "messages-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
    preservation: { dataKeys: ["conversationId"] },
  },
  link: {
    key: "messages",
    hydrate: (ctx) => import("./messagesWindow.link").then((m) => m.hydrate(ctx)),
  },
});

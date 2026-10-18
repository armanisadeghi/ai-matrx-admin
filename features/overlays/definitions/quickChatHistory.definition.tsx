"use client";

// The `quickChatHistory` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./quickChatHistory.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { QuickChatHistoryDefinitionData } from "./quickChatHistory.overlay";

export const quickChatHistoryOverlay = defineOverlay<QuickChatHistoryDefinitionData>()({
  id: "quickChatHistory",
  label: "Quick Chat History",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { selectedConversationId: null, groupBy: "date" },
    windowId: "quick-chat-history",
    mobile: "fullscreen",
  },
  link: {
    key: "chat_history",
    hydrate: (ctx) => import("./quickChatHistory.link").then((m) => m.hydrate(ctx)),
  },
});

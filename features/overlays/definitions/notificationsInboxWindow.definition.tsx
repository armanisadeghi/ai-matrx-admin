"use client";

// The `notificationsInboxWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./notificationsInboxWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { NotificationsInboxWindowDefinitionData } from "./notificationsInboxWindow.overlay";

export const notificationsInboxWindowOverlay = defineOverlay<NotificationsInboxWindowDefinitionData>()({
  id: "notificationsInboxWindow",
  label: "Inbox",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "notifications-inbox-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});

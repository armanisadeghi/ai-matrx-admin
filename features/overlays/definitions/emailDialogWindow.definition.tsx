"use client";

// The `emailDialogWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./emailDialogWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { EmailDialogWindowDefinitionData } from "./emailDialogWindow.overlay";

export const emailDialogWindowOverlay = defineOverlay<EmailDialogWindowDefinitionData>()({
  id: "emailDialogWindow",
  label: "Email Dialog Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { to: null, subject: null, draftBody: null },
    windowId: "email-dialog-window",
    mobile: "drawer",
  },
  link: {
    key: "email_dialog",
    hydrate: (ctx) => import("./emailDialogWindow.link").then((m) => m.hydrate(ctx)),
  },
});

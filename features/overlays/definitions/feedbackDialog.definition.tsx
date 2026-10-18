"use client";

// The `feedbackDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./feedbackDialog.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FeedbackDialogDefinitionData } from "./feedbackDialog.overlay";

export const feedbackDialogOverlay = defineOverlay<FeedbackDialogDefinitionData>()({
  id: "feedbackDialog",
  label: "Feedback Dialog",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { draftText: null, attachmentUrls: [] },
    windowId: "feedback-window",
    mobile: "drawer",
  },
  link: {
    key: "feedback",
    hydrate: (ctx) => import("./feedbackDialog.link").then((m) => m.hydrate(ctx)),
  },
});

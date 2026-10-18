"use client";

// The `gmailComposeWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./gmailComposeWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GmailComposeWindowDefinitionData } from "./gmailComposeWindow.overlay";

export const gmailComposeWindowOverlay = defineOverlay<GmailComposeWindowDefinitionData>()({
  id: "gmailComposeWindow",
  label: "Email a CRM record",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { partyId: null, organizationId: null, partyLabel: null },
    windowId: "gmail-compose-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});

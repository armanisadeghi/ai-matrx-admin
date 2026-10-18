"use client";

// The `googleContactsImportWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./googleContactsImportWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { GoogleContactsImportWindowDefinitionData } from "./googleContactsImportWindow.overlay";

export const googleContactsImportWindowOverlay = defineOverlay<GoogleContactsImportWindowDefinitionData>()({
  id: "googleContactsImportWindow",
  label: "Import from Google Contacts",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          organizationId: null,
          initialExternalId: null,
          initialView: "contacts",
        },
    windowId: "google-contacts-import-window",
    mobile: "drawer",
    ephemeral: true,
  },
  link: {
    key: "google_contacts_import",
    hydrate: (ctx) => import("./googleContactsImportWindow.link").then((m) => m.hydrate(ctx)),
  },
});

"use client";

import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

export type CredentialVaultWindowDefinitionData = Record<string, unknown>;

export const credentialVaultWindowOverlay = defineOverlay<CredentialVaultWindowDefinitionData>()({
  id: "credentialVaultWindow",
  label: "Vault Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          selectedItemId: null,
          location: "",
        },
    windowId: "credential-vault-window",
    mobile: "drawer",
  },
  link: {
    key: "vault",
    hydrate: (ctx) => import("./credentialVaultWindow.link").then((m) => m.hydrate(ctx)),
  },
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    credentialVaultWindow: OverlayWire<CredentialVaultWindowDefinitionData>;
  }
}

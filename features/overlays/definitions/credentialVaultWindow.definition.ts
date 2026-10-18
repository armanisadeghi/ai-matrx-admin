"use client";

// The `credentialVaultWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./credentialVaultWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CredentialVaultWindowDefinitionData } from "./credentialVaultWindow.overlay";

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

"use client";

import type { OverlayWire } from "./overlay-types";

export type CredentialVaultWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    credentialVaultWindow: OverlayWire<CredentialVaultWindowDefinitionData>;
  }
}

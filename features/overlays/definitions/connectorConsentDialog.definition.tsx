"use client";

// The `connectorConsentDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./connectorConsentDialog.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ConnectorConsentDialogDefinitionData } from "./connectorConsentDialog.overlay";

export const connectorConsentDialogOverlay = defineOverlay<ConnectorConsentDialogDefinitionData>()({
  id: "connectorConsentDialog",
  label: "Choose what to connect",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

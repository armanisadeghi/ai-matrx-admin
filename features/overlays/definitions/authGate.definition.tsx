"use client";

// The `authGate` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./authGate.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AuthGateDefinitionData } from "./authGate.overlay";

export const authGateOverlay = defineOverlay<AuthGateDefinitionData>()({
  id: "authGate",
  label: "Auth Gate",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

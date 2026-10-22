"use client";

// The `sandboxGateDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through its opener function, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SandboxGateDialogDefinitionData } from "./sandboxGateDialog.overlay";

export const sandboxGateDialogOverlay = defineOverlay<SandboxGateDialogDefinitionData>()({
  id: "sandboxGateDialog",
  label: "Sandbox unavailable",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

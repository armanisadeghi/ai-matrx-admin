"use client";

// The `scopeMismatchDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through its opener function, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ScopeMismatchDialogDefinitionData } from "./scopeMismatchDialog.overlay";

export const scopeMismatchDialogOverlay = defineOverlay<ScopeMismatchDialogDefinitionData>()({
  id: "scopeMismatchDialog",
  label: "Scope mismatch",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

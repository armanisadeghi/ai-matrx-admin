"use client";

// The `emailDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./emailDialog.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { EmailDialogDefinitionData } from "./emailDialog.overlay";

export const emailDialogOverlay = defineOverlay<EmailDialogDefinitionData>()({
  id: "emailDialog",
  label: "Email Dialog",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

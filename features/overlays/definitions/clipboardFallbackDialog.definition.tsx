"use client";

// The `clipboardFallbackDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through `showManualCopy(...)`, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ClipboardFallbackDialogDefinitionData } from "./clipboardFallbackDialog.overlay";

export const clipboardFallbackDialogOverlay = defineOverlay<ClipboardFallbackDialogDefinitionData>()({
  id: "clipboardFallbackDialog",
  label: "Copy manually",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

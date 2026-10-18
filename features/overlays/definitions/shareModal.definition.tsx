"use client";

// The `shareModal` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./shareModal.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ShareModalDefinitionData } from "./shareModal.overlay";

export const shareModalOverlay = defineOverlay<ShareModalDefinitionData>()({
  id: "shareModal",
  label: "Share Modal",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

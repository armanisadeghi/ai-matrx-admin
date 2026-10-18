"use client";

// The `imagePeekHost` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./imagePeekHost.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ImagePeekHostDefinitionData } from "./imagePeekHost.overlay";

export const imagePeekHostOverlay = defineOverlay<ImagePeekHostDefinitionData>()({
  id: "imagePeekHost",
  label: "Image Peek Host",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

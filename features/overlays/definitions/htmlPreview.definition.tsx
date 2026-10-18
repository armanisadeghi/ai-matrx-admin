"use client";

// The `htmlPreview` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./htmlPreview.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { HtmlPreviewDefinitionData } from "./htmlPreview.overlay";

export const htmlPreviewOverlay = defineOverlay<HtmlPreviewDefinitionData>()({
  id: "htmlPreview",
  label: "Html Preview",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

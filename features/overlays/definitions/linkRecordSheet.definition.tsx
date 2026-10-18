"use client";

// The `linkRecordSheet` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./linkRecordSheet.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { LinkRecordSheetDefinitionData } from "./linkRecordSheet.overlay";

export const linkRecordSheetOverlay = defineOverlay<LinkRecordSheetDefinitionData>()({
  id: "linkRecordSheet",
  label: "Link a record",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: true,
});

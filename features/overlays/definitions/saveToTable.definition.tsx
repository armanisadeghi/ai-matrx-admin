"use client";

// The `saveToTable` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./saveToTable.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SaveToTableDefinitionData } from "./saveToTable.overlay";

export const saveToTableOverlay = defineOverlay<SaveToTableDefinitionData>()({
  id: "saveToTable",
  label: "Save to a table",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

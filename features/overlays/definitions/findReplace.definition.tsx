"use client";

// The `findReplace` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./findReplace.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FindReplaceDefinitionData } from "./findReplace.overlay";

export const findReplaceOverlay = defineOverlay<FindReplaceDefinitionData>()({
  id: "findReplace",
  label: "Find & Replace",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

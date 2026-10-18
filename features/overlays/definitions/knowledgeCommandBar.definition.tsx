"use client";

// The `knowledgeCommandBar` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./knowledgeCommandBar.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { KnowledgeCommandBarDefinitionData } from "./knowledgeCommandBar.overlay";

export const knowledgeCommandBarOverlay = defineOverlay<KnowledgeCommandBarDefinitionData>()({
  id: "knowledgeCommandBar",
  label: "Search your knowledge",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

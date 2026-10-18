"use client";

// The `agentFullModal` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentFullModal.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentFullModalDefinitionData } from "./agentFullModal.overlay";

export const agentFullModalOverlay = defineOverlay<AgentFullModalDefinitionData>()({
  id: "agentFullModal",
  label: "Agent Full Modal",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

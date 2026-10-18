"use client";

// The `agentCompactModal` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentCompactModal.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentCompactModalDefinitionData } from "./agentCompactModal.overlay";

export const agentCompactModalOverlay = defineOverlay<AgentCompactModalDefinitionData>()({
  id: "agentCompactModal",
  label: "Agent Compact Modal",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

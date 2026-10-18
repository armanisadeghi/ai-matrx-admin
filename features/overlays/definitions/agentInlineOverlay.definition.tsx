"use client";

// The `agentInlineOverlay` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentInlineOverlay.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentInlineOverlayDefinitionData } from "./agentInlineOverlay.overlay";

export const agentInlineOverlayOverlay = defineOverlay<AgentInlineOverlayDefinitionData>()({
  id: "agentInlineOverlay",
  label: "Agent Inline Overlay",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

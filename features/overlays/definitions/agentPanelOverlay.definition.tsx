"use client";

// The `agentPanelOverlay` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentPanelOverlay.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentPanelOverlayDefinitionData } from "./agentPanelOverlay.overlay";

export const agentPanelOverlayOverlay = defineOverlay<AgentPanelOverlayDefinitionData>()({
  id: "agentPanelOverlay",
  label: "Agent Panel Overlay",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

"use client";

// The `agentToastOverlay` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentToastOverlay.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentToastOverlayDefinitionData } from "./agentToastOverlay.overlay";

export const agentToastOverlayOverlay = defineOverlay<AgentToastOverlayDefinitionData>()({
  id: "agentToastOverlay",
  label: "Agent Toast Overlay",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

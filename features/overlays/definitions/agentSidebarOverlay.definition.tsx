"use client";

// The `agentSidebarOverlay` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentSidebarOverlay.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentSidebarOverlayDefinitionData } from "./agentSidebarOverlay.overlay";

export const agentSidebarOverlayOverlay = defineOverlay<AgentSidebarOverlayDefinitionData>()({
  id: "agentSidebarOverlay",
  label: "Agent Sidebar Overlay",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});

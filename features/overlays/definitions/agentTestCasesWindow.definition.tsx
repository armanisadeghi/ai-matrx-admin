"use client";

// The `agentTestCasesWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentTestCasesWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentTestCasesWindowDefinitionData } from "./agentTestCasesWindow.overlay";

export const agentTestCasesWindowOverlay = defineOverlay<AgentTestCasesWindowDefinitionData>()({
  id: "agentTestCasesWindow",
  label: "Test Cases",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: "", conversationId: "" },
    windowId: "agent-test-cases-window",
    mobile: "fullscreen",
  },
});

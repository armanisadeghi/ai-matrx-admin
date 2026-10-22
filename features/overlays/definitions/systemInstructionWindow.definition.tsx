"use client";

// The `systemInstructionWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./systemInstructionWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SystemInstructionWindowDefinitionData } from "./systemInstructionWindow.overlay";

export const systemInstructionWindowOverlay = defineOverlay<SystemInstructionWindowDefinitionData>()({
  id: "systemInstructionWindow",
  label: "Structured System Instruction Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: "" },
    windowId: "system-instruction-window",
    mobile: "drawer",
  },
});

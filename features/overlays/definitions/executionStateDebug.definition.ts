"use client";

// The `executionStateDebug` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./executionStateDebug.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ExecutionStateDebugDefinitionData } from "./executionStateDebug.overlay";

export const executionStateDebugOverlay = defineOverlay<ExecutionStateDebugDefinitionData>()({
  id: "executionStateDebug",
  label: "Agent Execution State",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

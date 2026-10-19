"use client";

// The `contextAssignment` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./contextAssignment.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ContextAssignmentDefinitionData } from "./contextAssignment.overlay";

export const contextAssignmentOverlay = defineOverlay<ContextAssignmentDefinitionData>()({
  id: "contextAssignment",
  label: "Attach To",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  // One-shot (an "Attach to" picker that returns its choice to the opener): never comes back after a reload.
  window: { preservation: false },
});

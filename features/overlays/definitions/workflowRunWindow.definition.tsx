"use client";

// The `workflowRunWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./workflowRunWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { WorkflowRunWindowDefinitionData } from "./workflowRunWindow.overlay";

export const workflowRunWindowOverlay = defineOverlay<WorkflowRunWindowDefinitionData>()({
  id: "workflowRunWindow",
  label: "Workflow Run",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "workflow-run-window",
    mobile: "card",
    // Never restored after a reload: it follows one live run.
    ephemeral: true,
  },
});

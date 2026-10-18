"use client";

// The `agentVariableEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentVariableEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentVariableEditorWindowDefinitionData } from "./agentVariableEditorWindow.overlay";

export const agentVariableEditorWindowOverlay = defineOverlay<AgentVariableEditorWindowDefinitionData>()({
  id: "agentVariableEditorWindow",
  label: "Variable Editor",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          agentId: null,
          variableName: null,
          justCreated: false,
        },
    windowId: "agent-variable-editor-window",
    mobile: "drawer",
    ephemeral: true,
  },
  link: {
    key: "agent_variable",
    hydrate: (ctx) => import("./agentVariableEditorWindow.link").then((m) => m.hydrate(ctx)),
  },
});

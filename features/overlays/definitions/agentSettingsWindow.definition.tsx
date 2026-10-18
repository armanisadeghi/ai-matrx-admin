"use client";

// The `agentSettingsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentSettingsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentSettingsWindowDefinitionData } from "./agentSettingsWindow.overlay";

export const agentSettingsWindowOverlay = defineOverlay<AgentSettingsWindowDefinitionData>()({
  id: "agentSettingsWindow",
  label: "Agent Settings Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          initialAgentId: null,
          surfaceName: null,
          initialView: null,
        },
    windowId: "agent-settings-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "agent-settings",
    hydrate: (ctx) => import("./agentSettingsWindow.link").then((m) => m.hydrate(ctx)),
  },
});

"use client";

// The `sandboxManagementWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./sandboxManagementWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SandboxManagementWindowDefinitionData } from "./sandboxManagementWindow.overlay";

export const sandboxManagementWindowOverlay = defineOverlay<SandboxManagementWindowDefinitionData>()({
  id: "sandboxManagementWindow",
  label: "Sandbox management",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { sandboxId: null, title: null },
    windowId: "sandbox-management-window",
    mobile: "fullscreen",
    preservation: {
      dataKeys: ["sandboxId", "title"],
      requiredDataKeys: ["sandboxId"],
    },
  },
});

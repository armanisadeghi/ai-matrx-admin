"use client";

// The `promptDebugIndicator` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./promptDebugIndicator.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { PromptDebugIndicatorDefinitionData } from "./promptDebugIndicator.overlay";

export const promptDebugIndicatorOverlay = defineOverlay<PromptDebugIndicatorDefinitionData>()({
  id: "promptDebugIndicator",
  label: "Prompt Debug Indicator",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});

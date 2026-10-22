/**
 * Surface manifest — Extension Assistant (`chrome-extension/assistant`).
 *
 * The Assistant side panel of the Chrome extension (matrx-extend `package-chat/host.ts`).
 *
 * Declared 2026-10-12 so the manifest sync fills `ui.ui_surface.label` (it was
 * null: the row existed with no code declaration). The label here is the ONE
 * name every chrome reads (THE NAMING LAW).
 */

import type { SurfaceManifest, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";

const values: SurfaceValue[] = pickBaseline("selection", "content", "context");

export const chromeExtensionAssistantManifest: SurfaceManifest = {
  situation:
    "{user.name|The person} is in the AI Matrx Chrome extension, using its Assistant side panel beside the web page they are browsing. Any text they have selected and the content the panel shares are in your context.",
  surfaceName: "chrome-extension/assistant",
  client: "chrome-extension",
  executor: "chrome-extension",
  executionMode: "python-stream",
  description:
    "Chrome extension Assistant side panel",
  label: "Extension Assistant",
  groups: [],
  values,
};

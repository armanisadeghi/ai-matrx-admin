/**
 * Surface manifest — Extension Pilot (`chrome-extension/pilot`).
 *
 * The Pilot side panel of the Chrome extension (matrx-extend `use-pilot-chat-stream.ts`).
 *
 * Declared 2026-10-12 so the manifest sync fills `ui.ui_surface.label` (it was
 * null: the row existed with no code declaration). The label here is the ONE
 * name every chrome reads (THE NAMING LAW).
 */

import type { SurfaceManifest, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";

const values: SurfaceValue[] = pickBaseline("selection", "content", "context");

export const chromeExtensionPilotManifest: SurfaceManifest = {
  surfaceName: "chrome-extension/pilot",
  client: "chrome-extension",
  executor: "chrome-extension",
  executionMode: "python-stream",
  description:
    "Chrome extension Pilot side panel",
  readiness: "stub",
  readinessNote: "Label declared 2026-10-12; the extension declares no page vocabulary beyond the baseline yet.",
  label: "Extension Pilot",
  groups: [],
  values,
};

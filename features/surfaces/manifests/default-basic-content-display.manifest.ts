/**
 * Surface manifest — Content Viewer Defaults (`matrx-default/basic-content-display`).
 *
 * Defaults inherited by any content-viewer surface: primary content and a free-form context blob.
 *
 * Declared 2026-10-12 so the manifest sync fills `ui.ui_surface.label` (it was
 * null: the row existed with no code declaration). The label here is the ONE
 * name every chrome reads (THE NAMING LAW).
 */

import type { SurfaceManifest, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";

const values: SurfaceValue[] = pickBaseline("content", "context");

export const defaultBasicContentDisplayManifest: SurfaceManifest = {
  situation:
    "{user.name|The person} is in AI Matrx, looking at content in a viewer that any page can open; the content is in your context.",
  surfaceName: "matrx-default/basic-content-display",
  client: "matrx-default",
  executor: "aidream",
  executionMode: "python-stream",
  description:
    "Defaults for any content-viewer surface: primary content and a free-form context blob.",
  label: "Content Viewer Defaults",
  groups: [],
  values,
};

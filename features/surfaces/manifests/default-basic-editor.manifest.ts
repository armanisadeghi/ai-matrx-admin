/**
 * Surface manifest — Text Editor Defaults (`matrx-default/basic-editor`).
 *
 * Defaults inherited by any text-editor surface: current selection, text before and after, full content.
 *
 * Declared 2026-10-12 so the manifest sync fills `ui.ui_surface.label` (it was
 * null: the row existed with no code declaration). The label here is the ONE
 * name every chrome reads (THE NAMING LAW).
 */

import type { SurfaceManifest, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";

const values: SurfaceValue[] = pickBaseline("selection", "text_before", "text_after", "content");

export const defaultBasicEditorManifest: SurfaceManifest = {
  situation:
    "{user.name|The person} is in AI Matrx, editing text in an editor that any page can open; the full text, what they have selected, and the text just before and after it are in your context.",
  surfaceName: "matrx-default/basic-editor",
  client: "matrx-default",
  executor: "aidream",
  executionMode: "python-stream",
  description:
    "Defaults for any text-editor-style surface: current selection, text before and after, full content.",
  label: "Text Editor Defaults",
  groups: [],
  values,
};

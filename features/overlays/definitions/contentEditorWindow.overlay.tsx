"use client";

/**
 * Opener for the `contentEditorWindow` overlay.
 *
 * Re-exports the canonical hand-written opener. `useOpenContentEditorWindow`
 * is a single hook that routes to one of three overlays (window / list /
 * workspace) based on the options' `kind` field; each variant gets its own
 * file in this directory for discoverability.
 */
import {
  useOpenContentEditorWindow,
  type OpenContentEditorWindowOptions,
  type ContentEditorWindowHandle,
} from "@/features/window-panels/windows/content-editors/useOpenContentEditorWindow";
import type { OverlayWire } from "./overlay-types";
import { hookController } from "./hook-controller";

export {
  useOpenContentEditorWindow,
  type OpenContentEditorWindowOptions,
  type ContentEditorWindowHandle,
};

export const ContentEditorWindowController = hookController(useOpenContentEditorWindow, (props: OpenContentEditorWindowOptions) => ({ variant: "editor" as const, ...props }));

export type ContentEditorWindowDefinitionData = OpenContentEditorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contentEditorWindow: OverlayWire<ContentEditorWindowDefinitionData>;
  }
}

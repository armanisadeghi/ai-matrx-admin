"use client";

/**
 * Opener for the `contentEditorListWindow` overlay.
 *
 * Routes through the shared `useOpenContentEditorWindow` hook. See
 * `contentEditorWindow.tsx` for the canonical hook.
 */
import {
  useOpenContentEditorWindow,
  type OpenContentEditorListWindowOptions,
  type ContentEditorWindowHandle,
} from "@/features/window-panels/windows/content-editors/useOpenContentEditorWindow";
import type { OverlayWire } from "./overlay-types";
import { hookController } from "./hook-controller";

export {
  useOpenContentEditorWindow,
  type OpenContentEditorListWindowOptions,
  type ContentEditorWindowHandle,
};

export const ContentEditorListWindowController = hookController(useOpenContentEditorWindow, (props: OpenContentEditorListWindowOptions) => ({ variant: "list" as const, ...props }));

export type ContentEditorListWindowDefinitionData = OpenContentEditorListWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contentEditorListWindow: OverlayWire<ContentEditorListWindowDefinitionData>;
  }
}

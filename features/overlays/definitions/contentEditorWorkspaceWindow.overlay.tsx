"use client";

/**
 * Opener for the `contentEditorWorkspaceWindow` overlay.
 *
 * Routes through the shared `useOpenContentEditorWindow` hook. See
 * `contentEditorWindow.tsx` for the canonical hook.
 */
import {
  useOpenContentEditorWindow,
  type OpenContentEditorWorkspaceWindowOptions,
  type ContentEditorWindowHandle,
} from "@/features/window-panels/windows/content-editors/useOpenContentEditorWindow";
import type { OverlayWire } from "./overlay-types";
import { hookController } from "./hook-controller";

export {
  useOpenContentEditorWindow,
  type OpenContentEditorWorkspaceWindowOptions,
  type ContentEditorWindowHandle,
};

export const ContentEditorWorkspaceWindowController = hookController(useOpenContentEditorWindow, (props: OpenContentEditorWorkspaceWindowOptions) => ({ variant: "workspace" as const, ...props }));

export type ContentEditorWorkspaceWindowDefinitionData = OpenContentEditorWorkspaceWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contentEditorWorkspaceWindow: OverlayWire<ContentEditorWorkspaceWindowDefinitionData>;
  }
}

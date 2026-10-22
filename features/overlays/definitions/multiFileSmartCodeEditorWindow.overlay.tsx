"use client";

/**
 * Opener for the `multiFileSmartCodeEditorWindow` overlay.
 *
 * Re-exports the canonical hand-written opener (full callback-aware API).
 */
import {
  useOpenMultiFileSmartCodeEditorWindow,
  type OpenMultiFileSmartCodeEditorWindowOptions,
  type MultiFileSmartCodeEditorWindowHandle,
} from "@/features/window-panels/windows/multi-file-smart-code-editor/useOpenMultiFileSmartCodeEditorWindow";
import type { OverlayWire } from "./overlay-types";
import { hookController } from "./hook-controller";

export {
  useOpenMultiFileSmartCodeEditorWindow,
  type OpenMultiFileSmartCodeEditorWindowOptions,
  type MultiFileSmartCodeEditorWindowHandle,
};

export const MultiFileSmartCodeEditorWindowController = hookController<OpenMultiFileSmartCodeEditorWindowOptions>(useOpenMultiFileSmartCodeEditorWindow);

export type MultiFileSmartCodeEditorWindowDefinitionData = OpenMultiFileSmartCodeEditorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    multiFileSmartCodeEditorWindow: OverlayWire<MultiFileSmartCodeEditorWindowDefinitionData>;
  }
}

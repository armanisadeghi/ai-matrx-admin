"use client";

/**
 * Opener for the `smartCodeEditorWindow` overlay.
 *
 * Re-exports the canonical hand-written opener (full callback-aware API
 * via the callback registry). The codegen stub was replaced because it
 * dropped the handler contract.
 */
import {
  useOpenSmartCodeEditorWindow,
  type OpenSmartCodeEditorWindowOptions,
  type SmartCodeEditorWindowHandle,
} from "@/features/window-panels/windows/smart-code-editor/useOpenSmartCodeEditorWindow";
import type { OverlayWire } from "./overlay-types";
import { hookController } from "./hook-controller";

export {
  useOpenSmartCodeEditorWindow,
  type OpenSmartCodeEditorWindowOptions,
  type SmartCodeEditorWindowHandle,
};

export const SmartCodeEditorWindowController = hookController<OpenSmartCodeEditorWindowOptions>(useOpenSmartCodeEditorWindow);

export type SmartCodeEditorWindowDefinitionData = OpenSmartCodeEditorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    smartCodeEditorWindow: OverlayWire<SmartCodeEditorWindowDefinitionData>;
  }
}

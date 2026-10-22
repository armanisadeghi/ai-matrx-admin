"use client";

/**
 * Opener for the `createProjectWindow` overlay.
 *
 * Re-exports the canonical hand-written opener (full callback-aware API via
 * the callback registry for `onCreated` / `onWindowClose`).
 *
 * Also exposes `<CreateProjectWindowController />` for the declarative form,
 * matching the convention every other opener uses.
 */
import {
  useOpenCreateProjectWindow,
  type OpenCreateProjectWindowOptions,
  type CreateProjectWindowHandle,
} from "@/features/window-panels/windows/projects/useOpenCreateProjectWindow";
import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";
import { hookController } from "./app-opener";

export {
  useOpenCreateProjectWindow,
  type OpenCreateProjectWindowOptions,
  type CreateProjectWindowHandle,
};

export const CreateProjectWindowController = hookController<OpenCreateProjectWindowOptions>(useOpenCreateProjectWindow);

export type CreateProjectWindowDefinitionData = OpenCreateProjectWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    createProjectWindow: UntypedOverlayWire;
  }
}

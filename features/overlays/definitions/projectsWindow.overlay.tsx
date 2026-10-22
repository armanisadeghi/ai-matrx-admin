"use client";

/**
 * Opener for the `projectsWindow` overlay.
 *
 * - `useOpenProjectsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ProjectsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "projectsWindow" as const;

export interface OpenProjectsWindowOptions {
}

export interface ProjectsWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenProjectsWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenProjectsWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ProjectsWindowController = opener.Controller;

export type ProjectsWindowDefinitionData = OpenProjectsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    projectsWindow: OverlayWire<ProjectsWindowDefinitionData>;
  }
}

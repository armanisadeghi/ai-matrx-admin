"use client";

/**
 * Opener for the `projectsWindow` overlay.
 *
 * - `useOpenProjectsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ProjectsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "projectsWindow" as const;

export interface OpenProjectsWindowOptions {
}

export interface ProjectsWindowHandle {
  close: () => void;
}

export function useOpenProjectsWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenProjectsWindowOptions = {}): ProjectsWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID }));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function ProjectsWindowController(props: OpenProjectsWindowOptions): null {
  const open = useOpenProjectsWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ProjectsWindowDefinitionData = OpenProjectsWindowOptions;

export const projectsWindowOverlay = defineOverlay<ProjectsWindowDefinitionData>()({
  id: "projectsWindow",
  label: "Projects Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { orgId: null },
    windowId: "projects-window",
    mobile: "fullscreen",
  },
  render: () => import("./projectsWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    projectsWindow: OverlayWire<ProjectsWindowDefinitionData>;
  }
}

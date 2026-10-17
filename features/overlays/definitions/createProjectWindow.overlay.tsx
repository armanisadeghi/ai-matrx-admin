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
import { useEffect } from "react";
import {
  useOpenCreateProjectWindow,
  type OpenCreateProjectWindowOptions,
  type CreateProjectWindowHandle,
} from "@/features/window-panels/windows/projects/useOpenCreateProjectWindow";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";

export {
  useOpenCreateProjectWindow,
  type OpenCreateProjectWindowOptions,
  type CreateProjectWindowHandle,
};

export function CreateProjectWindowController(
  props: OpenCreateProjectWindowOptions,
): null {
  const open = useOpenCreateProjectWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.instanceId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CreateProjectWindowDefinitionData = OpenCreateProjectWindowOptions;

export const createProjectWindowOverlay = defineOverlay<CreateProjectWindowDefinitionData>()({
  id: "createProjectWindow",
  label: "Create Project",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          initialOrgId: null as string | null,
          initialOrgSlug: null as string | null,
          orgLocked: false,
          skipRedirect: true,
        },
    windowId: "create-project-window",
    mobile: "drawer",
    ephemeral: true,
  },
  render: () => import("./createProjectWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    createProjectWindow: UntypedOverlayWire;
  }
}

"use client";

/**
 * Opener for the `codeFileManagerWindow` overlay.
 *
 * - `useOpenCodeFileManagerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CodeFileManagerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "codeFileManagerWindow" as const;

export interface OpenCodeFileManagerWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  windowInstanceId: string;
}

export interface CodeFileManagerWindowHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenCodeFileManagerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenCodeFileManagerWindowOptions): CodeFileManagerWindowHandle => {
      const instanceId = opts.instanceId ?? `codeFileManagerWindow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            windowInstanceId: opts.windowInstanceId,
          },
        }),
      );
      return {
        instanceId,
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
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
export function CodeFileManagerWindowController(props: OpenCodeFileManagerWindowOptions): null {
  const open = useOpenCodeFileManagerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.windowInstanceId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CodeFileManagerWindowDefinitionData = OpenCodeFileManagerWindowOptions;

export const codeFileManagerWindowOverlay = defineOverlay<CodeFileManagerWindowDefinitionData>()({
  id: "codeFileManagerWindow",
  label: "Code File Manager Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          selectedFolderId: null,
          searchQuery: "",
          sortBy: "updated",
        },
    windowId: "code-file-manager-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    codeFileManagerWindow: OverlayWire<CodeFileManagerWindowDefinitionData>;
  }
}

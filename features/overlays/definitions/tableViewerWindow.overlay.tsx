"use client";

/**
 * Opener for the `tableViewerWindow` overlay.
 *
 * - `useOpenTableViewerWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<TableViewerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 *
 * Opens a markdown table at full size in a floating WindowPanel.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "tableViewerWindow" as const;

export interface OpenTableViewerWindowOptions {
  content?: string;
  title?: string;
}

export interface TableViewerWindowHandle {
  close: () => void;
}

export function useOpenTableViewerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenTableViewerWindowOptions = {}): TableViewerWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            content: opts.content,
            title: opts.title,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export function TableViewerWindowController(
  props: OpenTableViewerWindowOptions,
): null {
  const open = useOpenTableViewerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.content, props.title]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type TableViewerWindowDefinitionData = OpenTableViewerWindowOptions;

export const tableViewerWindowOverlay = /* @__PURE__ */ defineOverlay<TableViewerWindowDefinitionData>()({
  id: "tableViewerWindow",
  label: "Table Viewer Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { content: null, title: null },
    windowId: "table-viewer-window",
    mobile: "fullscreen",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    tableViewerWindow: OverlayWire<TableViewerWindowDefinitionData>;
  }
}

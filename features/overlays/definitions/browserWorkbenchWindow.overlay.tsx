"use client";

/**
 * Opener for the `browserWorkbenchWindow` overlay.
 *
 * - `useOpenBrowserWorkbenchWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<BrowserWorkbenchWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "browserWorkbenchWindow" as const;

export interface OpenBrowserWorkbenchWindowOptions {
  initialBookmarks?: unknown;
  initialTabs?: unknown;
  initialActiveTabId?: string | null;
}

export interface BrowserWorkbenchWindowHandle {
  close: () => void;
}

export function useOpenBrowserWorkbenchWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenBrowserWorkbenchWindowOptions = {}): BrowserWorkbenchWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialBookmarks: opts.initialBookmarks,
            initialTabs: opts.initialTabs,
            initialActiveTabId: opts.initialActiveTabId,
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
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function BrowserWorkbenchWindowController(props: OpenBrowserWorkbenchWindowOptions): null {
  const open = useOpenBrowserWorkbenchWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialBookmarks, props.initialTabs, props.initialActiveTabId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type BrowserWorkbenchWindowDefinitionData = OpenBrowserWorkbenchWindowOptions;

export const browserWorkbenchWindowOverlay = defineOverlay<BrowserWorkbenchWindowDefinitionData>()({
  id: "browserWorkbenchWindow",
  label: "Browser Workbench Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { bookmarks: [], tabs: [], activeTabId: null },
    windowId: "browser-workbench-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
    preservation: { dataKeys: ["tabs", "activeTabId"] },
  },
  render: () => import("./browserWorkbenchWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    browserWorkbenchWindow: OverlayWire<BrowserWorkbenchWindowDefinitionData>;
  }
}

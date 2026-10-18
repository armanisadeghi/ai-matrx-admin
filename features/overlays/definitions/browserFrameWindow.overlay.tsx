"use client";

/**
 * Opener for the `browserFrameWindow` overlay.
 *
 * - `useOpenBrowserFrameWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<BrowserFrameWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "browserFrameWindow" as const;

export interface OpenBrowserFrameWindowOptions {
  initialUrl?: string | null;
  initialWindowTitle?: string | null;
}

export interface BrowserFrameWindowHandle {
  close: () => void;
}

export function useOpenBrowserFrameWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenBrowserFrameWindowOptions = {}): BrowserFrameWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialUrl: opts.initialUrl,
            initialWindowTitle: opts.initialWindowTitle,
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
export function BrowserFrameWindowController(props: OpenBrowserFrameWindowOptions): null {
  const open = useOpenBrowserFrameWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialUrl, props.initialWindowTitle]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type BrowserFrameWindowDefinitionData = OpenBrowserFrameWindowOptions;

export const browserFrameWindowOverlay = /* @__PURE__ */ defineOverlay<BrowserFrameWindowDefinitionData>()({
  id: "browserFrameWindow",
  label: "Browser Frame Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          initialUrl: "https://lucide.dev/icons/",
          initialWindowTitle: null,
        },
    windowId: "browser-frame-window",
    mobile: "fullscreen",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    browserFrameWindow: OverlayWire<BrowserFrameWindowDefinitionData>;
  }
}

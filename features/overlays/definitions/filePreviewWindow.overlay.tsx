"use client";

/**
 * Opener for the `filePreviewWindow` overlay.
 *
 * - `useOpenFilePreviewWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<FilePreviewWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "filePreviewWindow" as const;
let navigationRequestSequence = 0;

export interface OpenFilePreviewWindowOptions {
  fileId?: string | null;
  /** Optional 1-based page for PDF files. Ignored by non-PDF previewers. */
  pageNumber?: number | null;
}

export interface FilePreviewWindowHandle {
  close: () => void;
}

export function useOpenFilePreviewWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenFilePreviewWindowOptions = {}): FilePreviewWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            fileId: opts.fileId ?? null,
            pageNumber: opts.pageNumber ?? null,
            // A caller may re-open the same file/page after navigating away
            // inside the existing singleton window. This makes every open
            // call an explicit navigation request, even when the public
            // options are identical to the previous call.
            navigationRequestId: ++navigationRequestSequence,
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
export function FilePreviewWindowController(
  props: OpenFilePreviewWindowOptions,
): null {
  const open = useOpenFilePreviewWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.fileId, props.pageNumber]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type FilePreviewWindowDefinitionData = OpenFilePreviewWindowOptions;

export const filePreviewWindowOverlay = /* @__PURE__ */ defineOverlay<FilePreviewWindowDefinitionData>()({
  id: "filePreviewWindow",
  label: "File Preview Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          fileId: null,
          pageNumber: null,
          navigationRequestId: null,
        },
    windowId: "file-preview-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  link: {
    key: "file_preview",
    hydrate: (ctx) => import("./filePreviewWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    filePreviewWindow: OverlayWire<FilePreviewWindowDefinitionData>;
  }
}

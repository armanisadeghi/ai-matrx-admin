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

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
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

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createFilePreviewWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenFilePreviewWindowOptions = {}): FilePreviewWindowHandle => {
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
  };
}

export function useOpenFilePreviewWindow() {
  const store = useAppStore();
  return useMemo(() => createFilePreviewWindowOpener(store), [store]);
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

export type FilePreviewWindowDefinitionData = OpenFilePreviewWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    filePreviewWindow: OverlayWire<FilePreviewWindowDefinitionData>;
  }
}

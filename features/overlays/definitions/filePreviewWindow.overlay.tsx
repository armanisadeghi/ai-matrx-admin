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

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "filePreviewWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);
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
export function createFilePreviewWindowOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
  return (opts: OpenFilePreviewWindowOptions = {}): FilePreviewWindowHandle => {
    opener.open(dispatch, { data: {
          fileId: opts.fileId ?? null,
          pageNumber: opts.pageNumber ?? null,
          // A caller may re-open the same file/page after navigating away
          // inside the existing singleton window. This makes every open
          // call an explicit navigation request, even when the public
          // options are identical to the previous call.
          navigationRequestId: ++navigationRequestSequence,
        } });
    return {
      close: () => dispatch(opener.close()),
    };
  };
}

export function useOpenFilePreviewWindow() {
  const dispatch = useAppDispatch();
  return useMemo(() => createFilePreviewWindowOpener({ dispatch }), [dispatch]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const FilePreviewWindowController = hookController<OpenFilePreviewWindowOptions>(useOpenFilePreviewWindow);

export type FilePreviewWindowDefinitionData = OpenFilePreviewWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    filePreviewWindow: OverlayWire<FilePreviewWindowDefinitionData>;
  }
}

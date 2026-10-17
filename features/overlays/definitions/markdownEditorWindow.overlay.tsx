"use client";

/**
 * Opener for the `markdownEditorWindow` overlay.
 *
 * - `useOpenMarkdownEditorWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<MarkdownEditorWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "markdownEditorWindow" as const;

export interface OpenMarkdownEditorWindowOptions {
  initialMarkdown?: string;
  showSampleSelector?: boolean;
  showConfigSelector?: boolean;
}

export interface MarkdownEditorWindowHandle {
  close: () => void;
}

export function useOpenMarkdownEditorWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenMarkdownEditorWindowOptions = {}): MarkdownEditorWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialMarkdown: opts.initialMarkdown,
            showSampleSelector: opts.showSampleSelector,
            showConfigSelector: opts.showConfigSelector,
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
export function MarkdownEditorWindowController(props: OpenMarkdownEditorWindowOptions): null {
  const open = useOpenMarkdownEditorWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialMarkdown, props.showSampleSelector, props.showConfigSelector]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type MarkdownEditorWindowDefinitionData = OpenMarkdownEditorWindowOptions;

export const markdownEditorWindowOverlay = defineOverlay<MarkdownEditorWindowDefinitionData>()({
  id: "markdownEditorWindow",
  label: "Markdown Editor Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          content: null,
          processorId: null,
          coordinatorId: null,
          sampleId: null,
        },
    windowId: "markdown-editor-window",
    mobile: "fullscreen",
  },
  link: {
    key: "markdown_editor",
    hydrate: (ctx) => import("./markdownEditorWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    markdownEditorWindow: OverlayWire<MarkdownEditorWindowDefinitionData>;
  }
}

"use client";

/**
 * Opener for the `sourceInspectorWindow` overlay.
 *
 * - `useOpenSourceInspectorWindow()` — imperative hook. Call with a citation
 *   (source kind/id + chunk + page) to open the inspector; returns a handle
 *   with `close()`.
 * - `<SourceInspectorWindowController />` — declarative mount-to-open wrapper.
 *
 * The data is all primitives (+ a number[]), so it travels through Redux
 * cleanly — no callback registry needed.
 */

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "sourceInspectorWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenSourceInspectorWindowOptions {
  /** "cld_file" | "library_doc" | "note" | "code_file" | "transcript" | "scraped" */
  sourceKind: string;
  /** cld_file → file_id; library_doc → processed_document_id; else opaque. */
  sourceId: string;
  chunkId?: string | null;
  pageNumber?: number | null;
  pageNumbers?: number[] | null;
  snippet?: string | null;
  fileName?: string | null;
  score?: number | null;
  query?: string | null;
  /** Canonical citation deep-link for the "Open source" new-tab action. */
  href?: string | null;
  /** A recording: the player starts here (ms). */
  seekMs?: number | null;
  /** The citation's own place label ("2:50–4:13") — the viewer shows the same. */
  placeLabel?: string | null;
}

export interface SourceInspectorWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createSourceInspectorWindowOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
  return (opts: OpenSourceInspectorWindowOptions): SourceInspectorWindowHandle => {
    opener.open(dispatch, { data: {
          sourceKind: opts.sourceKind,
          sourceId: opts.sourceId,
          chunkId: opts.chunkId ?? null,
          pageNumber: opts.pageNumber ?? null,
          pageNumbers: opts.pageNumbers ?? null,
          snippet: opts.snippet ?? null,
          fileName: opts.fileName ?? null,
          score: opts.score ?? null,
          query: opts.query ?? null,
          href: opts.href ?? null,
          seekMs: opts.seekMs ?? null,
          placeLabel: opts.placeLabel ?? null,
        } });
    return {
      close: () => dispatch(opener.close()),
    };
  };
}

export function useOpenSourceInspectorWindow() {
  const dispatch = useAppDispatch();
  return useMemo(() => createSourceInspectorWindowOpener({ dispatch }), [dispatch]);
}

/**
 * Declarative form. Renders nothing; opens the overlay on mount, closes on
 * unmount.
 */
export const SourceInspectorWindowController = hookController<OpenSourceInspectorWindowOptions>(useOpenSourceInspectorWindow);

export type SourceInspectorWindowDefinitionData = OpenSourceInspectorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    sourceInspectorWindow: OverlayWire<SourceInspectorWindowDefinitionData>;
  }
}

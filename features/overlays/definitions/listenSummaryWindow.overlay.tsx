"use client";

/**
 * Opener for the `listenSummaryWindow` overlay — the floating "summarize for
 * listening" player (@ai-matrx/chat window-panels/windows/listen/ListenSummaryWindow).
 *
 * - `useOpenListenSummaryWindow()` — imperative hook. Opens with typed options;
 *   returns a handle with `close()`.
 * - `openListenSummaryWindowAction(...)` — the plain action for non-hook code
 *   (the message-action registry dispatches this directly).
 *
 * `autoPlay: true` is the stream-to-stream mode: the summary is spoken aloud
 * as it streams in. `autoPlay: false` summarizes into the panel and waits for
 * the user to press Play.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "listenSummaryWindow" as const;

export interface OpenListenSummaryWindowOptions {
  /** The bound `spoken_summary` agent that writes the listening summary. */
  agentId: string;
  /** Role label for the panel footer/title (e.g. "Listening summary"). */
  agentName?: string | null;
  /** The selected text / message content to summarize. */
  sourceText: string;
  /** Summary style variable — omit for the proven concise default. */
  style?: string | null;
  /** Stream-to-stream: speak the summary aloud AS it is written. */
  autoPlay?: boolean;
}

export interface ListenSummaryWindowHandle {
  close: () => void;
}

/** Plain action — for registries/thunks where a hook cannot run. */
export function openListenSummaryWindowAction(
  opts: OpenListenSummaryWindowOptions,
) {
  return openOverlay({
    overlayId: OVERLAY_ID,
    data: {
      initialAgentId: opts.agentId,
      initialAgentName: opts.agentName ?? null,
      initialSourceText: opts.sourceText,
      initialStyle: opts.style ?? null,
      initialAutoPlay: opts.autoPlay ?? false,
    },
  });
}

export function useOpenListenSummaryWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenListenSummaryWindowOptions): ListenSummaryWindowHandle => {
      dispatch(openListenSummaryWindowAction(opts));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ListenSummaryWindowDefinitionData = OpenListenSummaryWindowOptions;

export const listenSummaryWindowOverlay = defineOverlay<ListenSummaryWindowDefinitionData>()({
  id: "listenSummaryWindow",
  label: "Listen",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "listen-summary-window",
    mobile: "card",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    listenSummaryWindow: OverlayWire<ListenSummaryWindowDefinitionData>;
  }
}

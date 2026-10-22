"use client";

/**
 * Opener for the `runControlsWindow` overlay — the "Chat Options" run-controls
 * window (Attach / Context / Document / Overrides / Tools / Skills / Sandbox /
 * Settings / Preferences / Creator) for one conversation.
 *
 * - `useOpenRunControlsWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<RunControlsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import type { RunControlsTab } from "@ai-matrx/chat/agents/components/inputs/smart-input/RunControlsTabPanel";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "runControlsWindow" as const;

export interface OpenRunControlsWindowOptions {
  conversationId: string;
  /** Show the Attach tab (the `/chat/new` "+" variant). Default false. */
  includeAttach?: boolean;
  /** Tab to land on. Defaults to the surface's natural first tab. */
  initialTab?: RunControlsTab;
}

export interface RunControlsWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenRunControlsWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenRunControlsWindowOptions) => ({
          conversationId: opts.conversationId,
          includeAttach: opts.includeAttach ?? false,
          initialTab: opts.initialTab ?? null,
        }),
});

export const createRunControlsWindowOpener = opener.forStore;

export const useOpenRunControlsWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const RunControlsWindowController = opener.Controller;

export type RunControlsWindowDefinitionData = OpenRunControlsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    runControlsWindow: OverlayWire<RunControlsWindowDefinitionData>;
  }
}

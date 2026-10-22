"use client";

/**
 * Opener for the `toolCallWindow` overlay.
 *
 * - `useOpenToolCallWindowPanel()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ToolCallWindowPanelController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "toolCallWindow" as const;

export interface OpenToolCallWindowPanelOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  requestId: string | null;
  callIds: string[];
  /** TODO: tighten to `ToolLifecycleEntry[] | null` once that type is imported. */
  entries: unknown;
  initialCallId: string | null;
  initialTab: string | null;
  /** Enables the sidebar "All messages" scope (conversation-wide tool list). */
  conversationId?: string | null;
}

export interface ToolCallWindowPanelHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenToolCallWindowPanelOptions>(OVERLAY_ID, {
  multi: true,
  data: (opts: OpenToolCallWindowPanelOptions) => ({
            requestId: opts.requestId,
            callIds: opts.callIds,
            entries: opts.entries,
            initialCallId: opts.initialCallId,
            initialTab: opts.initialTab,
            conversationId: opts.conversationId ?? null,
          }),
});

export const useOpenToolCallWindowPanel = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ToolCallWindowPanelController = opener.Controller;

export type ToolCallWindowDefinitionData = OpenToolCallWindowPanelOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    toolCallWindow: OverlayWire<ToolCallWindowDefinitionData>;
  }
}

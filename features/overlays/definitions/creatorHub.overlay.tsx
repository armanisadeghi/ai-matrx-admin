"use client";

/**
 * Opener for the `creatorHub` overlay.
 *
 * - `useOpenCreatorHub()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CreatorHubController />` — declarative wrapper. Mount to open, unmount to
 *   close.
 *
 * The main-sidebar Crown toggles this overlay directly (parity with the admin
 * Bug). This opener is for programmatic opens (e.g. the Creator tools tile).
 */

import type { UntypedOverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "creatorHub" as const;

/**
 * Tab ids for the Creator Hub sidebar — also the deep-link `initialTab` set.
 * Lives here (the opener owns the open-options contract) rather than in the
 * window component, which can't be imported outside the registry.
 */
export type CreatorHubTabId =
  | "settings"
  | "data"
  | "context"
  | "payload"
  | "widget_invoker"
  | "run"
  | "sysprompt"
  | "last"
  | "model_context"
  | "session"
  | "client"
  | "backend"
  | "stream_debug"
  | "routing"
  | "sandbox"
  | "memory"
  | "actions";

export interface OpenCreatorHubOptions {
  initialTab?: CreatorHubTabId | null;
}

export interface CreatorHubHandle {
  close: () => void;
}

const opener = appOpener<OpenCreatorHubOptions>(OVERLAY_ID);

export const useOpenCreatorHub = opener.useOpen;

export const CreatorHubController = opener.Controller;

export type CreatorHubDefinitionData = OpenCreatorHubOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    creatorHub: UntypedOverlayWire;
  }
}

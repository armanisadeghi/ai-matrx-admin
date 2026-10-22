"use client";

/**
 * Opener for the `announcements` overlay.
 *
 * - `useOpenAnnouncementsViewer()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AnnouncementsViewerController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "announcements" as const;

export interface OpenAnnouncementsViewerOptions {
  /** Open directly to one announcement; omit to show the announcement inbox. */
  initialAnnouncementId?: string;
}

export interface AnnouncementsViewerHandle {
  close: () => void;
}

const opener = appOpener<OpenAnnouncementsViewerOptions>(OVERLAY_ID, {
  data: (opts: OpenAnnouncementsViewerOptions = {}) => ({ initialAnnouncementId: opts.initialAnnouncementId ?? null }),
});

export const useOpenAnnouncementsViewer = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AnnouncementsViewerController = opener.Controller;

export type AnnouncementsDefinitionData = OpenAnnouncementsViewerOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    announcements: OverlayWire<AnnouncementsDefinitionData>;
  }
}

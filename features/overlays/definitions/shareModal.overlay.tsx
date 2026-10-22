"use client";

/**
 * Opener for the `shareModal` overlay.
 *
 * - `useOpenShareModal()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ShareModalController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { ResourceType } from "@ai-matrx/sharing/core";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "shareModal" as const;

export interface OpenShareModalOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  /**
   * OPTIONAL override. Omit it — `ShareModal` resolves ownership itself.
   * Only pass an authoritative, already-resolved value.
   */
  isOwner?: boolean;
}

export interface ShareModalHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenShareModalOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenShareModal = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ShareModalController = opener.Controller;

export type ShareModalDefinitionData = OpenShareModalOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    shareModal: OverlayWire<ShareModalDefinitionData>;
  }
}

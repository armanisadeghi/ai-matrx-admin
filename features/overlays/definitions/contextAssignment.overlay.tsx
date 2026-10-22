"use client";

/**
 * Opener for the `contextAssignment` overlay — the "Attach To" surface that
 * wraps `ContextAssignmentWindow` (durable scope/project/task tagging of an
 * entity). Data-only: the subject is a plain serializable object, so it travels
 * straight through `openOverlay` data. Mirrors `diffViewerWindow` /
 * `shareModalWindow`.
 *
 * - `useOpenContextAssignment()` — imperative hook. Returns a handle with
 *   `close()`.
 * - `<ContextAssignmentController />` — declarative wrapper.
 */

import { openOverlay } from "@ai-matrx/summon/open";
import type { EntityTypeToken } from "@ai-matrx/associations";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "contextAssignment" as const;

export interface ContextAssignmentSubjectInput {
  entityType: EntityTypeToken;
  entityId: string;
  title: string;
}

export interface OpenContextAssignmentOptions {
  subject: ContextAssignmentSubjectInput;
  /** Optional stable instance id. Omit for the default singleton slot. */
  instanceId?: string;
}

export interface ContextAssignmentHandle {
  close: () => void;
}

const opener = appOpener<OpenContextAssignmentOptions>(OVERLAY_ID);

export const useOpenContextAssignment = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount, closes
 * it on unmount.
 */
export const ContextAssignmentController = opener.Controller;

export type ContextAssignmentDefinitionData = OpenContextAssignmentOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contextAssignment: OverlayWire<ContextAssignmentDefinitionData>;
  }
}

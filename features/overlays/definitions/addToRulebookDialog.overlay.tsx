"use client";

/**
 * Opener for the `addToRulebookDialog` overlay — the Oracle tap (Masterwork
 * Approach #10, in-app): save a chat answer into one of your Rulebooks as a
 * draft rule. Both entry points (message ⋯ menu, thumbs follow-up nudge) open
 * this ONE dialog.
 *
 * - `useOpenAddToRulebookDialog()` — imperative hook, returns a handle.
 * - `<AddToRulebookDialogController />` — declarative wrapper.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "addToRulebookDialog" as const;

export interface OpenAddToRulebookDialogOptions {
  /** The message content that becomes the draft rule's statement. */
  initialContent: string;
  /** The conversation the message came from — recorded in `source_ref`. */
  initialConversationId?: string | null;
  /** The message itself — its id is the draft's provenance in `source_ref`. */
  initialMessageId?: string | null;
  /** The user's question this message answered, when there was one. */
  initialQuestion?: string | null;
}

export interface AddToRulebookDialogHandle {
  close: () => void;
}

const opener = appOpener<OpenAddToRulebookDialogOptions>(OVERLAY_ID, {
  data: (opts: OpenAddToRulebookDialogOptions) => ({
            initialContent: opts.initialContent,
            initialConversationId: opts.initialConversationId ?? null,
            initialMessageId: opts.initialMessageId ?? null,
            initialQuestion: opts.initialQuestion ?? null,
          }),
});

export const useOpenAddToRulebookDialog = opener.useOpen;

export const AddToRulebookDialogController = opener.Controller;

export type AddToRulebookDialogDefinitionData = OpenAddToRulebookDialogOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    addToRulebookDialog: OverlayWire<AddToRulebookDialogDefinitionData>;
  }
}

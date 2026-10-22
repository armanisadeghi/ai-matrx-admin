"use client";

/**
 * Opener for the `flashcardsBlockWindow` overlay.
 */

import type { FlashcardsBlockData } from "@ai-matrx/agents/generated/stream-events";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "flashcardsBlockWindow" as const;

export interface OpenFlashcardsBlockWindowOptions {
  content?: string | null;
  serverData?: FlashcardsBlockData | null;
  title?: string;
  additionalDetails?: Record<string, unknown> | null;
  taskId?: string | null;
  artifactId?: string | null;
  messageId?: string | null;
  conversationId?: string | null;
  blockIndex?: number | null;
}

export interface FlashcardsBlockWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenFlashcardsBlockWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenFlashcardsBlockWindowOptions = {}) => ({
            content: opts.content ?? null,
            serverData: opts.serverData ?? null,
            title: opts.title ?? null,
            additionalDetails: opts.additionalDetails ?? null,
            taskId: opts.taskId ?? null,
            artifactId: opts.artifactId ?? null,
            messageId: opts.messageId ?? null,
            conversationId: opts.conversationId ?? null,
            blockIndex: opts.blockIndex ?? null,
          }),
});

export const useOpenFlashcardsBlockWindow = opener.useOpen;

export const FlashcardsBlockWindowController = opener.Controller;

export type FlashcardsBlockWindowDefinitionData = OpenFlashcardsBlockWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    flashcardsBlockWindow: OverlayWire<FlashcardsBlockWindowDefinitionData>;
  }
}

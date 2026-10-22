"use client";

import { useCallback } from "react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import type { CanvasContent } from "@ai-matrx/rich-content/utils/canvasContent";

/**
 * The Computer tab's canvas identity — ONE per person, never per chat. A person
 * has one machine, so every opener (the main chat, a chat window panel bound to
 * the same machine, an agent's browser outcome) focuses the same tab
 * (2026-10-17: a chat window panel opened a second Computer tab). The argument
 * is accepted so per-chat callers keep their shape; it never changes the id.
 */
export const CLOUD_COMPUTER_CANVAS_SOURCE_ID = "cloud-computer";
export function cloudComputerCanvasSourceId(_conversationId?: string | null): string {
  return CLOUD_COMPUTER_CANVAS_SOURCE_ID;
}

/**
 * The Computer tab's canvas item — one per machine. `conversationId` binds Take
 * control to the chat that opened it first; a later opener focuses that tab.
 */
export function buildCloudComputerCanvasContent(
  opts: { conversationId?: string | null } = {},
): CanvasContent {
  const conversationId = opts.conversationId ?? undefined;
  return {
    type: "cloud_computer",
    data: {},
    metadata: {
      title: "Computer",
      conversationId,
      sourceMessageId: CLOUD_COMPUTER_CANVAS_SOURCE_ID,
    },
  };
}

/** Open the Computer tab in the chat side panel. */
export function useOpenCloudComputerCanvas() {
  const { open } = useCanvas();
  return useCallback(
    (opts: { conversationId?: string | null } = {}) => {
      open(buildCloudComputerCanvasContent(opts));
    },
    [open],
  );
}

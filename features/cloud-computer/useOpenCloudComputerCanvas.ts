"use client";

import { useCallback } from "react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import type { CanvasContent } from "@/features/canvas/canvasContent";

/** The Computer tab's canvas item — one per chat. */
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
      sourceMessageId: conversationId
        ? `cloud-computer:${conversationId}`
        : undefined,
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

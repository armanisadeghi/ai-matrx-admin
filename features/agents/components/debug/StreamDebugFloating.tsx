"use client";

import React from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { StreamDebugPanel } from "./StreamDebugPanel";

export interface StreamDebugFloatingProps {
  conversationId: string;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
}

export function StreamDebugFloating({
  conversationId,
  onClose,
  defaultPosition = { x: 20, y: 60 },
}: StreamDebugFloatingProps) {
  return (
    <WindowPanel
      title="Stream Debug"
      id={`stream-debug-${conversationId}`}
      onClose={onClose}
      width={600}
      height={500}
      initialRect={{ x: defaultPosition.x, y: defaultPosition.y }}
      minWidth={300}
      minHeight={200}
      bodyClassName="p-0"
      urlSyncKey="debug"
      urlSyncId={conversationId}
    >
      <StreamDebugPanel conversationId={conversationId} className="h-full" />
    </WindowPanel>
  );
}

export default StreamDebugFloating;

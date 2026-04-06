"use client";

import React from "react";
import { WindowPanel } from "@/components/official-candidate/floating-window-panel/WindowPanel";
import { StreamDebugPanel } from "./StreamDebugPanel";

export interface StreamDebugFloatingProps {
  instanceId: string;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
}

export function StreamDebugFloating({
  instanceId,
  onClose,
  defaultPosition = { x: 20, y: 60 },
}: StreamDebugFloatingProps) {
  return (
    <WindowPanel
      title="Stream Debug"
      id={`stream-debug-${instanceId}`}
      onClose={onClose}
      initialRect={{
        x: defaultPosition.x,
        y: defaultPosition.y,
        width: 600,
        height: 500,
      }}
      minWidth={300}
      minHeight={200}
      bodyClassName="p-0"
      urlSyncKey="debug"
      urlSyncId={instanceId}
    >
      <StreamDebugPanel instanceId={instanceId} className="h-full" />
    </WindowPanel>
  );
}

export default StreamDebugFloating;

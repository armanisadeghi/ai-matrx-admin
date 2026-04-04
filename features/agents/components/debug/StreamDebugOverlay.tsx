"use client";

import React from "react";
import FullScreenOverlay from "@/components/official/FullScreenOverlay";
import { StreamDebugPanel } from "./StreamDebugPanel";

export interface StreamDebugOverlayProps {
  instanceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StreamDebugOverlay({
  instanceId,
  isOpen,
  onClose,
}: StreamDebugOverlayProps) {
  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Stream Debug"
      tabs={[
        {
          id: "debug",
          label: "Stream Inspector",
          content: (
            <StreamDebugPanel instanceId={instanceId} className="h-full" />
          ),
        },
      ]}
      hideTitle
      width="95vw"
      height="95dvh"
    />
  );
}

export default StreamDebugOverlay;

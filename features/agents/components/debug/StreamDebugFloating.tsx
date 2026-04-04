"use client";

import React, { useState, useRef, useCallback } from "react";
import { FloatingPanel } from "@/components/official-candidate/FloatingPanel";
import { StreamDebugPanel } from "./StreamDebugPanel";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [position, setPosition] = useState(defaultPosition);
  const [large, setLarge] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        setPosition({
          x: dragRef.current.startPosX + dx,
          y: dragRef.current.startPosY + dy,
        });
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [position],
  );

  return (
    <div className="fixed z-50" style={{ left: position.x, top: position.y }}>
      <FloatingPanel
        title="Stream Debug"
        size={large ? "full" : "2xl"}
        onDragStart={handleMouseDown}
        onClose={onClose}
        bodyClassName="p-0"
        actions={
          <button
            type="button"
            onClick={() => setLarge(!large)}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {large ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        }
      >
        <div
          className={cn(
            "overflow-hidden",
            large ? "h-[80vh] w-[80vw]" : "h-[60vh]",
          )}
        >
          <StreamDebugPanel instanceId={instanceId} className="h-full" />
        </div>
      </FloatingPanel>
    </div>
  );
}

export default StreamDebugFloating;

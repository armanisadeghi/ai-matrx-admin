"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useContainerDropContext } from "./ContainerDropProvider";
import type { ContainerDropItem, DragSnapshot } from "./types";

interface DragOverlayPortalProps {
  renderOverlay: (
    item: ContainerDropItem,
    snapshot: DragSnapshot,
  ) => React.ReactNode;
}

export function DragOverlayPortal({ renderOverlay }: DragOverlayPortalProps) {
  const { dragSnapshot, getDraggingItem } = useContainerDropContext();

  if (!dragSnapshot) return null;

  const item = getDraggingItem();
  if (!item) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: dragSnapshot.currentPos.x,
        top: dragSnapshot.currentPos.y,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      {renderOverlay(item, dragSnapshot)}
    </div>,
    document.body,
  );
}

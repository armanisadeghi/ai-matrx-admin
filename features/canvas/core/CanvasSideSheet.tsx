"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { 
  selectCanvasIsOpen, 
  selectCurrentCanvasItem,
  selectCanvasWidth,
  closeCanvas,
  setCanvasWidth,
} from "@/features/canvas/redux/canvasSlice";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CanvasRenderer } from "./CanvasRenderer";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * CanvasSideSheet - Global canvas side sheet component
 * 
 * Features:
 * - Always available (works in routes, modals, sheets)
 * - High z-index (10000) to appear above modals
 * - Resizable width with drag handle
 * - Mobile: fullscreen overlay
 * - Subscribes to Redux canvas state
 * 
 * This component should be rendered once at the root layout level.
 */
export function CanvasSideSheet() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectCanvasIsOpen);
  const currentItem = useAppSelector(selectCurrentCanvasItem);
  const canvasWidth = useAppSelector(selectCanvasWidth);
  const isMobile = useIsMobile();
  
  const [isResizing, setIsResizing] = useState(false);

  const handleClose = useCallback(() => {
    dispatch(closeCanvas());
  }, [dispatch]);

  // Handle resize - Desktop only
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate width from the right edge
    const newWidth = window.innerWidth - e.clientX;
    
    // Constrain canvas width between 500px min and 1200px max
    const minWidth = 500;
    const maxWidth = 1200;
    const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
    
    dispatch(setCanvasWidth(constrainedWidth));
  }, [isResizing, dispatch]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Setup mouse event listeners for resizing
  useEffect(() => {
    if (!isResizing) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Prevent text selection during resize
  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  }, [isResizing]);

  if (!currentItem) return null;

  // Extract title for accessibility (visually hidden)
  // Handle both string and ReactNode titles
  const canvasTitle = typeof currentItem.content.metadata?.title === 'string'
    ? currentItem.content.metadata.title
    : currentItem.content.metadata?.title
      ? 'Canvas Content'
      : 'Canvas';

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        hideCloseButton
        className="p-0 gap-0 overflow-hidden border-l border-zinc-200 dark:border-zinc-800"
        style={{
          width: isMobile ? '100%' : `${canvasWidth}px`,
          maxWidth: isMobile ? '100%' : `${canvasWidth}px`,
          height: isMobile ? '100dvh' : '100vh',
          zIndex: 10000, // Above modals (9999)
        }}
        // Disable default close button, CanvasRenderer has its own
        onPointerDownOutside={(e) => {
          // Allow closing by clicking overlay
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        {/* Visually hidden title for accessibility */}
        <SheetTitle className="sr-only">{canvasTitle}</SheetTitle>
        
        {/* Resize Handle - Desktop only */}
        {!isMobile && (
          <div
            className="absolute top-0 bottom-0 left-0 w-4 cursor-col-resize z-20 flex items-center justify-center hover:bg-primary/5 transition-colors"
            onMouseDown={() => setIsResizing(true)}
            style={{ marginLeft: '-4px' }}
          >
            {/* Visual drag handle */}
            <div className="w-1 h-16 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-primary transition-colors" />
          </div>
        )}

        {/* Canvas Content */}
        <div className="h-full w-full overflow-hidden">
          <CanvasRenderer 
            content={currentItem.content}
            variant="default"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}


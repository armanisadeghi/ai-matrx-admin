"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import {
  selectMessagingIsOpen,
  selectMessagingSheetWidth,
  selectCurrentConversationId,
  closeMessaging,
  setSheetWidth,
  clearCurrentConversation,
} from "../redux/messagingSlice";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ConversationList } from "./ConversationList";
import { ChatThread } from "./ChatThread";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";

/**
 * MessagingSideSheet - Global messaging side sheet component
 * 
 * Features:
 * - Always available (works in routes, modals, sheets)
 * - High z-index (10000) to appear above modals
 * - Resizable width with drag handle
 * - Mobile: fullscreen overlay
 * - Subscribes to Redux messaging state
 * 
 * This component should be rendered once at the root layout level.
 */
export function MessagingSideSheet() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectMessagingIsOpen);
  const sheetWidth = useAppSelector(selectMessagingSheetWidth);
  const currentConversationId = useAppSelector(selectCurrentConversationId);
  const isMobile = useIsMobile();

  const [isResizing, setIsResizing] = useState(false);

  const handleClose = useCallback(() => {
    dispatch(closeMessaging());
  }, [dispatch]);

  const handleBack = useCallback(() => {
    dispatch(clearCurrentConversation());
  }, [dispatch]);

  // Handle resize - Desktop only
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate width from the right edge
      const newWidth = window.innerWidth - e.clientX;

      // Constrain width between 350px min and 800px max
      const minWidth = 350;
      const maxWidth = 800;
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      dispatch(setSheetWidth(constrainedWidth));
    },
    [isResizing, dispatch]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Setup mouse event listeners for resizing
  useEffect(() => {
    if (!isResizing) return;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Prevent text selection during resize
  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
  }, [isResizing]);

  // Sheet title for accessibility
  const sheetTitle = currentConversationId ? "Chat" : "Messages";

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="p-0 gap-0 overflow-hidden border-l border-zinc-200 dark:border-zinc-800 flex flex-col"
        style={{
          width: isMobile ? "100%" : `${sheetWidth}px`,
          maxWidth: isMobile ? "100%" : `${sheetWidth}px`,
          height: isMobile ? "100dvh" : "100vh",
          zIndex: 10000, // Above modals (9999)
        }}
        onPointerDownOutside={(e) => {
          // Allow closing by clicking overlay on desktop
          if (!isMobile && e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        {/* Visually hidden title for accessibility */}
        <SheetTitle className="sr-only">{sheetTitle}</SheetTitle>

        {/* Resize Handle - Desktop only */}
        {!isMobile && (
          <div
            className="absolute top-0 bottom-0 left-0 w-4 cursor-col-resize z-20 flex items-center justify-center hover:bg-primary/5 transition-colors"
            onMouseDown={() => setIsResizing(true)}
            style={{ marginLeft: "-4px" }}
          >
            {/* Visual drag handle */}
            <div className="w-1 h-16 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-primary transition-colors" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            {currentConversationId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {sheetTitle}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentConversationId ? (
            <ChatThread conversationId={currentConversationId} />
          ) : (
            <ConversationList />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MessagingSideSheet;

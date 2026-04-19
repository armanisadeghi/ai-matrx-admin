"use client";

/**
 * MessageOptionsMenu — the "more options" (⋯) overflow menu attached to a
 * message. Role-aware: assistant messages get the assistant action set,
 * user messages get the user action set (which includes Edit & Resubmit).
 *
 * Props are passed directly — no Redux instance-registration pattern.
 */

import React, { useEffect } from "react";
import AdvancedMenu from "@/components/official/AdvancedMenu";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import {
  getAssistantMessageActions,
  getUserMessageActions,
  resumePendingAuthAction,
  type MessageActionContext,
} from "./messageActionRegistry";

export interface MessageOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  role: "user" | "assistant";
  /** Flat-text rendering of the message content (for copy/print/TTS). */
  content: string;
  /** Server-assigned `cx_message.id`. Null hides mutation actions. */
  messageId: string | null;
  /** Server-assigned `cx_conversation.id`. Null hides mutation actions. */
  conversationId: string | null;
  /** Optional JSON metadata to include in saves/exports. */
  metadata?: Record<string, unknown> | null;
  anchorElement?: HTMLElement | null;
  /** True when a full-page print handler is available (assistant only). */
  showFullPrint?: boolean;
  onFullPrint?: () => void;
  isCapturing?: boolean;
}

export function MessageOptionsMenu({
  isOpen,
  onClose,
  role,
  content,
  messageId,
  conversationId,
  metadata = null,
  anchorElement,
  showFullPrint = false,
  onFullPrint,
  isCapturing = false,
}: MessageOptionsMenuProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = !!user?.email;

  useEffect(() => {
    resumePendingAuthAction(isAuthenticated, content, dispatch);
  }, [isAuthenticated, content, dispatch]);

  const ctx: MessageActionContext = {
    content,
    isAuthenticated,
    messageId,
    conversationId,
    metadata,
    dispatch,
    onClose,
    showFullPrint,
    onFullPrint,
    isCapturing,
  };

  const menuItems =
    role === "user"
      ? getUserMessageActions(ctx)
      : getAssistantMessageActions(ctx);

  return (
    <AdvancedMenu
      isOpen={isOpen}
      onClose={onClose}
      items={menuItems}
      title={role === "user" ? "Your message" : "Message options"}
      position="bottom-left"
      anchorElement={anchorElement}
    />
  );
}

export default MessageOptionsMenu;

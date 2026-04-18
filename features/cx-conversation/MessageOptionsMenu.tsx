"use client";

import React, { useState, useEffect } from "react";
import AdvancedMenu from "@/components/official/AdvancedMenu";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import { selectMessageActionInstance } from "@/features/agents/redux/execution-system/message-actions";

// ── Legacy selectors stubbed during Redux unification ────────────────────────
// selectMessageHasUnsavedChanges / selectMessageHasHistory used to read the
// legacy `chatConversations.sessions[sid].messages[]` cache. That cache is
// gone; per-message unsaved/history state now lives on the DB-faithful
// `messages` slice (status: "edited", contentHistory). cx-conversation is
// slated for a full rewrite, so rather than rewire a dying feature we stub
// these as `false` — the UI falls back to hiding the unsaved indicator and
// history button until chat is rebuilt on the new slices.
const selectMessageHasUnsavedChanges = (
  _state: unknown,
  _sessionId: string,
  _messageId: string,
): boolean => false;
const selectMessageHasHistory = (
  _state: unknown,
  _sessionId: string,
  _messageId: string,
): boolean => false;
import { useCartesiaSpeaker } from "@/features/tts/hooks/useCartesiaSpeaker";
import {
  getMessageActions,
  resumePendingAuthAction,
} from "@/features/cx-conversation/actions/messageActionRegistry";
export interface MessageOptionsMenuProps {
  isOpen: boolean;
  instanceId: string;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
  showFullPrint?: boolean;
  onFullPrint?: () => void;
  isCapturing?: boolean;
}

const MessageOptionsMenu: React.FC<MessageOptionsMenuProps> = ({
  isOpen,
  instanceId,
  onClose,
  anchorElement,
  showFullPrint = false,
  onFullPrint,
  isCapturing,
}) => {
  const dispatch = useAppDispatch();
  const instance = useAppSelector((state) =>
    selectMessageActionInstance(state, instanceId),
  );
  const user = useAppSelector(selectUser);
  const isAuthenticated = !!user?.email;
  const [isBrowserTtsPlaying, setIsBrowserTtsPlaying] = useState(false);

  const hasUnsavedChanges = useAppSelector((state) =>
    instance?.sessionId && instance?.messageId
      ? selectMessageHasUnsavedChanges(
          state,
          instance.sessionId,
          instance.messageId,
        )
      : false,
  );
  const hasHistory = useAppSelector((state) =>
    instance?.sessionId && instance?.messageId
      ? selectMessageHasHistory(state, instance.sessionId, instance.messageId)
      : false,
  );

  // Lazy TTS hook — does nothing until speak() is called (no eager token fetch)
  const {
    speak: cartesiaSpeak,
    isLoading: isTtsGenerating,
    isPlaying: isTtsPlaying,
  } = useCartesiaSpeaker({ processMarkdown: true });

  useEffect(() => {
    if (instance) {
      resumePendingAuthAction(isAuthenticated, instance.content, dispatch);
    }
  }, [isAuthenticated, instance?.content, instanceId, dispatch]);

  if (!instance) return null;

  const menuItems = getMessageActions({
    instanceId,
    content: instance.content,
    isAuthenticated,
    sessionId: instance.sessionId,
    messageId: instance.messageId,
    conversationId: instance.conversationId,
    rawContent: instance.rawContent,
    metadata: instance.metadata,
    hasUnsavedChanges,
    hasHistory,
    dispatch,
    onClose,
    showFullPrint,
    onFullPrint,
    isCapturing,
    ttsState: {
      isTtsGenerating,
      isTtsPlaying,
      isBrowserTtsPlaying,
      cartesiaSpeak,
      setBrowserTtsPlaying: setIsBrowserTtsPlaying,
    },
  });

  return (
    <AdvancedMenu
      isOpen={isOpen}
      onClose={onClose}
      items={menuItems}
      title="Message Options"
      position="bottom-left"
      anchorElement={anchorElement}
    />
  );
};

export default MessageOptionsMenu;

"use client";

import React, { useState, useEffect } from "react";
import AdvancedMenu from "@/components/official/AdvancedMenu";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import { selectMessageActionInstance } from "@/features/cx-conversation/redux/messageActionsSlice";
import {
  selectMessageHasUnsavedChanges,
  selectMessageHasHistory,
} from "@/features/cx-conversation/redux/selectors";
import { useCartesiaWithPreferences } from "@/hooks/tts/simple/useCartesiaWithPreferences";
import {
  getMessageActions,
  resumePendingAuthAction,
} from "@/features/cx-conversation/actions/messageActionRegistry";
import { toast } from "sonner";

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

  const voicePreferences = useAppSelector(
    (state) => state.userPreferences?.voice,
  );
  const voiceName = voicePreferences?.voice ? "Cartesia" : "Default voice";
  const {
    speak: cartesiaSpeak,
    isGenerating: isTtsGenerating,
    isPlaying: isTtsPlaying,
  } = useCartesiaWithPreferences({
    processMarkdown: true,
    onError: (error) =>
      toast.error("Speech playback failed", { description: error }),
    onPlaybackStart: () =>
      toast.success("Playing audio...", { description: `Using ${voiceName}` }),
  });

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

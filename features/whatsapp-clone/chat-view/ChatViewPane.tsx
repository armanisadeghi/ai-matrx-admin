"use client";

import { ChatHeader } from "./ChatHeader";
import { ChatViewEmpty } from "./ChatViewEmpty";
import { DoodleBackdrop } from "./DoodleBackground";
import { MessageList } from "./MessageList";
import { MessageInputBar } from "./MessageInputBar";
import { useWhatsAppChat } from "../hooks/useWhatsAppChat";
import { useWAModals } from "../modals/ModalContext";
import type { WAConversation } from "../types";

interface ChatViewPaneProps {
  conversation: WAConversation | null;
}

export function ChatViewPane({ conversation }: ChatViewPaneProps) {
  const { messages, sendMessage, isSending } = useWhatsAppChat(
    conversation?.id ?? null,
  );
  const { openMedia } = useWAModals();

  if (!conversation) {
    return <ChatViewEmpty />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        conversation={conversation}
        onOpenMedia={openMedia}
        onCallVoice={() => {}}
        onCallVideo={() => {}}
        onSearch={() => {}}
        onOpenContactInfo={openMedia}
      />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <DoodleBackdrop />
        <div className="absolute inset-0">
          <MessageList
            messages={messages}
            participants={conversation.participants}
          />
        </div>
      </div>
      <MessageInputBar
        conversationId={conversation.id}
        onSend={sendMessage}
        disabled={isSending}
      />
    </div>
  );
}

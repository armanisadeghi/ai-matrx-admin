"use client";

import React, { useMemo } from "react";
import UserMessage from "@/features/chat/ui-parts/response/UserMessage";
import AssistantMessage from "@/features/chat/components/response/assistant-message/AssistantMessage";
import { useFetchConversationMessages } from "./useFetchConversationMessages";
import { NewChatResult } from "@/hooks/ai/chat/new/useChat";
import { ChatResult } from "@/hooks/ai/chat/useChat";
import AssistantStream from "../../components/response/assistant-message/stream/AssistantStream";

const DEBUG = false;

export type localMessage = {
    id: string;
    conversationId: string;
    role: any;
    content: string;
    type: any;
    displayOrder: number;
    systemOrder: number;
    metadata?: any;
    userId?: string;
    isPublic?: boolean;
    matrxRecordId?: string;
};

interface ResponseColumnProps {
    chatHook: NewChatResult;
}

const MessageItem = React.memo(({ message, onScrollToBottom }: { message: localMessage; onScrollToBottom: () => void }) => {
    return message.role === "user" ? (
        <UserMessage key={message.id} message={message} onScrollToBottom={onScrollToBottom} />
    ) : (
        <AssistantMessage key={message.id} content={message.content} isStreamActive={false} onScrollToBottom={onScrollToBottom} />
    );
});

MessageItem.displayName = "MessageItem";

const ResponseColumn: React.FC<ResponseColumnProps> = ({ chatHook }) => {
    const conversationId = useMemo(() => chatHook.conversationId, [chatHook.conversationId]);
    const newChat = useMemo(() => chatHook.isNewChat, [chatHook.isNewChat]);
    const eventName = useMemo(() => chatHook.eventName, [chatHook.eventName]);

    const { isStreaming, messagesToDisplay, isLastMessageAssistant } = useFetchConversationMessages({
        conversationId,
        eventName,
        fetchOnStreamEnd: true,
        isNewChat: newChat,
    });

    const handleScrollToBottom = () => {
        console.log("scrolling to bottom");
    };

    if (DEBUG) {
        console.log(" ----- ResponseColumn ----- ");
        console.log(" - conversationId", conversationId);
        console.log(" - eventName", eventName);
        console.log(" - newChat", newChat);
        console.log(" - isLastMessageAssistant", isLastMessageAssistant);
        const truncatedMessagesContent = messagesToDisplay.map((message) => ({
            role: message.role,
            displayOrder: message.displayOrder,
            content: message.content.slice(0, 100),
        }));
        console.log(" - truncatedMessagesContent", JSON.stringify(truncatedMessagesContent, null, 2));
        console.log(" ----- ResponseColumn ----- ");
    }

    return (
        <div className="w-full px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {messagesToDisplay.map((message) => (
                    <MessageItem key={message.id} message={message} onScrollToBottom={handleScrollToBottom} />
                ))}

                {!isLastMessageAssistant && <AssistantStream eventName={eventName} />}
            </div>
        </div>
    );
};

export default ResponseColumn;

"use client";

import React, { useEffect } from "react";
import UserMessage from "@/features/chat/ui-parts/response/UserMessage";
import AssistantMessage from "@/features/chat/ui-parts/response/AssistantMessage";
import AssistantStream from "./stream/AssistantMessage";
import { useAppSelector } from "@/lib/redux";
import useChatBasics from "@/features/chat/hooks/useNewChatBasics";

const INFO = true;
const DEBUG = true;
const VERBOSE = false;


export type localMessage = {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    type: string;
    displayOrder: number;
    systemOrder: number;
    metadata?: any;
    userId?: string;
    isPublic?: boolean;
    matrxRecordId?: string;
};

const MessageItem = React.memo(({ message, onScrollToBottom }: { message: localMessage; onScrollToBottom: () => void }) => {
    return message.role === "user" ? (
        <UserMessage key={message.id} message={message} onScrollToBottom={onScrollToBottom} />
    ) : (
        <AssistantMessage key={message.id} content={message.content} isStreamActive={false} onScrollToBottom={onScrollToBottom} />
    );
});

MessageItem.displayName = "MessageItem";

const ResponseColumn: React.FC = () => {
    const {
        chatSelectors,
        eventName,
    } = useChatBasics();

    const messagesToDisplay = useAppSelector(chatSelectors.messageRelationFilteredRecords);
    const isLastMessageAssistant = useAppSelector(chatSelectors.isLastMessageAssistant);
    const isStreaming = useAppSelector(chatSelectors.isStreaming);

    const shouldShowStream = isStreaming && isLastMessageAssistant;


    const handleScrollToBottom = () => {
        console.log("scrolling to bottom");
    };

    return (
        <div className="w-full px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {messagesToDisplay.map((message) => (
                    <MessageItem key={message.id} message={message} onScrollToBottom={handleScrollToBottom} />
                ))}

                {!shouldShowStream && <AssistantStream eventName={eventName} />}
            </div>
        </div>
    );
};

export default ResponseColumn;

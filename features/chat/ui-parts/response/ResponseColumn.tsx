"use client";

import React, { useEffect, useMemo, useState } from "react";
import UserMessage from "@/features/chat/ui-parts/response/UserMessage";
import AssistantMessage from "@/features/chat/ui-parts/response/AssistantMessage";
import { ConversationWithRoutingResult } from "@/hooks/ai/chat/useConversationWithRouting";

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

import { useFetchConversationMessages } from "./useFetchConversationMessages";
import { ChatTaskManager } from "@/lib/redux/socket/task-managers/ChatTaskManager";
import { useDebounce } from "@uidotdev/usehooks";
import { ChatResult } from "@/hooks/ai/chat/new/useChat";


interface ResponseColumnProps {
    chatHook: ChatResult;
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
    const { currentMessages, nextDisplayOrder, refetch } = useFetchConversationMessages(chatHook.conversationId, chatHook.newChat);

    const chatManager = new ChatTaskManager();
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingResponse, setStreamingResponse] = useState("");

    const handleScrollToBottom = () => {
        console.log("scrolling to bottom");
    };

    useEffect(() => {
        let unsubscribe: () => void;

        const setupSubscription = async () => {
            unsubscribe = await chatManager.subscribeToChat({
                onUpdate: (chunk, fullText) => {
                    setStreamingResponse(fullText); // Update full text as it streams
                    setIsStreaming(true); // Mark streaming as active
                },
                onComplete: () => {
                    setIsStreaming(false); // End streaming
                    refetch(); // Fetch final messages only once
                },
                onError: (error, isFatal) => {
                    console.error(`Error: ${error} (${isFatal ? "fatal" : "non-fatal"})`);
                    setIsStreaming(false); // Reset on error
                },
            });
        };

        setupSubscription();

        // Cleanup: only call unsubscribe if it’s been set
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const isStreamActive = useDebounce(isStreaming, 400);

    const visibleMessages = useMemo(() => {
        return currentMessages.filter((message) => message.role === "user" || message.role === "assistant");
    }, [currentMessages]);

    const streamingMessageKey = useMemo(() => {
        return isStreaming ? `streaming-${nextDisplayOrder}` : null;
    }, [isStreaming, nextDisplayOrder]);


    useEffect(() => {
        if (isStreaming) {
            refetch();
            console.log("refetching");
        }
    }, [isStreaming, refetch]);

    return (
        <div className="w-full px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {visibleMessages.map((message) => (
                    <MessageItem key={message.id} message={message} onScrollToBottom={handleScrollToBottom} />
                ))}

                {/* Show the streaming message if we're currently streaming */}
                {isStreaming && streamingResponse && (
                    <AssistantMessage
                        key={streamingMessageKey}
                        content={streamingResponse}
                        isStreamActive={isStreamActive}
                        onScrollToBottom={handleScrollToBottom}
                    />
                )}
            </div>
        </div>
    );
};

export default ResponseColumn;

"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import UserMessage from "@/features/chat/components/response/user-message/UserMessage";
import AssistantMessage from "@/features/chat/components/response/assistant-message/AssistantMessage";
import { useAppSelector } from "@/lib/redux";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import AssistantStream from "@/features/chat/components/response/assistant-message/stream/AssistantStream";
import { MarkdownAnalysisData } from "@/components/mardown-display/chat-markdown/MarkdownAnalyzer";

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
    markdownAnalysisData?: MarkdownAnalysisData;
};

const MessageItem = React.memo(({ message, onScrollToBottom }: { message: localMessage; onScrollToBottom: () => void }) => {
    const handleContentEdit = (newContent: string) => {
        console.log("newContent", newContent);
    };

    if (VERBOSE && message.role === "assistant") {
        console.log("Message Item", message.id, JSON.stringify(message.markdownAnalysisData));
    }

    return message.role === "user" ? (
        <UserMessage key={message.id} message={message} onScrollToBottom={onScrollToBottom} />
    ) : (
        <AssistantMessage
            key={message.id}
            message={message}
            isStreamActive={false}
            onScrollToBottom={onScrollToBottom}
            onContentUpdate={handleContentEdit}
            markdownAnalysisData={message.markdownAnalysisData || null}
        />
    );
});

MessageItem.displayName = "MessageItem";

export type SocketInfoResponse = {
    type: string;
    status: string;
    message: string;
    related_id: string;
    data: MarkdownAnalysisData;
};

const ResponseColumn: React.FC = () => {
    const [streamKey, setStreamKey] = useState<string>("stream-0");
    const [analysisDataResponse, setAnalysisDataResponse] = useState<MarkdownAnalysisData | null>(null);
    const { chatSelectors, eventName } = useChatBasics();
    const messagesToDisplay = useAppSelector(chatSelectors.messageRelationFilteredRecords);
    const messageCount = messagesToDisplay.length;

    const messagesToDisplayWithAnalysisData = useMemo(
        () =>
            messagesToDisplay.map((message) => {
                if (analysisDataResponse && message.id === analysisDataResponse.related_id) {
                    return {
                        ...message, // Spread the original message properties
                        markdownAnalysisData: analysisDataResponse,
                    };
                }
                return {
                    ...message,
                };
            }),
        [messagesToDisplay, analysisDataResponse]
    );

    const bottomRef = useRef<HTMLDivElement>(null);
    const isStreaming = useAppSelector(chatSelectors.isStreaming);

    const handleScrollToBottom = () => {
        // Repeat scroll 3 times with 100ms intervals
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }, i * 100);
        }
    };

    useEffect(() => {
        if (messageCount === 0) return;
        const timer = setTimeout(() => {
            const assistantMessages = messagesToDisplay.filter((message) => message.role === "assistant");
            const maxDisplayOrder = Math.max(...assistantMessages.map((message) => message.displayOrder), 0);
            setStreamKey(`stream-${maxDisplayOrder}`);
        }, 100);
        return () => clearTimeout(timer);
    }, [messageCount, messagesToDisplay]);

    useEffect(() => {
        handleScrollToBottom();
    }, [messageCount]);

    const onVisibilityChange = (isVisible: boolean) => {
        if (!isStreaming) return;
        if (isVisible) {
            handleScrollToBottom();
        }
    };

    const handleAddAnalysisData = (data: SocketInfoResponse) => {
        const markdownAnalysisData: MarkdownAnalysisData = {
            output: data.data.output,
            analysis: data.data.analysis,
            related_id: data.related_id,
        };

        setAnalysisDataResponse(markdownAnalysisData);
    };

    return (
        <div className="w-full pt-0 pb-24 relative">
            <div className="max-w-3xl mx-auto px-6 space-y-6">
                {messagesToDisplayWithAnalysisData.map((message) => (
                    <MessageItem key={message.id} message={message} onScrollToBottom={handleScrollToBottom} />
                ))}
                <AssistantStream
                    key={streamKey}
                    eventName={eventName}
                    handleVisibility={onVisibilityChange}
                    scrollToBottom={handleScrollToBottom}
                    handleAddAnalysisData={handleAddAnalysisData}
                />
                <div ref={bottomRef} style={{ height: "1px" }} />
            </div>
        </div>
    );
};

export default ResponseColumn;

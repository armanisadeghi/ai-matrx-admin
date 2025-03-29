"use client";

import React, { useState, useEffect, useRef } from "react";
import UserMessage from "@/features/chat/components/response/user-message/UserMessage";
import AssistantMessage from "@/features/chat/components/response/assistant-message/AssistantMessage";
import { useAppSelector } from "@/lib/redux";
import useChatBasics from "@/features/chat/hooks/useChatBasics";
import { ChevronDoubleDown } from "@mynaui/icons-react";
import AssistantStream from "@/features/chat/components/response/assistant-message/stream/AssistantMessage";



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
    const handleContentEdit = (newContent: string) => {
        console.log("newContent", newContent);
    };

    return message.role === "user" ? (
        <UserMessage key={message.id} message={message} onScrollToBottom={onScrollToBottom} />
    ) : (
        <AssistantMessage
            key={message.id}
            content={message.content}
            isStreamActive={false}
            onScrollToBottom={onScrollToBottom}
            onContentUpdate={handleContentEdit}
        />
    );
});

MessageItem.displayName = "MessageItem";

const ResponseColumn: React.FC = () => {
    const [streamKey, setStreamKey] = useState<string>("stream-0");
    const { chatSelectors, eventName } = useChatBasics();
    const messagesToDisplay = useAppSelector(chatSelectors.messageRelationFilteredRecords);
    const messageCount = messagesToDisplay.length;

    const bottomRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    useEffect(() => {
        if (messageCount == 0) return;
        const timer = setTimeout(() => {
            const assistantMessages = messagesToDisplay.filter((message) => message.role === "assistant");
            const maxDisplayOrder = Math.max(...assistantMessages.map((message) => message.displayOrder), 0);
            setStreamKey(`stream-${maxDisplayOrder}`);
        }, 100);
        return () => clearTimeout(timer);
    }, [messageCount, messagesToDisplay]);

    const handleScrollToBottom = () => {
        console.log("scrolling to bottom");
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsAtBottom(entry.isIntersecting);
            },
            {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            }
        );

        const currentRef = bottomRef.current;

        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
            observer.disconnect();
        };
    }, []);


    return (
        <div className="w-full px-4 py-6 relative">
            <div className="max-w-3xl mx-auto space-y-6">
                {messagesToDisplay.map((message) => (
                    <MessageItem
                        key={message.id}
                        message={message}
                        onScrollToBottom={handleScrollToBottom}
                    />
                ))}

                <AssistantStream key={streamKey} eventName={eventName} />

                <div ref={bottomRef} style={{ height: '1px' }} />
            </div>

            {!isAtBottom && (
                <button
                    onClick={handleScrollToBottom}
                    className="
                        fixed bottom-10 right-10 z-50 // Position fixed at bottom-right
                        p-2 bg-gray-700 bg-opacity-50
                        text-white rounded-full
                        hover:bg-opacity-75 focus:outline-non
                        focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                        transition-opacity duration-300
                    "
                    aria-label="Scroll to bottom"
                >
                    <ChevronDoubleDown className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default ResponseColumn;

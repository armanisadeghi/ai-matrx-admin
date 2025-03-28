"use client";

import React, { useState, useEffect, useRef } from "react";
import UserMessage from "@/features/chat/components/response/user-message/UserMessage";
import AssistantMessage from "@/features/chat/components/response/assistant-message/AssistantMessage";
import AssistantStream from "../../ui-parts/response/stream/AssistantMessage";
import { useAppSelector } from "@/lib/redux";
import useChatBasics from "@/features/chat/hooks/useNewChatBasics";
import { ChevronDoubleDown } from "@mynaui/icons-react";

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

    // --- State for Button Visibility ---
    const [isAtBottom, setIsAtBottom] = useState(true);
    // ---                               ---

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

    // --- Intersection Observer Logic ---
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Update state based on whether the target element is intersecting
                setIsAtBottom(entry.isIntersecting);
            },
            {
                root: null, // Use the viewport as the root
                rootMargin: '0px',
                threshold: 0.1 // Trigger when even a small part is visible/invisible
            }
        );

        const currentRef = bottomRef.current; // Capture current ref value

        if (currentRef) {
            observer.observe(currentRef);
        }

        // Cleanup function
        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
            observer.disconnect(); // Disconnect observer
        };
    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount
    // ---                               ---


    return (
        // Make this div relative if you want the button positioned relative to it
        // instead of the viewport. Add `relative` class if needed.
        <div className="w-full px-4 py-6 relative"> {/* Added relative for potential absolute positioning */}
            {/* This div needs to be the scrollable container if not the window itself.
                Ensure it has appropriate CSS like `overflow-y: auto` and a `max-height` or `height`.
                If the whole window scrolls, this setup will still work. */}
            <div className="max-w-3xl mx-auto space-y-6">
                {messagesToDisplay.map((message) => (
                    <MessageItem
                        key={message.id}
                        message={message}
                        onScrollToBottom={handleScrollToBottom} // Keep passing this down
                    />
                ))}

                <AssistantStream key={streamKey} eventName={eventName} />

                {/* The element to observe for scrolling */}
                <div ref={bottomRef} style={{ height: '1px' }} /> {/* Give it minimal height */}
            </div>

            {/* --- Conditional Scroll To Bottom Button --- */}
            {!isAtBottom && (
                <button
                    onClick={handleScrollToBottom}
                    className="
                        fixed bottom-10 right-10 z-50 // Position fixed at bottom-right
                        p-2 bg-gray-700 bg-opacity-50 // Semi-transparent background
                        text-white rounded-full // White icon, rounded shape
                        hover:bg-opacity-75 focus:outline-none // Hover effect and focus style
                        focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 // Focus ring for accessibility
                        transition-opacity duration-300 // Smooth appearance (optional)
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

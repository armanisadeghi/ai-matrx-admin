"use client";

import React, { useEffect, useRef } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectMessages,
    selectInstance,
    selectShowSystemMessage,
    selectShowTemplateMessages,
    selectRequiresVariableReplacement
} from "@/lib/redux/prompt-execution/selectors";
import { PromptUserMessage } from "../builder/PromptUserMessage";
import { PromptAssistantMessage } from "../builder/PromptAssistantMessage";
import { PromptSystemMessage } from "../builder/PromptSystemMessage";
import { StreamingAssistantMessage } from "./StreamingAssistantMessage";
import { MessageSquare } from "lucide-react";
import { selectPrimaryResponseEndedByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";

interface SmartMessageListProps {
    runId: string;
    className?: string;
    emptyStateMessage?: string;
    showSystemMessage?: boolean;
}

export function SmartMessageList({
    runId,
    className = "",
    emptyStateMessage = "Ready to run your prompt",
    showSystemMessage: showSystemMessageProp,
}: SmartMessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Redux selectors
    const messages = useAppSelector(state => selectMessages(state, runId));
    const instance = useAppSelector(state => selectInstance(state, runId));
    const showSystemMessage = useAppSelector(state => selectShowSystemMessage(state, runId));
    const showTemplateMessages = useAppSelector(state => selectShowTemplateMessages(state, runId));
    const requiresVariableReplacement = useAppSelector(state => selectRequiresVariableReplacement(state, runId));

    const currentTaskId = instance?.execution?.currentTaskId;
    // Select ONLY the completion status, NOT the text
    const isResponseEnded = useAppSelector((state) =>
        currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
    );

    const isStreaming = !isResponseEnded || false;

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    // Logic to determine if we should show messages
    // If it's the first run (requires replacement) and we aren't showing templates, hide everything
    const shouldShowMessages = !requiresVariableReplacement || showTemplateMessages;

    if (!instance) {
        return null; // Or loading state
    }

    if ((messages.length === 0 || !shouldShowMessages) && !isStreaming) {
        return (
            <div className={`flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground ${className}`}>
                <MessageSquare className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">{emptyStateMessage}</p>
                <p className="text-sm mt-2 text-center px-6">
                    Type your message below to get started
                </p>
            </div>
        );
    }

    return (
        <div className={`space-y-6 pt-6 pb-4 ${className}`}>
            {shouldShowMessages && messages.map((msg, idx) => {
                // Skip system messages if showSystemMessage is false
                if (msg.role === "system" && !showSystemMessage) {
                    return null;
                }

                return (
                    <div key={idx}>
                        {msg.role === "user" ? (
                            <PromptUserMessage
                                content={msg.content}
                                messageIndex={idx}
                            />
                        ) : msg.role === "system" ? (
                            <PromptSystemMessage
                                content={msg.content}
                                taskId={msg.taskId}
                                messageIndex={idx}
                                isStreamActive={false}
                                metadata={msg.metadata}
                            />
                        ) : (
                            <PromptAssistantMessage
                                content={msg.content}
                                taskId={msg.taskId}
                                messageIndex={idx}
                                isStreamActive={false} // Historical messages are not streaming
                                metadata={msg.metadata}
                            />
                        )}
                    </div>
                );
            })}

            {/* Streaming Message */}
            {isStreaming && currentTaskId && (
                <div>
                    <StreamingAssistantMessage
                        taskId={currentTaskId}
                        messageIndex={messages.length}
                    />
                </div>
            )}

            {/* Invisible div for auto-scrolling */}
            <div ref={messagesEndRef} className="h-4" />
        </div>
    );
}
import React, { useState, RefObject, useMemo } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptUserMessage } from "./PromptUserMessage";
import { PromptAssistantMessage } from "./PromptAssistantMessage";
import { PromptStats } from "./PromptStats";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryResponseTextByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { PromptVariable } from "@/features/prompts/types/variable-components";
import type { Resource } from "./resource-display";
import { PromptInput } from "./PromptInput";

interface PromptBuilderRightPanelProps {
    conversationMessages: Array<{ 
        role: string; 
        content: string;
        taskId?: string; // Store taskId with each message
        metadata?: {
            timeToFirstToken?: number;
            totalTime?: number;
            tokens?: number;
        }
    }>;
    onClearConversation: () => void;
    variableDefaults: PromptVariable[];
    onVariableValueChange: (variableName: string, value: string) => void;
    expandedVariable: string | null;
    onExpandedVariableChange: (variable: string | null) => void;
    chatInput: string;
    onChatInputChange: (value: string) => void;
    onSendMessage: () => void;
    isTestingPrompt: boolean;
    autoClear: boolean;
    onAutoClearChange: (value: boolean) => void;
    submitOnEnter: boolean;
    onSubmitOnEnterChange: (value: boolean) => void;
    messages: Array<{ role: string; content: string }>;
    isStreamingMessage?: boolean;
    currentTaskId?: string | null;
    messageStartTime?: number | null;
    timeToFirstTokenRef?: RefObject<number | undefined>;
    lastMessageStats?: {
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    } | null;
    attachmentCapabilities?: {
        supportsImageUrls: boolean;
        supportsFileUrls: boolean;
        supportsYoutubeVideos: boolean;
    };
    onMessageContentChange?: (messageIndex: number, newContent: string) => void;
}

export function PromptBuilderRightPanel({
    conversationMessages,
    onClearConversation,
    variableDefaults,
    onVariableValueChange,
    expandedVariable,
    onExpandedVariableChange,
    chatInput,
    onChatInputChange,
    onSendMessage,
    isTestingPrompt,
    autoClear,
    onAutoClearChange,
    submitOnEnter,
    onSubmitOnEnterChange,
    messages,
    isStreamingMessage = false,
    currentTaskId = null,
    messageStartTime = null,
    timeToFirstTokenRef,
    lastMessageStats = null,
    attachmentCapabilities = { supportsImageUrls: false, supportsFileUrls: false, supportsYoutubeVideos: false },
    onMessageContentChange,
}: PromptBuilderRightPanelProps) {
    // Local state for resources
    const [resources, setResources] = useState<Resource[]>([]);
    
    // Get streaming text from Redux - this doesn't cause parent re-renders
    const streamingText = useAppSelector((state) => 
        currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ""
    );
       
    // Calculate live stats during streaming (only in this component, not in parent)
    const liveStats = useMemo(() => {
        if (!currentTaskId || !messageStartTime || !streamingText) return null;
        
        // Track time to first token
        if (timeToFirstTokenRef && !timeToFirstTokenRef.current && streamingText.length > 0) {
            timeToFirstTokenRef.current = Math.round(performance.now() - messageStartTime);
        }
        
        const currentTime = Math.round(performance.now() - messageStartTime);
        const tokenCount = Math.round(streamingText.length / 4);
        
        return {
            timeToFirstToken: timeToFirstTokenRef?.current,
            totalTime: currentTime,
            tokens: tokenCount
        };
    }, [streamingText, currentTaskId, messageStartTime, timeToFirstTokenRef]);
    
    // Build the messages to display: conversation messages + streaming message (if active)
    const displayMessages = useMemo(() => {
        if (currentTaskId) {
            // Add the streaming message with its taskId
            return [...conversationMessages, { role: "assistant", content: streamingText, taskId: currentTaskId }];
        }
        return conversationMessages;
    }, [conversationMessages, currentTaskId, streamingText]);
    
    return (
        <div className="h-full w-full flex flex-col bg-textured">
            {/* Conversation Preview */}
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarGutter: "stable" }}>
                {displayMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
                        <MessageSquare className="w-12 h-12 mb-3" />
                        <p className="text-xs">Your conversation will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayMessages.map((msg, idx) => {
                            // Check if this is the last message and it's currently being streamed
                            const isLastMessage = idx === displayMessages.length - 1;
                            const isStreaming = isLastMessage && msg.role === "assistant" && isStreamingMessage;
                            
                            return (
                                <div key={idx}>
                                    {msg.role === "user" ? (
                                        <PromptUserMessage
                                            content={msg.content}
                                            messageIndex={idx}
                                            onContentChange={onMessageContentChange}
                                        />
                                    ) : (
                                        <PromptAssistantMessage
                                            content={msg.content}
                                            taskId={msg.taskId}
                                            messageIndex={idx}
                                            isStreamActive={isStreaming}
                                            onContentChange={onMessageContentChange}
                                            metadata={msg.metadata}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Test Input Area */}
            <div className="pb-2 bg-textured space-y-3">
                {/* Clear conversation button and stats */}
                {displayMessages.length > 0 && (
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearConversation}
                            className="text-gray-400 dark:text-gray-400 hover:text-gray-300"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear conversation
                        </Button>
                        <PromptStats 
                            timeToFirstToken={liveStats?.timeToFirstToken || lastMessageStats?.timeToFirstToken}
                            totalTime={liveStats?.totalTime || lastMessageStats?.totalTime}
                            tokens={liveStats?.tokens || lastMessageStats?.tokens}
                        />
                    </div>
                )}

                {/* Unified Chat Container with Variables and Input */}
                <PromptInput
                    variableDefaults={variableDefaults}
                    onVariableValueChange={onVariableValueChange}
                    expandedVariable={expandedVariable}
                    onExpandedVariableChange={onExpandedVariableChange}
                    chatInput={chatInput}
                    onChatInputChange={onChatInputChange}
                    onSendMessage={onSendMessage}
                    isTestingPrompt={isTestingPrompt}
                    submitOnEnter={submitOnEnter}
                    onSubmitOnEnterChange={onSubmitOnEnterChange}
                    autoClear={autoClear}
                    onAutoClearChange={onAutoClearChange}
                    messages={messages}
                    attachmentCapabilities={attachmentCapabilities}
                    resources={resources}
                    onResourcesChange={setResources}
                    enablePasteImages={true}
                    showAutoClear={true}
                    showAttachments={true}
                    sendButtonVariant="gray"
                />
            </div>
        </div>
    );
}

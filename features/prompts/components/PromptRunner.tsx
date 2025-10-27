"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { createAndSubmitTask } from "@/lib/redux/socket-io/thunks/submitTaskThunk";
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { PromptMessage } from "@/components/prompt-builder/hooks/usePrompts";
import { PromptRunnerInput } from "./PromptRunnerInput";
import { PromptUserMessage } from "./PromptUserMessage";
import { PromptAssistantMessage } from "./PromptAssistantMessage";
import { PromptStats } from "./PromptStats";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare } from "lucide-react";

// Variable definition structure
export interface PromptVariable {
    name: string;
    defaultValue: string;
}

interface PromptRunnerProps {
    models: any[];
    promptData: {
        id: string;
        name: string;
        messages: PromptMessage[];
        variableDefaults: PromptVariable[];
        settings: Record<string, any>;
    };
}

export function PromptRunner({ models, promptData }: PromptRunnerProps) {
    const dispatch = useAppDispatch();
    
    // Extract data from promptData
    const { messages: templateMessages, variableDefaults: initialVariableDefaults, settings } = promptData;
    
    // Get model ID and config from settings
    const modelId = settings.model_id;
    const { model_id, ...modelConfig } = settings;
    
    // Extract system message and user/assistant messages
    const systemMessage = templateMessages.find(m => m.role === "system")?.content || "";
    const conversationTemplate = templateMessages.filter(m => m.role !== "system");
    
    // State for variables
    const [variableDefaults, setVariableDefaults] = useState<PromptVariable[]>(
        initialVariableDefaults || []
    );
    const [expandedVariable, setExpandedVariable] = useState<string | null>(null);
    
    // Conversation state
    const [chatInput, setChatInput] = useState("");
    const [conversationMessages, setConversationMessages] = useState<Array<{ 
        role: string; 
        content: string;
        taskId?: string;
        metadata?: {
            timeToFirstToken?: number;
            totalTime?: number;
            tokens?: number;
        }
    }>>([]);
    const [apiConversationHistory, setApiConversationHistory] = useState<PromptMessage[]>([]);
    const [isTestingPrompt, setIsTestingPrompt] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [messageStartTime, setMessageStartTime] = useState<number | null>(null);
    const timeToFirstTokenRef = useRef<number | undefined>(undefined);
    const [lastMessageStats, setLastMessageStats] = useState<{
        timeToFirstToken?: number;
        totalTime?: number;
        tokens?: number;
    } | null>(null);
    
    // Track if conversation has started (for showing/hiding variables)
    const [conversationStarted, setConversationStarted] = useState(false);
    
    // Get streaming response from socket
    const streamingText = useAppSelector((state) => 
        currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ""
    );
    const isResponseEnded = useAppSelector((state) =>
        currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
    );
    
    // Helper function to replace variables in content
    const replaceVariables = (content: string): string => {
        let result = content;
        variableDefaults.forEach(({ name, defaultValue }) => {
            const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
            result = result.replace(regex, defaultValue);
        });
        return result;
    };
    
    // Calculate live stats during streaming
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
    }, [streamingText, currentTaskId, messageStartTime]);
    
    // Build the messages to display: conversation messages + streaming message (if active)
    const displayMessages = useMemo(() => {
        if (currentTaskId && streamingText) {
            return [...conversationMessages, { role: "assistant", content: streamingText, taskId: currentTaskId }];
        }
        return conversationMessages;
    }, [conversationMessages, currentTaskId, streamingText]);
    
    // Handle response completion
    useEffect(() => {
        if (currentTaskId && isResponseEnded && isTestingPrompt && messageStartTime) {
            // Calculate final stats
            const totalTime = Math.round(performance.now() - messageStartTime);
            const tokenCount = Math.round(streamingText.length / 4);
            
            const finalStats = {
                timeToFirstToken: timeToFirstTokenRef.current,
                totalTime: totalTime,
                tokens: tokenCount
            };
            
            setLastMessageStats(finalStats);
            
            // Add the completed assistant message
            setConversationMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: streamingText,
                    taskId: currentTaskId,
                    metadata: finalStats
                }
            ]);

            // Add to API conversation history
            setApiConversationHistory((prev) => [
                ...prev,
                { role: "assistant", content: streamingText }
            ]);

            // Reset state
            setCurrentTaskId(null);
            setIsTestingPrompt(false);
            setMessageStartTime(null);
            timeToFirstTokenRef.current = undefined;
        }
    }, [isResponseEnded, currentTaskId, isTestingPrompt, messageStartTime, streamingText]);
    
    // Handler to send message
    const handleSendTestMessage = async () => {
        if (isTestingPrompt) return;

        const isFirstMessage = apiConversationHistory.length === 0;

        let userMessageContent: string;
        let displayUserMessage: string;

        if (isFirstMessage) {
            // Mark conversation as started
            setConversationStarted(true);
            
            // First message: Use the template prompt
            const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
            const isLastMessageUser = lastPromptMessage?.role === "user";

            // If last message is not a user message, we need chat input
            if (!isLastMessageUser && !chatInput.trim()) return;

            if (isLastMessageUser) {
                // Combine the last user message with chatInput (if any)
                const lastMessageContent = lastPromptMessage.content;
                const additionalInput = chatInput.trim();
                
                userMessageContent = additionalInput 
                    ? `${lastMessageContent}\n${additionalInput}`
                    : lastMessageContent;
            } else {
                // Normal behavior: add chatInput as a new user message
                userMessageContent = chatInput;
            }

            displayUserMessage = userMessageContent;
        } else {
            // Subsequent messages: Just use the chat input
            if (!chatInput.trim()) return;
            
            userMessageContent = chatInput;
            displayUserMessage = chatInput;
        }

        // Clear input
        setChatInput("");

        // Replace variables in the display message before showing it
        const displayMessageWithReplacedVariables = replaceVariables(displayUserMessage);

        // Add user message to conversation display
        setConversationMessages((prev) => [...prev, { role: "user", content: displayMessageWithReplacedVariables }]);

        setIsTestingPrompt(true);
        setLastMessageStats(null);
        setMessageStartTime(performance.now());
        timeToFirstTokenRef.current = undefined;

        try {
            let messagesToSend: PromptMessage[];

            if (isFirstMessage) {
                // First message: Use template messages, replacing the last user message if needed
                const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
                const isLastMessageUser = lastPromptMessage?.role === "user";

                if (isLastMessageUser) {
                    // Replace the last template message with our combined content
                    const messagesWithoutLast = conversationTemplate.slice(0, -1);
                    messagesToSend = [...messagesWithoutLast, { role: "user", content: userMessageContent }];
                } else {
                    // Append the new user message
                    messagesToSend = [...conversationTemplate, { role: "user", content: userMessageContent }];
                }
            } else {
                // Subsequent messages: Use conversation history + new user message
                messagesToSend = [...apiConversationHistory, { role: "user", content: userMessageContent }];
            }

            // Add system message and replace variables
            const allMessages = [{ role: "system", content: systemMessage }, ...messagesToSend];
            const messagesWithVariablesReplaced = allMessages.map(msg => ({
                ...msg,
                content: replaceVariables(msg.content)
            }));

            // Add the new user message to the API conversation history
            setApiConversationHistory((prev) => [...prev, { role: "user", content: userMessageContent }]);

            // Build chat_config for direct_chat task
            const chatConfig: Record<string, any> = {
                model_id: modelId,
                messages: messagesWithVariablesReplaced,
                stream: true,
                ...modelConfig,
            };

            // Submit the task using socket
            const result = await dispatch(createAndSubmitTask({
                service: "chat_service",
                taskName: "direct_chat",
                taskData: {
                    chat_config: chatConfig
                }
            })).unwrap();

            // Store the taskId for streaming
            setCurrentTaskId(result.taskId);
            
        } catch (error) {
            console.error("Error testing prompt:", error);
            setConversationMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to get response from AI" }]);
            // Reset state on error
            setIsTestingPrompt(false);
            setCurrentTaskId(null);
            setMessageStartTime(null);
            timeToFirstTokenRef.current = undefined;
        }
    };
    
    const handleVariableValueChange = (variableName: string, value: string) => {
        setVariableDefaults((prev) => 
            prev.map(v => v.name === variableName ? { ...v, defaultValue: value } : v)
        );
    };
    
    const handleClearConversation = () => {
        setConversationMessages([]);
        setApiConversationHistory([]);
        setLastMessageStats(null);
        setConversationStarted(false);
    };
    
    return (
        <div className="h-full w-full flex flex-col bg-textured">
            {/* Header with prompt name */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {promptData.name || "Untitled Prompt"}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Run this prompt with your own inputs
                </p>
            </div>
            
            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarGutter: "stable" }}>
                <div className="max-w-4xl mx-auto">
                    {displayMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400 dark:text-gray-600">
                            <MessageSquare className="w-16 h-16 mb-4" />
                            <p className="text-lg font-medium">Ready to run your prompt</p>
                            <p className="text-sm mt-2">
                                {variableDefaults.length > 0 
                                    ? "Fill in the variables below and send your message"
                                    : "Type your message below to get started"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {displayMessages.map((msg, idx) => {
                                const isLastMessage = idx === displayMessages.length - 1;
                                const isStreaming = isLastMessage && msg.role === "assistant" && isTestingPrompt;
                                
                                return (
                                    <div key={idx}>
                                        {msg.role === "user" ? (
                                            <PromptUserMessage
                                                content={msg.content}
                                                messageIndex={idx}
                                            />
                                        ) : (
                                            <PromptAssistantMessage
                                                content={msg.content}
                                                taskId={msg.taskId}
                                                messageIndex={idx}
                                                isStreamActive={isStreaming}
                                                metadata={msg.metadata}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Stats and Clear Button */}
            {displayMessages.length > 0 && (
                <div className="flex-shrink-0 px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900">
                    <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearConversation}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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
                </div>
            )}
            
            {/* Input Area */}
            <div className="flex-shrink-0 px-6 py-6 bg-textured">
                <PromptRunnerInput
                    variableDefaults={variableDefaults}
                    onVariableValueChange={handleVariableValueChange}
                    expandedVariable={expandedVariable}
                    onExpandedVariableChange={setExpandedVariable}
                    chatInput={chatInput}
                    onChatInputChange={setChatInput}
                    onSendMessage={handleSendTestMessage}
                    isTestingPrompt={isTestingPrompt}
                    showVariables={!conversationStarted}
                    messages={conversationTemplate}
                />
            </div>
        </div>
    );
}


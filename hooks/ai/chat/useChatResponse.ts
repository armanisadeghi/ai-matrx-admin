import { useState, useCallback } from "react";
import { Message } from "@/features/chat/types";
import { v4 as uuidv4 } from 'uuid';


interface UseChatResponseProps {
    initialMessages?: Message[];
    conversationId?: string;
}

export function useChatResponse({ initialMessages = [], conversationId = "new" }: UseChatResponseProps = {}) {
    // Chat state
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isReceiving, setIsReceiving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isChatStarted, setIsChatStarted] = useState<boolean>(initialMessages.length > 0);

    // Add a user message to the chat
    const addUserMessage = useCallback((text: string) => {
        const newMessage: Message = {
            id: uuidv4(),
            text, // Preserve all whitespace
            role: "user",
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newMessage]);
        setIsChatStarted(true);
        return newMessage;
    }, []);

    // Add an AI response to the chat
    const addAIResponse = useCallback((text: string, metadata?: any) => {
        const newMessage: Message = {
            id: uuidv4(),
            text,
            role: "assistant",
            timestamp: new Date().toISOString(),
            metadata,
        };

        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
    }, []);

    // Update an existing message (for streaming responses)
    const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
        setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...updates } : message)));
    }, []);

    // Handle streaming response chunks
    const handleStreamingResponse = useCallback((id: string, chunk: string) => {
        setMessages((prev) => {
            const messageIndex = prev.findIndex((msg) => msg.id === id);

            if (messageIndex === -1) {
                // Message not found, create a new one
                return [
                    ...prev,
                    {
                        id,
                        text: chunk,
                        role: "assistant",
                        timestamp: new Date().toISOString(),
                        isStreaming: true,
                    },
                ];
            } else {
                // Update existing message
                const updatedMessages = [...prev];
                updatedMessages[messageIndex] = {
                    ...updatedMessages[messageIndex],
                    text: updatedMessages[messageIndex].text + chunk,
                    isStreaming: true,
                };
                return updatedMessages;
            }
        });
    }, []);

    // Mark streaming as complete
    const finishStreaming = useCallback(
        (id: string) => {
            updateMessage(id, { isStreaming: false });
            setIsReceiving(false);
        },
        [updateMessage]
    );

    // Clear all messages
    const clearMessages = useCallback(() => {
        setMessages([]);
        setIsChatStarted(false);
        setError(null);
    }, []);

    // Handle the complete submission flow
    const handleSubmission = useCallback(
        async (userInput: string, submitRequest: (message: string) => Promise<any>) => {
            // Don't proceed if already receiving or empty message
            if (isReceiving || !userInput.trim()) return;

            try {
                // Add user message
                const userMessage = addUserMessage(userInput);

                // Start receiving indicator
                setIsReceiving(true);
                setError(null);

                // Create AI message placeholder
                const responseId = uuidv4();
                addAIResponse("", { isStreaming: true });

                // Submit request
                const response = await submitRequest(userInput);

                // TODO: In the future, this would process streaming response via socket.io
                // For now, just handle a simple response
                updateMessage(responseId, {
                    text: response?.text || "I received your message and am processing it.",
                    isStreaming: false,
                });

                setIsReceiving(false);
            } catch (error) {
                console.error("Error handling submission:", error);
                setError(error instanceof Error ? error.message : "An error occurred");
                setIsReceiving(false);
            }
        },
        [isReceiving, addUserMessage, addAIResponse, updateMessage]
    );

    return {
        // State
        messages,
        isReceiving,
        error,
        isChatStarted,

        // Actions
        addUserMessage,
        addAIResponse,
        updateMessage,
        handleStreamingResponse,
        finishStreaming,
        clearMessages,
        handleSubmission,
    };
}

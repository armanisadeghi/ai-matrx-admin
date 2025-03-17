import { useState, useRef, useEffect } from "react";
import { ChatTaskManager } from "@/lib/redux/socket/task-managers/ChatTaskManager";
import { Message, ChatMode } from "@/types/chat/chat.types";

interface UseChatSocketProps {
    conversationId: string;
    onResponse?: (response: string) => void;
    onError?: (error: string) => void;
}

export function useChatSocket({ conversationId, onResponse, onError }: UseChatSocketProps) {
    const [streamingResponse, setStreamingResponse] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);

    // Create taskManager just once
    const taskManager = useRef(new ChatTaskManager()).current;

    // Store cleanup function reference
    const cleanupRef = useRef<(() => void) | null>(null);

    // Ensure cleanup on unmount
    useEffect(() => {
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
            }
        };
    }, []);

    const submitSocketMessage = async (message: Message, modelOverride?: string, modeOverride?: ChatMode) => {
        if (message.content.trim().length === 0) {
            return;
        }

        // Clean up any previous stream
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }

        setIsLoading(true);
        setStreamingResponse("");
        setError(null);
        setIsStreaming(true);

        try {
            // Use the streamMessage method from our manager
            const [cleanup, getCurrentResponse] = taskManager.streamMessage(conversationId, message, {
                overrides: {
                    modelOverride,
                    modeOverride,
                },
                onUpdate: (_, fullText) => {
                    setStreamingResponse(fullText);
                    onResponse?.(fullText);
                },
                onError: (errorMsg) => {
                    setError(errorMsg);
                    onError?.(errorMsg);
                    setIsStreaming(false);
                },
                onComplete: () => {
                    setIsStreaming(false);
                },
            });

            // Store the cleanup function
            cleanupRef.current = cleanup;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
            onError?.(errorMessage);
            setIsStreaming(false);
        } finally {
            setIsLoading(false);
        }

        // Return a cleanup function
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
                setIsStreaming(false);
            }
        };
    };

    return {
        submitSocketMessage,
        streamingResponse,
        error,
        isLoading,
        isStreaming,

        // Add a method to cancel the current stream
        cancelStream: () => {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
                setIsStreaming(false);
            }
        },
    };
}

export type UseChatSocketResult = ReturnType<typeof useChatSocket>;

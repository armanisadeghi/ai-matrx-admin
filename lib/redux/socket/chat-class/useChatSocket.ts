import { useState, useRef, useEffect } from "react";
import { ChatTaskManager } from "./ChatTaskManager";
import { Message, ChatMode } from "@/types/chat/chat.types";

interface UseChatSocketProps {
    conversationId: string;
    onResponse?: (response: string) => void;
    onError?: (error: string) => void;
}

export function useChatSocket({ 
    conversationId, 
    onResponse,
    onError
}: UseChatSocketProps) {
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
                setIsStreaming(false);
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
            setIsStreaming(false);
        }
        
        setIsLoading(true);
        setStreamingResponse("");
        setError(null);
        setIsStreaming(true);
        
        try {
            // Use the enhanced async streamMessage method
            const [cleanup, getCurrentResponse] = await taskManager.streamMessage(
                conversationId,
                message,
                {
                    modelOverride,
                    modeOverride,
                    onUpdate: (_, fullText) => {
                        setStreamingResponse(fullText);
                        onResponse?.(fullText);
                    },
                    onError: (errorMsg) => {
                        setError(errorMsg);
                        onError?.(errorMsg);
                        setIsStreaming(false);
                        setIsLoading(false);
                    },
                    onComplete: (fullText) => {
                        setStreamingResponse(fullText);
                        setIsStreaming(false);
                        setIsLoading(false);
                    }
                }
            );
            
            // Store the cleanup function
            cleanupRef.current = cleanup;
            
            // Return cleanup function
            return () => {
                if (cleanupRef.current) {
                    cleanupRef.current();
                    cleanupRef.current = null;
                    setIsStreaming(false);
                }
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
            onError?.(errorMessage);
            setIsStreaming(false);
            setIsLoading(false);
            throw err; // Re-throw to allow caller to handle if needed
        }
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
        }
    };
}

export type UseChatSocketResult = ReturnType<typeof useChatSocket>;
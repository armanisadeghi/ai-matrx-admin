import { useState } from "react";
import { ChatTaskManager } from "./ChatTaskManager";
import { AiChatTaskData } from "./ChatTaskData";
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
    
    // Create taskManager just once, similar to your working example
    const taskManager = new ChatTaskManager();
    
    const submitSocketMessage = async (message: Message) => {
        if (message.content.trim().length === 0) {
            return;
        }
        
        console.log("[ChatSocket] value:", message.content);
        
        // Declare unsubscribe at this level, similar to your working example
        let unsubscribe: (() => void);
        
        setIsLoading(true);
        setStreamingResponse("");
        setError(null);
        
        try {
            const taskData = new AiChatTaskData(conversationId, 0)
                .setMessage(message)
                
            const eventName = await taskManager.sendUserMessage(taskData);
            setIsStreaming(true);
            
            unsubscribe = taskManager.getSocketManager().subscribeToEvent(eventName, (response: any) => {
                console.log(`[ChatSocket] Response for ${eventName}:`, response);
                
                if (response?.data) {
                    setStreamingResponse((prev) => {
                        const updated = prev + response.data;
                        onResponse?.(updated);
                        return updated;
                    });
                } else if (typeof response === "string") {
                    setStreamingResponse((prev) => {
                        const updated = prev + response;
                        onResponse?.(updated);
                        return updated;
                    });
                }
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
            onError?.(errorMessage);
            console.error("[ChatSocket] Task failed:", err);
            setIsStreaming(false);
        } finally {
            setIsLoading(false);
        }
        
        // Return a cleanup function that matches your working implementation's pattern
        return () => {
            if (unsubscribe) {
                unsubscribe();
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
    };
}

export type UseChatSocketResult = ReturnType<typeof useChatSocket>;
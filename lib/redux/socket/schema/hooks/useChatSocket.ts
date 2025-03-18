// hooks/useChatSocket.ts
import { useRef, useCallback } from "react";
import { SchemaTaskBuilder, SchemaTaskManager } from "@/lib/redux/socket/schema/SchemaTaskManager";
import { Message, ChatMode } from "@/types/chat/chat.types";
import { useTaskSocket } from "./useTaskSocket";

interface UseChatSocketProps {
    conversationId: string;
    onResponse?: (response: string) => void;
    onError?: (error: string) => void;
}

interface ChatOptions {
    modelOverride?: string;
    modeOverride?: ChatMode;
}

export function useChatSocket({ conversationId, onResponse, onError }: UseChatSocketProps) {
    const taskManager = useRef(new SchemaTaskManager("chat_service", "ai_chat")).current;
    
    const configureTask = useCallback((builder: SchemaTaskBuilder, message: Message, options?: ChatOptions) => {
        builder
            .setArg("conversation_id", conversationId)
            .setArg("message_object", {
                id: message.id,
                conversation_id: message.conversationId || conversationId,
                content: message.content,
                role: message.role,
                type: message.type,
                metadata: message.metadata,
                files: message.metadata?.files,
            });
        
        if (options) {
            if (options.modelOverride) {
                builder.setArg("overrides", { ...(builder.getTaskData().getData().overrides || {}), model_override: options.modelOverride });
            }
            
            if (options.modeOverride) {
                builder.setArg("overrides", { ...(builder.getTaskData().getData().overrides || {}), mode_override: options.modeOverride });
            }
        }
    }, [conversationId]);

    const taskSocket = useTaskSocket<Message, ChatOptions>({
        onResponse,
        onError,
        taskManager,
        configureTask
    });

    const submitSocketMessage = useCallback(
        (message: Message, modelOverride?: string, modeOverride?: ChatMode) => {
            if (message.content.trim().length === 0) {
                return;
            }

            const options: ChatOptions = {};
            if (modelOverride) options.modelOverride = modelOverride;
            if (modeOverride) options.modeOverride = modeOverride;

            return taskSocket.submitTask(message, options);
        },
        [taskSocket]
    );

    return {
        submitSocketMessage,
        streamingResponse: taskSocket.streamingResponse,
        error: taskSocket.error,
        isLoading: taskSocket.isLoading,
        isStreaming: taskSocket.isStreaming,
        cancelStream: taskSocket.cancelStream,
    };
}
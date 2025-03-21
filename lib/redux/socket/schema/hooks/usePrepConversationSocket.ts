// hooks/usePrepConversationSocket.ts
import { useCallback, useRef, useEffect } from "react";
import { SchemaTaskManager } from "@/lib/redux/socket/schema/SchemaTaskManager";
import { useTaskSocket } from "./useTaskSocket";
import { useSystemResponseHandler, SystemResponse } from "./useSystemResponseHandler";

interface PrepConversationPayload {
    conversationId: string;
}

interface UsePrepConversationSocketProps {
    onResponse?: (response: string) => void;
    onError?: (error: string) => void;
}

export function usePrepConversationSocket({ onResponse, onError }: UsePrepConversationSocketProps) {
    const taskManager = useRef(new SchemaTaskManager("chat_service", "prep_conversation")).current;
    const lastConversationId = useRef<string | null>(null);

    // Define handlers for different response types
    const { handleResponse, retryCount, resetRetryCount, triggerRetry } = useSystemResponseHandler({
        onConfirm: (response) => {
            console.log("Received 'confirm' status:", response);
        },
        onCompleted: (response) => {
            console.error("Server settings are incorrect - received 'completed' status instead of 'confirm':", response);
            // Treat as confirm
        },
        onUpdate: (response) => {
            console.error("Received 'update' status but not configured to handle updates:", response);
        },
        onRetry: (response) => {
            console.error("Received 'retry' status:", response);
        },
        onInvalid: (responseText) => {
            console.error("Did not receive a valid response from prep_conversation");
        },
        maxRetries: 3,
        retryDelay: 3000,
    });

    const configureTask = useCallback((builder, payload: PrepConversationPayload) => {
        builder.setArg("conversation_id", payload.conversationId);
    }, []);

    // Pass our custom response handler to wrap the original onResponse
    const handleWrappedResponse = useCallback(
        (responseText: string) => {
            handleResponse(responseText);
            onResponse?.(responseText);
        },
        [handleResponse, onResponse]
    );

    const taskSocket = useTaskSocket<PrepConversationPayload>({
        onResponse: handleWrappedResponse,
        onError,
        taskManager,
        configureTask,
    });

    const prepareConversation = useCallback(
        (conversationId: string) => {
            if (!conversationId) {
                console.error("Cannot prepare conversation without a conversation ID");
                return;
            }

            return taskSocket.submitTask({ conversationId });
        },
        [taskSocket]
    );

    // Effect to trigger retry when retryCount changes
    useEffect(() => {
        if (retryCount > 0 && lastConversationId.current) {
            prepareConversation(lastConversationId.current);
        }
    }, [retryCount, prepareConversation]);

    // Wrap prepareConversation to store the conversationId and reset retry count
    const prepConversation = useCallback(
        (conversationId: string) => {
            lastConversationId.current = conversationId;
            resetRetryCount();
            return prepareConversation(conversationId);
        },
        [prepareConversation, resetRetryCount]
    );

    return {
        prepConversation,
        streamingResponse: taskSocket.streamingResponse,
        error: taskSocket.error,
        isLoading: taskSocket.isLoading,
        isStreaming: taskSocket.isStreaming,
        cancelStream: taskSocket.cancelStream,
    };
}

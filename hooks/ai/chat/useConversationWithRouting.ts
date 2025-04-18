'use client';

import { useCallback, useEffect, useState } from "react";
import { Conversation, MatrxRecordId } from "@/types";
import { ChatMode, Message } from "@/types/chat/chat.types";
// import useConversationMessages from "@/hooks/ai/chat/useConversationMessages";
import useConversationRouting from "./useConversationRouting";
import { useFileManagement } from "@/hooks/ai/chat/useFileManagement";
import { ChatTaskManager } from "@/lib/redux/socket/task-managers/ChatTaskManager";

export interface ChatSubmitResult {
    success: boolean;
    conversationId?: string;
    message?: Message;
    error?: Error;
    id?: string;
    recordKey?: string;
    tempRecordId?: string;
    conversation?: Conversation;
}

interface UseConversationWithRoutingProps {
    initialConversationId?: string;
    initialModelId?: string;
    initialMode?: ChatMode;
}

export function useConversationWithRouting({ initialConversationId, initialModelId, initialMode }: UseConversationWithRoutingProps = {}) {
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const [isConversationReady, setIsConversationReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);


    const chatManager = new ChatTaskManager();

    const { currentModelId, currentMode, setCurrentModelId, setCurrentMode, navigateToConversation } = useConversationRouting({
        initialModelId,
        initialMode,
    });

    const conversationMessagesHook = useConversationMessages();
    const {
        conversationCrud,
        messageCrud,
        createNewConversation,
        setActiveConversation,
        isCreatingNewConversation,
        newMessage,
        saveMessage,
    } = conversationMessagesHook;

    useEffect(() => {
        if (currentConversationId) return;
        if (initialConversationId == "new-conversation") {
            const { conversationId, messageId } = createNewConversation({
                currentModel: currentModelId,
                currentMode: currentMode,
            });

            setCurrentConversationId(conversationId);
            setCurrentMessageId(messageId);
            setIsConversationReady(true);
        } else {
            setActiveConversation(initialConversationId);
            setCurrentConversationId(initialConversationId);
            setIsConversationReady(true);
        }
    }, [initialConversationId, currentModelId, currentMode, currentConversationId, createNewConversation, setActiveConversation]);

    const updateModelId = useCallback(
        (modelId: string) => {
            if (conversationMessagesHook.currentConversation) {
                conversationCrud.updateCurrentModel(modelId);
            }

            setCurrentModelId(modelId);
        },
        [conversationMessagesHook.currentConversation, conversationCrud, currentMode]
    );

    const updateModelWithKey = useCallback(
        (key: MatrxRecordId) => {
            const modelId = key.replace("id:", "");
            updateModelId(modelId);
        },
        [updateModelId]
    );

    const updateMode = useCallback(
        (mode: ChatMode) => {
            if (conversationMessagesHook.currentConversation) {
                conversationCrud.updateCurrentMode(mode);
            }

            setCurrentMode(mode);
        },
        [conversationMessagesHook.currentConversation, conversationCrud]
    );

    const updateEndpointId = useCallback(
        (endpointId: string) => {
            if (conversationMessagesHook.currentConversation) {
                conversationCrud.updateCurrentEndpoint(endpointId);
            }
        },
        [conversationMessagesHook.currentConversation, conversationCrud]
    );

    const fileManager = useFileManagement({
        onFilesUpdate: messageCrud.updateFiles,
    });

    const updateChatMetadata = useCallback(
        (metadata: any) => {
            if (conversationMessagesHook.currentConversation) {
                conversationCrud.updateMetadata(metadata);
            }
            if (conversationMessagesHook.newMessage) {
                messageCrud.updateMetadata(metadata);
            }
        },
        [conversationMessagesHook.currentConversation, conversationMessagesHook.newMessage, conversationCrud]
    );

    const saveNewConversationAndNavigate = useCallback(async () => {
        const result = await conversationMessagesHook.saveNewConversation();

        if (result.success && result.conversationId) {
            setCurrentConversationId(result.conversationId);
            setCurrentMessageId(result.messageId);

            navigateToConversation(result.conversationId);
        }

        return result;
    }, [conversationMessagesHook, navigateToConversation]);

    const submitChatMessage = useCallback(async () => {
        try {
            setIsSubmitting(true);
            let result: ChatSubmitResult;

            if (isCreatingNewConversation) {
                result = await saveNewConversationAndNavigate();
            } else {
                result = await saveMessage();
            }

            if (result.success) {
                if (isCreatingNewConversation) {
                    await new Promise((resolve) => setTimeout(resolve, 200));
                }
                const eventName = chatManager.streamMessage(currentConversationId, newMessage);
                console.log(" - eventName", eventName);
                return true;
            } else {
                console.error("Failed to send message:", result.error);
                return false;
            }
        } catch (error) {
            console.error("Error sending message:", error);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [isCreatingNewConversation, saveNewConversationAndNavigate, saveMessage, newMessage]);

    return {
        ...conversationMessagesHook,

        // Enhanced conversation creation
        saveNewConversationAndNavigate,
        isConversationReady,
        currentConversationId,
        currentMessageId,

        // Routing functionality
        navigateToConversation,
        currentModelId,
        currentMode,

        updateModelId,
        updateModelWithKey,
        updateMode,
        updateEndpointId,
        updateChatMetadata,

        fileManager,

        submitChatMessage,
        isSubmitting,
    };
}

export type ConversationWithRoutingResult = ReturnType<typeof useConversationWithRouting>;
export default useConversationWithRouting;

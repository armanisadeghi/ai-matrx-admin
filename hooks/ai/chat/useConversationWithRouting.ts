import { useCallback, useEffect, useState } from "react";
import { MatrxRecordId } from "@/types";
import { ChatMode } from "@/types/chat/chat.types";
import useConversationMessages from "@/hooks/ai/chat/useConversationMessages";
import useConversationRouting from "./useConversationRouting";

interface UseConversationWithRoutingProps {
    initialConversationId?: string;
    initialModelId?: string;
    initialMode?: ChatMode;
}

export function useConversationWithRouting({ initialConversationId, initialModelId, initialMode }: UseConversationWithRoutingProps = {}) {
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const [isConversationReady, setIsConversationReady] = useState(false);

    const { currentModelId, currentMode, setCurrentModelId, setCurrentMode, navigateToConversation } = useConversationRouting({
        initialModelId,
        initialMode,
    });

    const conversationMessagesHook = useConversationMessages();
    const { conversationCrud, createNewConversation, setActiveConversation } = conversationMessagesHook;

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

    // Enhanced save function that navigates after saving
    const saveNewConversationAndNavigate = useCallback(async () => {
        const result = await conversationMessagesHook.saveNewConversation();

        if (result.success && result.conversationId) {
            setCurrentConversationId(result.conversationId);
            setCurrentMessageId(result.messageId);

            navigateToConversation(result.conversationId);
        }

        return result;
    }, [conversationMessagesHook, navigateToConversation]);

    // useEffect(() => {
    //   console.log("--- DEBUG Use Conversation With Routing ---")
    //   console.log("isConversationReady", isConversationReady)
    //   console.log("currentConversationId", currentConversationId)
    //   console.log("currentMessageId", currentMessageId)
    //   console.log("--- END DEBUG Use Conversation With Routing ---")
    // }, [isConversationReady, currentConversationId, currentMessageId])

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
    };
}

export type ConversationWithRoutingResult = ReturnType<typeof useConversationWithRouting>;
export default useConversationWithRouting;

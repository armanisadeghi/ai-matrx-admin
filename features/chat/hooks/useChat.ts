// hooks/ai/chat/new/useChat.ts

"use client";

import { useCallback, useState } from "react";
import { ChatMode } from "@/types/chat/chat.types";
import { useFileManagement } from "@/hooks/ai/chat/useFileManagement";
import { ChatTaskManager } from "@/lib/redux/socket/task-managers/ChatTaskManager";
import { useRouter } from "next/navigation";
import { DEFAULT_MODEL_ID, DEFAULT_MODE, DEFAULT_FAST_MODEL_ID, DEFAULT_GPT_MODEL_ID } from "@/constants/chat";
import { CombinedSaveChatResult, useChatRelationship } from "./useChatHooks";
import useChatBasics from "@/hooks/ai/chat/useChatBasics";

const DEBUG = false;
const VERBOSE = false;


export function useChat(baseRoute: string = "/chat", convoId: string, newChat: boolean = false) {
    const [modelId, setModelId] = useState<string>(DEFAULT_GPT_MODEL_ID);
    const [mode, setMode] = useState<ChatMode>(DEFAULT_MODE);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const {
        models,
        fetchAllModels,
        conversationSelectors,
        messageSelectors,
        actions,
        activeConversationRecord,
        activeMessageRecord,
        conversationRecordKey,
        conversationId,
        messageRecordKey,
        messageId,
        messageMetadata,
        conversationMetadata,
    } = useChatBasics();

    const chatManager = new ChatTaskManager();
    const router = useRouter();

    const chatRelationshipHook = useChatRelationship(convoId);


    const {
        isChatLoading,
        activeConversation,
        saveNewConversation,
        chatMessages,
        createNewMessage,
        isNewChat,
        saveMessage,
        newMessageId,
        conversationCrud,
        newMessage,
        messageCrud,
    } = chatRelationshipHook;


    const updateModel = useCallback(
        (key: string) => {
            const modelId = key.startsWith("id:") ? key.slice(3) : key;

            if (isNewChat) {
                conversationCrud.updateCurrentModel(modelId);
            } else {
                messageCrud.updateCurrentModel(modelId);
            }

            setModelId(modelId);
        },
        [activeConversation, conversationCrud]
    );

    const updateMode = useCallback(
        (mode: ChatMode) => {
            if (isNewChat) {
                conversationCrud.updateCurrentMode(mode);
            } else {
                messageCrud.updateCurrentMode(mode);
            }

            setMode(mode);
        },
        [activeConversation, conversationCrud]
    );

    const updateEndpoint = useCallback(
        (endpointId: string) => {
            if (isNewChat) {
                conversationCrud.updateCurrentEndpoint(endpointId);
            } else {
                messageCrud.updateCurrentEndpoint(endpointId);
            }
        },
        [activeConversation, conversationCrud]
    );

    const fileManager = useFileManagement({
        onFilesUpdate: messageCrud.updateFiles,
    });

    const updateChatMetadata = useCallback(
        (metadata: any) => {
            if (isNewChat) {
                conversationCrud.updateMetadata(metadata);
            } else {
                console.warn("⛔ updateChatMetadata is not supported for new messages");
            }
        },
        [activeConversation, newMessageId, conversationCrud]
    );

    const submitChatMessage = useCallback(async () => {
        try {
            setIsSubmitting(true);
            let result: CombinedSaveChatResult;

            if (isNewChat) {
                result = await saveNewConversation();
            } else {
                result = await saveMessage();
            }

            if (result.success) {
                await new Promise((resolve) => setTimeout(resolve, 200));
                const eventName = await chatManager.streamMessage(conversationId, result.message);
                actions.setSocketEventName({ eventName: eventName });
                router.push(`${baseRoute}/${result.conversationId}`);

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
    }, [isNewChat, saveMessage, newMessageId]);

    const isConversationReady = !isChatLoading && activeConversation;

    return {
        newChat,
        isChatLoading,
        currentConversation: activeConversation,
        conversationId,
        isConversationReady,
        newMessage,
        isNewChat,

        modelId,
        mode,

        updateModel,
        updateMode,
        updateEndpoint,
        updateChatMetadata,

        fileManager,

        submitChatMessage,
        isSubmitting,

        messageCrud,
        conversationCrud,
    };
}

export type NewChatResult = ReturnType<typeof useChat>;
export default useChat;

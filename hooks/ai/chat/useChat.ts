// hooks/ai/chat/new/useChat.ts

"use client";

import { useCallback, useEffect, useState } from "react";
import { Conversation } from "@/types";
import { ChatMode, Message } from "@/types/chat/chat.types";
// import useConversationMessages from "@/hooks/ai/chat/useConversationMessages";
import { useFileManagement } from "@/hooks/ai/chat/useFileManagement";
import { ChatTaskManager } from "@/lib/redux/socket/task-managers/ChatTaskManager";
import { useRouter } from "next/navigation";
import { usePrepConversationSocket } from "@/lib/redux/socket/schema/hooks/usePrepConversationSocket";
import { DEFAULT_MODEL_ID, DEFAULT_MODE } from "@/constants/chat";

const DEBUG = false;
const VERBOSE = false;

export interface ChatSubmitResult {
    success: boolean;
    convoId?: string;
    message?: Message;
    error?: Error;
    id?: string;
    recordKey?: string;
    tempRecordId?: string;
    conversation?: Conversation;
}

export function useChat(convoId: string, newChat: boolean = false) {
    const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
    const [mode, setMode] = useState<ChatMode>(DEFAULT_MODE);
    const [messageId, setMessageId] = useState<string | null>(null);
    const [isConversationReady, setIsConversationReady] = useState(false);
    const [isMessageReady, setIsMessageReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [socketTaskStarted, setSocketTaskStarted] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [eventName, setEventName] = useState<string | null>(null);

    const chatManager = new ChatTaskManager();
    const router = useRouter();

    const conversationMessagesHook = useConversationMessages(convoId, newChat);

    const { prepConversation } = usePrepConversationSocket({});

    const {
        conversationCrud,
        messageCrud,
        createNewConversation,
        setActiveConversation,
        isCreatingNewConversation,
        newMessage,
        saveMessage,
        isRelationshipLoading,
    } = conversationMessagesHook;

    const waitForLoading = useCallback(() => {
        return new Promise<void>((resolve) => {
            if (!isRelationshipLoading) {
                resolve();
                return;
            }
            const unsubscribe = setInterval(() => {
                if (!isRelationshipLoading) {
                    clearInterval(unsubscribe);
                    resolve();
                }
            }, 100);
        });
    }, [isRelationshipLoading]);


    const handleNewChat = useCallback(() => {
        const { conversationId, messageId } = createNewConversation({
            currentModel: modelId,
            currentMode: mode,
        });
        setConversationId(conversationId);

        setMessageId(messageId);
        setIsConversationReady(true);
    }, [createNewConversation, modelId, mode]);

    const handleExistingChat = useCallback(async (conversationId: string) => {
        console.log("🧪 useChat handleExistingChat");
        await waitForLoading();
        setIsConversationReady(true);
        prepConversation(conversationId);
    }, []);


    useEffect(() => {
        console.log("🌟useChat useEffect");
        console.log("-conversationId", conversationId);
        if (isRelationshipLoading) return;
        if (conversationId) {
            handleExistingChat(conversationId);
        } else {
            handleNewChat();
        }
    }, [conversationId]);


    const updateModel = useCallback(
        (key: string) => {
            const modelId = key.startsWith("id:") ? key.slice(3) : key;
            
            if (conversationMessagesHook.currentConversation) {
                conversationCrud.updateCurrentModel(modelId);
            }
    
            setModelId(modelId);
        },
        [conversationMessagesHook.currentConversation, conversationCrud]
    );

    const updateMode = useCallback(
        (mode: ChatMode) => {
            if (conversationMessagesHook.currentConversation) {
                conversationCrud.updateCurrentMode(mode);
            }

            setMode(mode);
        },
        [conversationMessagesHook.currentConversation, conversationCrud]
    );

    const updateEndpoint = useCallback(
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
            setConversationId(result.conversationId);
            setMessageId(result.messageId);

            router.push(`/c/${result.conversationId}`);
            await new Promise((resolve) => setTimeout(resolve, 200));

            handleExistingChat(result.conversationId);
        }

        return result;
    }, [conversationMessagesHook, router]);

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
                const eventName = await chatManager.streamMessage(conversationId, newMessage);
                setEventName(eventName);
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

        handleNewChat,
        handleExistingChat,
        newChat,

        saveNewConversationAndNavigate,
        isConversationReady,
        conversationId,
        messageId,

        modelId,
        mode,

        updateModel,
        updateMode,
        updateEndpoint,
        updateChatMetadata,

        fileManager,
        eventName,

        submitChatMessage,
        isSubmitting,
    };
}

export type ChatResult = ReturnType<typeof useChat>;
export default useChat;

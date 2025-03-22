// hooks/ai/chat/new/useChat.ts

"use client";

import { useCallback, useEffect, useState } from "react";
import { Conversation } from "@/types";
import { ChatMode, Message } from "@/types/chat/chat.types";
import useConversationMessages from "@/hooks/ai/chat/useConversationMessages";
import { useFileManagement } from "@/hooks/ai/chat/useFileManagement";
import { ChatTaskManager } from "@/lib/redux/socket/task-managers/ChatTaskManager";
import { usePathname, useRouter } from "next/navigation";
import { usePrepConversationSocket } from "@/lib/redux/socket/schema/hooks/usePrepConversationSocket";
import { DEFAULT_MODEL_ID, DEFAULT_MODE } from "@/constants/chat";

const DEBUG = false;
const VERBOSE = false;

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

export function useChat(isNewChat: boolean = false) {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
    const [mode, setMode] = useState<ChatMode>(DEFAULT_MODE);
    const [newChat, setNewChat] = useState<boolean>(isNewChat);
    const [messageId, setMessageId] = useState<string | null>(null);
    const [isConversationReady, setIsConversationReady] = useState(false);
    const [isMessageReady, setIsMessageReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [socketTaskStarted, setSocketTaskStarted] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [eventName, setEventName] = useState<string | null>(null);

    const chatManager = new ChatTaskManager();
    const router = useRouter();
    const pathname = usePathname();
    const match = pathname.match(/\/c\/([^\/?]+)/);
    const convoId = match ? match[1] : undefined;


    const conversationMessagesHook = useConversationMessages();

    const { prepConversation } = usePrepConversationSocket({});

    const {
        conversationCrud,
        messageCrud,
        createNewConversation,
        setActiveConversation,
        isCreatingNewConversation,
        currentMessage,
        currentConversation,
        saveMessage,
        createNewMessage,
        isConversationLoading,
        isMessageLoading,
        isRelationshipLoading,
    } = conversationMessagesHook;

    const waitForLoading = useCallback(() => {
        return new Promise<void>((resolve) => {
            if (!isConversationLoading) {
                resolve();
                return;
            }
            const unsubscribe = setInterval(() => {
                if (!isConversationLoading) {
                    clearInterval(unsubscribe);
                    resolve();
                }
            }, 100);
        });
    }, [isConversationLoading]);


    const handleNewChat = useCallback(() => {
        const { conversationId, messageId } = createNewConversation({
            currentModel: modelId,
            currentMode: mode,
        });

        setConversationId(conversationId);
        setMessageId(messageId);
        setIsConversationReady(true);
        setNewChat(true);
    }, [createNewConversation, modelId, mode]);

    const handleExistingChat = useCallback(async (conversationId: string) => {
        console.log("--useChat-- handleExistingChat");
        setNewChat(false);
        await waitForLoading();
        setActiveConversation(conversationId);
        setConversationId(conversationId);
        setIsConversationReady(true);

        prepConversation(conversationId);
    }, []);



    useEffect(() => {
        if (conversationId) return;
        if (convoId) {
            handleExistingChat(convoId);
        } else if (newChat) {
            handleNewChat();
        }
    }, [conversationId, newChat, handleNewChat, handleExistingChat, convoId]);


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
            if (conversationMessagesHook.currentMessage) {
                messageCrud.updateMetadata(metadata);
            }
        },
        [conversationMessagesHook.currentConversation, conversationMessagesHook.currentMessage, conversationCrud]
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
                setNewChat(false);
            } else {
                result = await saveMessage();
            }

            if (result.success) {
                if (isCreatingNewConversation) {
                    await new Promise((resolve) => setTimeout(resolve, 200));
                }
                const eventName = await chatManager.streamMessage(conversationId, currentMessage);
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
    }, [isCreatingNewConversation, saveNewConversationAndNavigate, saveMessage, currentMessage]);

    return {
        ...conversationMessagesHook,

        handleNewChat,
        handleExistingChat,

        saveNewConversationAndNavigate,
        isConversationReady,
        conversationId,
        messageId,
        newChat,

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

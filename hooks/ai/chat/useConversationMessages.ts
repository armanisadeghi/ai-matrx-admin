import { useOneRelationship } from "@/lib/redux/entity/hooks/useOneRelationship";
import { ConversationData, MessageRecordWithKey } from "@/types/AutomationSchemaTypes";
import { MatrxRecordId } from "@/types/entityTypes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatMode, Conversation, Message, MessageRole } from "@/types/chat/chat.types";
import { useCreateConvoAndMessage } from "@/app/entities/hooks/crud/by-relationships/useCreateConvoAndMessage";
import {
    DEFAULT_MODEL_ID,
    DEFAULT_MODE,
    NEW_CONVERSATION_ID,
    NEW_CONVERSATION_LABEL,
    CHAT_RELATIONSHIP_BASE_CONFIG,
    CHAT_CREATE_BASE_CONFIG,
} from "@/constants/chat";

const DEBUG = true;
const VERBOSE = false;

type MessageWithKey = Message & { matrxRecordId: MatrxRecordId };

export interface CreateNewConversationParams {
    label?: string;
    currentModel?: string;
    currentMode?: ChatMode;
    initialMessage?: string;
    conversationData?: any;
    messageData?: Partial<Message>;
}

interface SaveNewConversationResult {
    success: boolean;
    conversationId?: string;
    conversationRecordKey?: MatrxRecordId;
    messageId?: string;
    messageRecordKey?: MatrxRecordId;
    error?: Error;
}

export function useConversationMessages(convoId: string, newChat: boolean) {
    const [conversationId, setConversationId] = useState<string>(convoId);

    const [isCreatingNewConversation, setIsCreatingNewConversation] = useState(false);
    const [isComposingNewMessage, setIsComposingNewMessage] = useState(false);

    const relationshipHook = useOneRelationship(CHAT_RELATIONSHIP_BASE_CONFIG);

    const { activeParentId, activeParentRecord, isParentLoading, isChildLoading, isRelationshipLoading, matchingChildRecords } =
        relationshipHook;

    const activeConversationId = activeParentId;
    const activeConversation = activeParentRecord as ConversationData;
    const allConversationMessages = matchingChildRecords as MessageRecordWithKey[];

    const { conversationCrud, messageCrud, createConversationAndMessage, saveConversationAndMessage } =
        useCreateConvoAndMessage(CHAT_CREATE_BASE_CONFIG);

    const currentConversation = useMemo(() => {
        return isCreatingNewConversation ? conversationCrud.conversation : activeConversation;
    }, [isCreatingNewConversation]);

    useEffect(() => {
        if (VERBOSE) {
            console.log(
                " 🧠 useConversationMessages conversationCrud.conversation",
                JSON.stringify(conversationCrud.conversation, null, 2)
            );
            console.log(" 💣 useConversationMessages activeConversation", JSON.stringify(activeConversation, null, 2));
        }
        if (VERBOSE) {
            console.log("useConversationMessages activeConversationId: ", activeConversationId);
        }
    }, [conversationCrud.conversation, activeConversation]);

    const messages = useMemo(() => {
        const validMessages = allConversationMessages.filter(
            (message) => message.displayOrder !== null && message.displayOrder !== undefined && !isNaN(message.displayOrder)
        );
        return validMessages.sort((a, b) => a.displayOrder - b.displayOrder);
    }, [allConversationMessages]);

    const newMessage = useMemo(() => {
        return messageCrud.message;
    }, [messageCrud.message]);

    const waitForLoading = useCallback(() => {
        return new Promise<void>((resolve) => {
            if (!isParentLoading) {
                resolve();
                return;
            }
            const unsubscribe = setInterval(() => {
                if (!isParentLoading) {
                    clearInterval(unsubscribe);
                    resolve();
                }
            }, 100);
        });
    }, [isParentLoading]);

    const setActiveConversation = useCallback(
        async (conversationId: string) => {
            if (conversationId === NEW_CONVERSATION_ID) {
                console.log("💤 setActiveConversation NEW_CONVERSATION_ID");
                setIsCreatingNewConversation(true);
                if (isComposingNewMessage) {
                    messageCrud.resetMessage();
                    setIsComposingNewMessage(false); // but how is the new message being started?
                }
            } else {
                await waitForLoading();
                const recordKey = `id:${conversationId}` as MatrxRecordId;
                console.log("💤 setActiveConversation recordKey", recordKey);
                setIsCreatingNewConversation(false);
                if (isComposingNewMessage) {
                    console.log("is composing new message, resetting");
                    messageCrud.resetMessage();
                    setIsComposingNewMessage(false);
                }
                await waitForLoading();
                relationshipHook.setActiveParent(recordKey);
            }
        },
        [relationshipHook, messageCrud, isComposingNewMessage]
    );

    useEffect(() => {
        if (isParentLoading) return;
        if (conversationId) {
            setActiveConversation(conversationId);
        }
    }, [conversationId, isParentLoading]);

    const createNewConversation = useCallback(
        ({
            label = NEW_CONVERSATION_LABEL,
            currentModel = DEFAULT_MODEL_ID,
            currentMode = DEFAULT_MODE,
            conversationData = {},
            initialMessage = "",
            messageData = {},
        }: CreateNewConversationParams = {}) => {
            setIsCreatingNewConversation(true);
            setIsComposingNewMessage(true);

            const fullConversationData = {
                label,
                currentModel,
                currentMode,
                ...conversationData,
            };

            const { conversationId, messageId } = createConversationAndMessage(fullConversationData, initialMessage, messageData);
            relationshipHook.setActiveParent(`new-record-${conversationId}`);

            return { conversationId, messageId };
        },
        [createConversationAndMessage]
    );

    // Save a newly created conversation and its message
    const saveNewConversation = useCallback(async (): Promise<SaveNewConversationResult> => {
        if (!isCreatingNewConversation) {
            return {
                success: false,
                error: new Error("No new conversation to save"),
            };
        }

        try {
            // Save both records
            const result = await saveConversationAndMessage();

            if (result.conversationSuccess && result.messageSuccess) {
                // Success! Now set this as the active conversation
                setIsCreatingNewConversation(false);
                setIsComposingNewMessage(false);

                // CRITICAL FIX: Use the recordKey to set the active parent, not the ID
                if (result.conversationRecordKey) {
                    relationshipHook.setActiveParent(result.conversationRecordKey);
                } else if (result.conversationId) {
                    console.warn("Using ID instead of recordKey to set active conversation");
                    relationshipHook.setActiveParent(`id:${result.conversationId}`);
                }

                return {
                    success: true,
                    conversationId: result.conversationId,
                    conversationRecordKey: result.conversationRecordKey,
                    messageId: result.messageId,
                    messageRecordKey: result.messageRecordKey,
                };
            }

            return {
                success: false,
                error: result.error || new Error("Failed to save conversation or message"),
            };
        } catch (error) {
            console.error("Error saving new conversation:", error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }, [isCreatingNewConversation, saveConversationAndMessage, relationshipHook]);

    // Create a new message in the current active conversation
    const createNewMessage = useCallback(
        (content: string = "", additionalData: Partial<Message> = {}, add_one_to_count = false) => {
            setIsComposingNewMessage(true);

            const countAdjustment = add_one_to_count ? 3 : 1;

            const nextMessageDisplayOrder = (() => {
                if (messages.length === 0) {
                    return 1;
                }
                const displayOrders = messages.map((message) => message.displayOrder);
                const maxDisplayOrder = Math.max(...displayOrders);
                return maxDisplayOrder + countAdjustment;
            })();

            const nextMessageSystemOrder = (() => {
                if (messages.length === 0) {
                    return 2;
                }
                const systemOrders = messages.map((message) => message.systemOrder);
                const maxSystemOrder = Math.max(...systemOrders);
                return maxSystemOrder + countAdjustment;
            })();

            console.log("--useConversationMessages-- activeConversationId", activeConversationId);
            messageCrud.resetMessage();

            const messageId = messageCrud.createMessage({
                conversationId: activeConversationId,
                content,
                displayOrder: nextMessageDisplayOrder,
                systemOrder: nextMessageSystemOrder,
                role: "user" as MessageRole,
                ...additionalData,
            });

            return messageId;
        },
        [activeConversationId, isCreatingNewConversation, messageCrud, messages]
    );

    const saveMessage = useCallback(async () => {
        if (isCreatingNewConversation) {
            console.error("Cannot save individual message: In new conversation mode");
            return { success: false, error: new Error("In new conversation mode") };
        }

        console.log("--useConversationMessages-- saveMessage", newMessage);
        console.log(
            "--useConversationMessages-- activeConversationId (But might be different than what was already submitted)",
            activeConversationId
        );

        const result = await messageCrud.saveMessage();

        if (result.success) {
            setIsComposingNewMessage(false);
        }

        return result;
    }, [isCreatingNewConversation, messageCrud]);

    const updateExistingConversation = useCallback(
        (updates: Partial<Conversation>) => {
            if (isCreatingNewConversation || !activeConversationId) {
                console.error("Cannot update: No active existing conversation");
                return false;
            }
            conversationCrud.batchUpdate(updates);
            return true;
        },
        [isCreatingNewConversation, activeConversationId, conversationCrud]
    );

    const saveUpdatedConversation = useCallback(async () => {
        if (isCreatingNewConversation || !activeConversationId) {
            console.error("Cannot save update: No active existing conversation");
            return {
                success: false,
                error: new Error("No active existing conversation"),
            };
        }

        return await conversationCrud.saveConversation();
    }, [isCreatingNewConversation, activeConversationId, conversationCrud]);

    const resetCurrentMessage = useCallback(() => {
        if (isComposingNewMessage) {
            messageCrud.resetMessage();
            setIsComposingNewMessage(false);
        }
    }, [messageCrud, isComposingNewMessage]);

    useEffect(() => {
        const shouldStartNewMessage =
            (activeConversationId || isCreatingNewConversation) && !isComposingNewMessage && !messageCrud.messageId;

        if (shouldStartNewMessage) {
            if (isCreatingNewConversation) {
                createConversationAndMessage({ label: "New Conversation" }, "");
            } else if (activeConversationId) {
                if (messages.length === 0) return;
                createNewMessage();
            }
        }
    }, [
        activeConversationId,
        isCreatingNewConversation,
        isComposingNewMessage,
        messages,
        messageCrud.messageId,
        createConversationAndMessage,
        createNewMessage,
    ]);

    return {
        currentConversation,

        isCreatingNewConversation,
        isComposingNewMessage,

        isConversationLoading: isParentLoading,
        isMessageLoading: isChildLoading,
        isRelationshipLoading,

        // Record Access Info
        activeConversationId,
        activeConversationRecordKey: relationshipHook.activeParentRecordKey,

        // Message Management
        createNewMessage, // Create a new message in the existing conversation
        saveMessage, // Save the current message being composed
        resetCurrentMessage, // Reset/clear the current message
        // Conversation Management
        setActiveConversation, // Set the active conversation
        createNewConversation, // Create a new conversation and its first message
        saveNewConversation, // Save a new conversation and its message
        updateExistingConversation, // Update an existing conversation
        saveUpdatedConversation, // Save updates to an existing conversation

        // Access to underlying hooks for advanced use cases
        conversationCrud,
        messageCrud,
        relationshipHook,

        newMessage,
        allConversationMessages,
    };
}

export default useConversationMessages;
export type MainChatHookResult = ReturnType<typeof useConversationMessages>;

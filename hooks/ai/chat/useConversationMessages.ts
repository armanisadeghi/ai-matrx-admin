import { useOneRelationship } from "@/lib/redux/entity/hooks/useOneRelationship";
import { ConversationData } from "@/types/AutomationSchemaTypes";
import { MatrxRecordId } from "@/types/entityTypes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatMode, Conversation, Message, MessageRole } from "@/types/chat/chat.types";
import { useConversationMessageCrud } from "@/app/entities/hooks/crud/by-relationships/useConversationMessageCrud";
import { usePrepConversationSocket } from "@/lib/redux/socket/schema/hooks/usePrepConversationSocket";

// Special identifier for a new conversation being created
const NEW_CONVERSATION_ID = "new-conversation";

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

export function useConversationMessages() {
    const relationshipHook = useOneRelationship("conversation", "message", "id", "conversationId");
    const { conversationCrud, messageCrud, createConversationAndMessage, saveConversationAndMessage } = useConversationMessageCrud();

    const { prepConversation } = usePrepConversationSocket({});

    const [isCreatingNewConversation, setIsCreatingNewConversation] = useState(false);

    const [isComposingNewMessage, setIsComposingNewMessage] = useState(false);

    const activeConversationId = relationshipHook.activeParentId;
    const activeConversation = relationshipHook.activeParentRecord as ConversationData;
    const allConversationMessages = relationshipHook.matchingChildRecords as MessageWithKey[];

    useEffect(() => {
        if (!activeConversationId || isCreatingNewConversation || activeConversationId === NEW_CONVERSATION_ID) {
            return;
        }

        prepConversation(activeConversationId);
    }, [activeConversationId]);

    const messages = useMemo(() => {
        const validMessages = allConversationMessages.filter(
            (message) => message.displayOrder !== null && message.displayOrder !== undefined && !isNaN(message.displayOrder)
        );
        return validMessages.sort((a, b) => a.displayOrder - b.displayOrder);
    }, [allConversationMessages]);

    // CONSISTENT DATA ACCESS - The three critical elements

    // 1. Current Conversation - consistently available regardless of creation mode
    const currentConversation = useMemo(() => {
        return isCreatingNewConversation ? conversationCrud.conversation : activeConversation;
    }, [isCreatingNewConversation, conversationCrud.conversation, activeConversation]);

    // 2. Current Messages - consistently available history messages
    const currentMessages = useMemo(() => {
        // If creating new conversation, there are no history messages yet
        if (isCreatingNewConversation) return [];
        return messages;
    }, [isCreatingNewConversation, messages]);

    // 3. Current Message - ALWAYS the message being composed/edited
    const currentMessage = useMemo(() => {
        return messageCrud.message;
    }, [messageCrud.message]);

    // Enhanced setActiveConversation to handle the "new-conversation" special case
    const setActiveConversation = useCallback(
        (conversationId: string) => {
            const recordKey = `id:${conversationId}` as MatrxRecordId;

            if (conversationId === NEW_CONVERSATION_ID) {
                // Initialize a new conversation creation mode
                setIsCreatingNewConversation(true);
                // Reset any currently composing message
                if (isComposingNewMessage) {
                    messageCrud.resetMessage();
                    setIsComposingNewMessage(false);
                }
                // We don't set an active parent in the relationship hook yet
                // since we don't have a real ID until we save
            } else {
                // Normal case - activate an existing conversation
                setIsCreatingNewConversation(false);
                // Reset any currently composing message
                if (isComposingNewMessage) {
                    messageCrud.resetMessage();
                    setIsComposingNewMessage(false);
                }
                relationshipHook.setActiveParent(recordKey);
            }
        },
        [relationshipHook, messageCrud, isComposingNewMessage]
    );

    // Create a new conversation and its first message
    const createNewConversation = useCallback(
        ({
            label = "New Conversation",
            currentModel = undefined,
            currentMode = "general",
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
                    // Fallback to ID if recordKey is not available (shouldn't happen)
                    console.warn("Using ID instead of recordKey to set active conversation");
                    relationshipHook.setActiveParent(result.conversationId);
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
            if (!activeConversationId || isCreatingNewConversation) {
                console.log("Cannot create message: No active conversation", activeConversationId, isCreatingNewConversation);
                return null;
            }

            setIsComposingNewMessage(true);

            const countAdjustment = add_one_to_count ? 2 : 1;

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

    // Save a message in the current active conversation
    const saveMessage = useCallback(async () => {
        if (isCreatingNewConversation) {
            console.error("Cannot save individual message: In new conversation mode");
            return { success: false, error: new Error("In new conversation mode") };
        }

        const result = await messageCrud.saveMessage();

        if (result.success) {
            setIsComposingNewMessage(false);
        }

        return result;
    }, [isCreatingNewConversation, messageCrud]);

    // Placeholder for updating an existing conversation (to be implemented or used with external hook)
    const updateExistingConversation = useCallback(
        (updates: Partial<Conversation>) => {
            if (isCreatingNewConversation || !activeConversationId) {
                console.error("Cannot update: No active existing conversation");
                return false;
            }

            // Use the conversation crud hook to update fields
            conversationCrud.batchUpdate(updates);
            return true;
        },
        [isCreatingNewConversation, activeConversationId, conversationCrud]
    );

    // Placeholder for saving an updated conversation (to be implemented or used with external hook)
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

    // Reset the current message being composed
    const resetCurrentMessage = useCallback(() => {
        if (isComposingNewMessage) {
            messageCrud.resetMessage();
            setIsComposingNewMessage(false);
        }
    }, [messageCrud, isComposingNewMessage]);

    // Ensure a message is always being composed when we have an active conversation
    useEffect(() => {
        // If we have an active conversation (new or existing) but no message is being composed
        const shouldStartNewMessage =
            (activeConversationId || isCreatingNewConversation) && !isComposingNewMessage && !messageCrud.messageId;

        if (shouldStartNewMessage) {
            if (isCreatingNewConversation) {
                // For new conversations, we already create a message in createNewConversation
                // This is a fallback in case that didn't happen for some reason
                createConversationAndMessage({ label: "New Conversation" }, "");
            } else if (activeConversationId) {
                // For existing conversations, create a new message to compose

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

    // Expose the consolidated interface
    return {
        // Core/Consistent Data - Always Available
        currentConversation, // The current conversation (new or existing)
        currentMessages, // The messages in the current conversation (empty if new)
        currentMessage, // The message currently being composed/edited

        // Conversation Status
        isCreatingNewConversation, // Whether we're creating a new conversation
        isComposingNewMessage, // Whether we're composing a new message

        // Record Access Info
        activeConversationId: isCreatingNewConversation ? null : activeConversationId,
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
        NEW_CONVERSATION_ID, // Special ID for creating new conversations

        // Access to underlying hooks for advanced use cases
        conversationCrud,
        messageCrud,
        relationshipHook,

        // Legacy naming to maintain compatibility
        activeConversation: currentConversation,
        messages: currentMessages,
        message: currentMessage,
        allConversationMessages,
    };
}

export default useConversationMessages;
export type MainChatHookResult = ReturnType<typeof useConversationMessages>;

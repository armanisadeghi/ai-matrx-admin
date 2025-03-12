import { useCallback } from "react";
import useConversationCrud from "../by-entity/useConversationCrud";
import useMessageCrud from "../by-entity/useMessageCrud";
import { Conversation, Message } from "@/types/chat/chat.types";
import { MatrxRecordId } from "@/types/entityTypes";

interface SaveConversationAndMessageResult {
    conversationSuccess: boolean;
    messageSuccess: boolean;
    conversationId?: string;
    conversationRecordKey?: MatrxRecordId; // Added recordKey
    messageId?: string;
    messageRecordKey?: MatrxRecordId; // Added recordKey
    conversation?: Conversation;
    message?: Message;
    error?: Error;
}

interface UseConversationMessageCrudReturn {
    conversationCrud: ReturnType<typeof useConversationCrud>;
    messageCrud: ReturnType<typeof useMessageCrud>;
    
    createConversationAndMessage: (
        conversationData?: Partial<Conversation>,
        messageContent?: string,
        additionalMessageData?: Partial<Message>
    ) => {
        conversationId: string | null;
        messageId: string | null;
    };
    
    saveConversationAndMessage: () => Promise<SaveConversationAndMessageResult>;
}

export const useConversationMessageCrud = (): UseConversationMessageCrudReturn => {
    const conversationCrud = useConversationCrud();
    const messageCrud = useMessageCrud();
    
    const createConversationAndMessage = useCallback(
        (
            conversationData: Partial<Conversation> = {},
            messageContent: string = "",
            additionalMessageData: Partial<Message> = {}
        ) => {
            const conversationId = conversationCrud.createConversation(conversationData);
            const messageId = messageCrud.createMessage({
                conversationId: conversationId || undefined,
                content: messageContent,
                role: "user", // Always 'user' for first message
                displayOrder: 1, // Always 1 for first message
                systemOrder: 2, // Always 2 for first message
                ...additionalMessageData
            });
            
            return {
                conversationId,
                messageId,
            };
        },
        [conversationCrud, messageCrud]
    );
    
    const saveConversationAndMessage = useCallback(async (): Promise<SaveConversationAndMessageResult> => {
        try {
            const conversationResult = await conversationCrud.saveConversation();
            
            if (!conversationResult.success || !conversationResult.id) {
                return {
                    conversationSuccess: false,
                    messageSuccess: false,
                    error: conversationResult.error || new Error("Failed to save conversation"),
                };
            }
            
            const savedConversationId = conversationResult.id;
            messageCrud.updateConversationId(savedConversationId);
            const messageResult = await messageCrud.saveMessage();
            
            return {
                conversationSuccess: conversationResult.success,
                messageSuccess: messageResult.success,
                conversationId: savedConversationId,
                conversationRecordKey: conversationResult.recordKey, // Critical recordKey
                messageId: messageResult.id,
                messageRecordKey: messageResult.recordKey, // Critical recordKey
                conversation: conversationResult.fullRecord,
                message: messageResult.fullRecord,
                error: messageResult.success ? undefined : messageResult.error,
            };
        } catch (error) {
            console.error("Error saving conversation and message:", error);
            return {
                conversationSuccess: false,
                messageSuccess: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }, [conversationCrud, messageCrud]);
    
    return {
        conversationCrud,
        messageCrud,
        createConversationAndMessage,
        saveConversationAndMessage,
    };
};

export default useConversationMessageCrud;
import { useCallback, useEffect, useState } from "react";
import useConversationCrud from "../by-entity/useConversationCrud";
import useMessageCrud from "../by-entity/useMessageCrud";
import { Conversation, Message } from "@/types/chat/chat.types";
import { MatrxRecordId } from "@/types/entityTypes";
import { useEntityTools } from "@/lib/redux/entity/hooks/coreHooks";
import { useAppDispatch } from "@/lib/redux/hooks";
import { SelectionMode } from "@/lib/redux/entity/types/stateTypes";

export interface SaveConversationAndMessageResult {
    conversationSuccess: boolean;
    messageSuccess: boolean;
    conversationId?: string;
    conversationRecordKey?: MatrxRecordId;
    messageId?: string;
    messageRecordKey?: MatrxRecordId;
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

interface UseConversationMessageCrudParams {
    setActiveConversation?: boolean;
    conversationSelectionMode?: SelectionMode;
    setActiveMessage?: boolean;
    messageSelectionMode?: SelectionMode;
}

export const useConversationMessageCrud = ({
    setActiveConversation = true,
    conversationSelectionMode = "single",
    setActiveMessage = true,
    messageSelectionMode = "single",
}: UseConversationMessageCrudParams): UseConversationMessageCrudReturn => {
    const dispatch = useAppDispatch();
    const { actions: conversationActions } = useEntityTools("conversation");
    const { actions: messageActions } = useEntityTools("message");

    const conversationCrud = useConversationCrud();
    const messageCrud = useMessageCrud();

    useEffect(() => {
        dispatch(conversationActions.setSelectionMode(conversationSelectionMode));
    }, [conversationSelectionMode]);

    useEffect(() => {
        dispatch(messageActions.setSelectionMode(messageSelectionMode));
    }, [messageSelectionMode]);

    const createConversationAndMessage = useCallback(
        (conversationData: Partial<Conversation> = {}, messageContent: string = "", additionalMessageData: Partial<Message> = {}) => {
            const conversationId = conversationCrud.createConversation(conversationData);
            const messageId = messageCrud.createMessage({
                conversationId: conversationId || undefined,
                content: messageContent,
                role: "user", // Always 'user' for first message
                displayOrder: 1, // Always 1 for first message
                systemOrder: 2, // Always 2 for first message
                ...additionalMessageData,
            });

            const conversationRecordKey = `new-record-${conversationId}`;
            const messageRecordKey = `new-record-${messageId}`;

            if (setActiveConversation) {
                console.log("----createConversationAndMessage-- conversationRecordKey", conversationRecordKey);

                dispatch(conversationActions.setActiveRecord(conversationRecordKey));
            }
            if (setActiveMessage) {
                console.log("----createConversationAndMessage-- messageRecordKey", messageRecordKey);
                dispatch(messageActions.setActiveRecord(messageRecordKey));
            }

            return {
                conversationId,
                messageId,
            };
        },
        [conversationCrud, messageCrud]
    );

    const saveConversationAndMessage = useCallback(async (): Promise<SaveConversationAndMessageResult> => {
        console.log("----saveConversationAndMessage-- 🧠💾📨📝💬📚🛟📥✨🔍");
        console.log("----saveConversationAndMessage-- ❌⚠️🛑🚫⛔🔒💣💥🧨📛");

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

            if (setActiveConversation) {
                dispatch(conversationActions.setActiveRecord(savedConversationId));
            }
            if (setActiveMessage) {
                dispatch(messageActions.setActiveRecord(messageResult.id));
            }

            return {
                conversationSuccess: conversationResult.success,
                messageSuccess: messageResult.success,
                conversationId: savedConversationId,
                conversationRecordKey: conversationResult.recordKey,
                messageId: messageResult.id,
                messageRecordKey: messageResult.recordKey,
                conversation: conversationResult.fullRecord,
                message: messageResult.message,
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

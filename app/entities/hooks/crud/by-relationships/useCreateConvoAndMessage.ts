import { useCallback, useEffect } from "react";
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

interface UseCreateConvoAndMessageReturn {
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

interface UseCreateConvoAndMessageParams {
    setActiveConversation?: boolean;
    conversationSelectionMode?: SelectionMode;
    setActiveMessage?: boolean;
    messageSelectionMode?: SelectionMode;
}

export const useCreateConvoAndMessage = ({
    setActiveConversation = true,
    conversationSelectionMode = "single",
    setActiveMessage = true,
    messageSelectionMode = "single",
}: UseCreateConvoAndMessageParams): UseCreateConvoAndMessageReturn => {
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
            if (!conversationId) {
                return {
                    conversationId: null,
                    messageId: null,
                };
            }
            const messageId = messageCrud.createMessage({
                conversationId: conversationId,
                content: messageContent,
                role: "user", // Always 'user' for first message
                displayOrder: 1, // Always 1 for first message
                systemOrder: 2, // Always 2 for first message
                ...additionalMessageData,
            });

            const conversationRecordKey = `new-record-${conversationId}`;
            const messageRecordKey = `new-record-${messageId}`;

            if (setActiveConversation) {
                console.log("createConversationAndMessage: conversationRecordKey", conversationRecordKey);
                dispatch(conversationActions.setActiveRecord(conversationRecordKey));
            }
            if (setActiveMessage) {
                console.log("createConversationAndMessage: messageRecordKey", messageRecordKey);
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
            const conversationRecordKey = conversationResult.recordKey;
            const messageRecordKey = messageResult.recordKey;

            if (setActiveConversation) {
                dispatch(conversationActions.setActiveRecord(conversationRecordKey));
            }
            if (setActiveMessage) {
                dispatch(messageActions.setActiveRecord(messageRecordKey));
            }

            return {
                conversationSuccess: conversationResult.success,
                messageSuccess: messageResult.success,
                conversationId: savedConversationId,
                conversationRecordKey: conversationRecordKey,
                messageId: messageResult.id,
                messageRecordKey: messageRecordKey,
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

export default useCreateConvoAndMessage;

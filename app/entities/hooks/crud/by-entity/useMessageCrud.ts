import { useCallback, useState, useEffect, useMemo } from "react";
import useCreateUpdateRecord from "../useCreateUpdateRecord";
import { Message, MessageRole, MessageType, MessageMetadata } from "@/types/chat/chat.types";
import { getPermanentId } from "@/lib/redux";
interface UseMessageProps {
    conversationId?: string;
}

interface SaveMessageResult {
    success: boolean;
    tempRecordId?: string;
    recordKey?: string;
    id?: string;
    fullRecord?: Message;
    error?: Error;
}

interface UseMessageCrudReturn {
    message: Message | null;
    messageId: string | null;
    createMessage: (initialData?: Partial<Message>) => string | null;
    updateContent: (content: string) => void;
    updateRole: (role: MessageRole) => void;
    updateType: (type: MessageType) => void;
    updateMetadata: (metadata: Partial<MessageMetadata>) => void;
    updateConversationId: (conversationId: string) => void;
    updateImageUrl: (imageUrl: string) => void;
    updateBlobUrl: (blobUrl: string) => void;
    updateDisplayOrder: (order: number) => void;
    updateSystemOrder: (order: number) => void;
    updateIsPublic: (isPublic: boolean) => void;
    batchUpdate: (updates: Partial<Message>) => void;
    saveMessage: () => Promise<SaveMessageResult>;
    resetMessage: () => void;
    hasRequiredFields: boolean;
    isValidMessage: boolean;
}

export const useMessageCrud = ({ conversationId }: UseMessageProps = {}): UseMessageCrudReturn => {
    const {
        start,
        updateField,
        updateFields,
        saveAsync,
        currentRecordId,
        recordDataWithDefaults,
    } = useCreateUpdateRecord({ entityKey: "message", showSuccessToast: false, showErrorToast: false });

    const messageWithDefaults = recordDataWithDefaults as Message | null;

    const [hasRequiredFields, setHasRequiredFields] = useState<boolean>(!!conversationId);

    useEffect(() => {
        const hasConversationId = !!messageWithDefaults?.conversationId;
        const hasDisplayOrder = messageWithDefaults?.displayOrder !== undefined;
        const hasSystemOrder = messageWithDefaults?.systemOrder !== undefined;

        const newHasRequiredFields = hasConversationId && hasDisplayOrder && hasSystemOrder;

        if (hasRequiredFields !== newHasRequiredFields) {
            setHasRequiredFields(newHasRequiredFields);
        }
    }, [messageWithDefaults, hasRequiredFields]);

    const createMessage = useCallback(
        (initialData: Partial<Message> = {}) => {
            const baseData: Partial<Message> = {
                ...(conversationId ? { conversationId } : {}),
                role: "user" as MessageRole,
                type: "text" as MessageType,
                ...initialData,
            };

            const tempRecordKey = start(baseData, "id");
            const messageId = getPermanentId(tempRecordKey);
            return messageId;
        },
        [start, conversationId]
    );

    const updateContent = useCallback(
        (content: string) => {
            updateField("content", content);
        },
        [updateField]
    );

    const updateRole = useCallback(
        (role: MessageRole) => {
            updateField("role", role);
        },
        [updateField]
    );

    const updateConversationId = useCallback(
        (conversationId: string) => {
            updateField("conversationId", conversationId);
        },
        [updateField]
    );

    const updateType = useCallback(
        (type: MessageType) => {
            updateField("type", type);
        },
        [updateField]
    );

    const updateMetadata = useCallback(
        (metadata: Partial<MessageMetadata>) => {
            const updatedMetadata = {
                ...(messageWithDefaults?.metadata || {}),
                ...metadata,
            };

            updateField("metadata", updatedMetadata);
        },
        [updateField, messageWithDefaults]
    );

    const updateImageUrl = useCallback(
        (imageUrl: string) => {
            const updatedMetadata = {
                ...(messageWithDefaults?.metadata || {}),
                image_url: imageUrl,
            };

            updateFields({
                metadata: updatedMetadata,
                type: "mixed" as MessageType,
            });
        },
        [updateFields, messageWithDefaults]
    );

    const updateBlobUrl = useCallback(
        (blobUrl: string) => {
            const updatedMetadata = {
                ...(messageWithDefaults?.metadata || {}),
                blob: blobUrl,
            };

            updateFields({
                metadata: updatedMetadata,
                type: "mixed" as MessageType,
            });
        },
        [updateFields, messageWithDefaults]
    );

    const updateDisplayOrder = useCallback(
        (order: number) => {
            updateField("displayOrder", order);
        },
        [updateField]
    );

    const updateSystemOrder = useCallback(
        (order: number) => {
            updateField("systemOrder", order);
        },
        [updateField]
    );

    const updateIsPublic = useCallback(
        (isPublic: boolean) => {
            updateField("isPublic", isPublic);
        },
        [updateField]
    );

    const batchUpdate = useCallback(
        (updates: Partial<Message>) => {
            const { createdAt, ...safeUpdates } = updates;

            if (safeUpdates.metadata) {
                const { image_url, blob } = safeUpdates.metadata;

                if ((image_url !== undefined || blob !== undefined) && (!safeUpdates.type || safeUpdates.type !== "mixed")) {
                    safeUpdates.type = "mixed" as MessageType;
                }
            }

            if (Object.keys(safeUpdates).length > 0) {
                updateFields(safeUpdates);
            }
        },
        [updateFields]
    );

    const saveMessage = useCallback(async (): Promise<SaveMessageResult> => {
        const currentMessage = messageWithDefaults;

        const hasConversationId = !!currentMessage?.conversationId;
        const hasDisplayOrder = currentMessage?.displayOrder !== undefined;
        const hasSystemOrder = currentMessage?.systemOrder !== undefined;

        if (!hasConversationId || !hasDisplayOrder || !hasSystemOrder) {
            const missingFields: string[] = [];

            if (!hasConversationId) missingFields.push("conversationId");
            if (!hasDisplayOrder) missingFields.push("displayOrder");
            if (!hasSystemOrder) missingFields.push("systemOrder");

            const error = new Error(`Cannot save message: missing required fields: ${missingFields.join(", ")}`);
            console.warn(error.message);

            return {
                success: false,
                error,
            };
        }

        try {
            const saveResult = await saveAsync();

            return {
                success: saveResult.success,
                tempRecordId: saveResult.result?.tempRecordId,
                recordKey: saveResult.result?.recordKey,
                id: saveResult.result?.data?.id,
                fullRecord: saveResult.result?.data as Message,
                error: saveResult.error,
            };
        } catch (error) {
            console.error("Error saving message:", error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }, [messageWithDefaults, saveAsync]);

    const resetMessage = useCallback(() => {
        if (currentRecordId) {
            createMessage({});
        }
    }, [currentRecordId, createMessage]);

    const isValidMessage = useMemo((): boolean => {
        if (!currentRecordId) return false;

        const currentMessage = messageWithDefaults;

        return !!currentMessage?.conversationId && currentMessage?.displayOrder !== undefined && currentMessage?.systemOrder !== undefined;
    }, [currentRecordId, messageWithDefaults]);

    return {
        message: messageWithDefaults,
        messageId: currentRecordId,
        createMessage,
        updateContent,
        updateRole,
        updateType,
        updateMetadata,
        updateConversationId,
        updateImageUrl,
        updateBlobUrl,
        updateDisplayOrder,
        updateSystemOrder,
        updateIsPublic,
        batchUpdate,
        saveMessage,
        resetMessage,
        hasRequiredFields,
        isValidMessage,
    };
};

export default useMessageCrud;

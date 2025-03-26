import { useCallback, useState, useEffect, useMemo } from "react";
import useCreateUpdateRecord from "../useCreateUpdateRecord";
import { Message, MessageRole, MessageType, MessageMetadata } from "@/types/chat/chat.types";
import { getPermanentId } from "@/lib/redux";

interface UseMessageProps {
    conversationId: string | undefined;
}

export interface SaveMessageResult {
    success: boolean;
    tempRecordId?: string;
    recordKey?: string;
    id?: string;
    message?: Message;
    conversationId?: string;
    conversationRecordKey?: string;
    error?: Error;
}

export const useMessageCrud = ({ conversationId }: UseMessageProps) => {
    const { start, updateField, updateFields, saveAsync, currentRecordId, recordDataWithDefaults } = useCreateUpdateRecord({
        entityKey: "message",
        showSuccessToast: false,
        showErrorToast: false,
    });

    const messageWithDefaults = recordDataWithDefaults as Message | null;

    const [hasRequiredFields, setHasRequiredFields] = useState<boolean>(!!conversationId);

    useEffect(() => {
        const hasConversationId = conversationId;
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

    useEffect(() => {
        if (conversationId) {
            updateConversationId(conversationId);
        }
    }, [conversationId, updateConversationId]);

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

    const updateFiles = useCallback(
        (files: { url: string; type: string; details?: any }[]) => {
            const updatedMetadata = {
                ...(messageWithDefaults?.metadata || {}),
                files: files,
            };

            updateFields({
                metadata: updatedMetadata,
                type: "mixed" as MessageType,
            });
        },
        [updateFields, messageWithDefaults]
    );

    const updateBrokerValues = useCallback(
        (brokerValues: Record<string, unknown>) => {
            updateField("metadata.brokerValues", brokerValues);
        },
        [updateField]
    );

    const updateAvailableTools = useCallback(
        (availableTools: string[]) => {
            const currentMetadata = messageWithDefaults?.metadata || {};
            const updatedMetadata = {
                ...currentMetadata,
                availableTools: availableTools,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, messageWithDefaults]
    );

    const addTool = useCallback(
        (tool: string) => {
            updateField("metadata.availableTools", [...(messageWithDefaults?.metadata?.availableTools || []), tool]);
        },
        [updateField, messageWithDefaults]
    );

    const removeTool = useCallback(
        (tool: string) => {
            updateField(
                "metadata.availableTools",
                (messageWithDefaults?.metadata?.availableTools || []).filter((t) => t !== tool)
            );
        },
        [updateField, messageWithDefaults]
    );

    const addBrokerValue = useCallback(
        (key: string, value: unknown) => {
            updateField(`metadata.brokerValues.${key}`, value);
        },
        [updateField]
    );

    const removeBrokerValue = useCallback(
        (key: string) => {
            updateField(`metadata.brokerValues.${key}`, undefined);
        },
        [updateField]
    );

    const updateCurrentModel = useCallback(
        (model: string) => {
            updateField("metadata.currentModel", model);
        },
        [updateField]
    );

    const updateCurrentMode = useCallback(
        (mode: string) => {
            updateField("metadata.currentMode", mode);
        },
        [updateField]
    );

    const updateCurrentEndpoint = useCallback(
        (endpoint: string) => {
            updateField("metadata.currentEndpoint", endpoint);
        },
        [updateField]
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
            const conversationId = saveResult.result?.data?.conversationId;
            const conversationRecordKey = `id:${conversationId}`;

            return {
                success: saveResult.success,
                tempRecordId: saveResult.result?.tempRecordId,
                recordKey: saveResult.result?.recordKey,
                id: saveResult.result?.data?.id,
                message: saveResult.result?.data as Message,
                conversationId: conversationId,
                conversationRecordKey: conversationRecordKey,
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
        updateFiles,
        updateDisplayOrder,
        updateSystemOrder,
        updateIsPublic,
        batchUpdate,
        saveMessage,
        resetMessage,
        hasRequiredFields,
        isValidMessage,
        updateBrokerValues,
        updateAvailableTools,
        addTool,
        removeTool,
        addBrokerValue,
        removeBrokerValue,
        updateCurrentModel,
        updateCurrentMode,
        updateCurrentEndpoint,
    };
};

export default useMessageCrud;

export type UseMessageCrudReturn = ReturnType<typeof useMessageCrud>;

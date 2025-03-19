import { useCallback, useMemo } from "react";
import useCreateUpdateRecord from "../useCreateUpdateRecord";
import { Conversation, ConversationMetadata, ChatMode } from "@/types/chat/chat.types";
import { MatrxRecordId } from "@/types";
import { getPermanentId } from "@/lib/redux";

interface UseConversationProps {
}

interface SaveConversationResult {
    success: boolean;
    tempRecordId?: string;
    recordKey?: string;
    id?: string;
    fullRecord?: Conversation;
    error?: Error;
}

interface UseConversationCrudReturn {
    conversation: Conversation | null;
    conversationId: string | null;
    createConversation: (initialData?: Partial<Conversation>) => string | null;
    updateLabel: (label: string) => void;
    updateIsPublic: (isPublic: boolean) => void;
    updateMetadata: (metadata: Partial<ConversationMetadata>) => void;
    updateCurrentModel: (modelId: MatrxRecordId | undefined) => void;
    updateCurrentEndpoint: (endpointId: MatrxRecordId | undefined) => void;
    updateCurrentMode: (mode: ChatMode) => void;
    updateConcurrentRecipes: (recipeIds: MatrxRecordId[] | null) => void;
    updateBrokerValues: (values: Record<MatrxRecordId, unknown> | null) => void;
    updateAvailableTools: (tools: string[] | null) => void;
    updateModAssistantContext: (context: string | null) => void;
    updateModUserContext: (context: string | null) => void;
    batchUpdate: (updates: Partial<Conversation>) => void;
    saveConversation: () => Promise<SaveConversationResult>;
    resetConversation: () => void;
    isValidConversation: boolean;
}

export const useConversationCrud = ({}: UseConversationProps = {}): UseConversationCrudReturn => {
    const { start, updateField, updateFields, saveAsync, currentRecordId, recordDataWithDefaults } = useCreateUpdateRecord({
        entityKey: "conversation",
        showSuccessToast: false,
        showErrorToast: false,
    });

    const conversationWithDefaults = recordDataWithDefaults as Conversation | null;

    const createConversation = useCallback(
        (initialData: any = {}) => {
            const defaultMetadata: ConversationMetadata = {
                currentModel: undefined,
                currentEndpoint: undefined,
                currentMode: "general",
                concurrentRecipes: null,
                brokerValues: null,
                available_tools: null,
                ModAssistantContext: null,
                ModUserContext: null,
            };

            const metadataFields = [
                "currentModel",
                "currentEndpoint",
                "currentMode",
                "concurrentRecipes",
                "brokerValues",
                "available_tools",
                "ModAssistantContext",
                "ModUserContext",
            ];

            const conversationProps: Partial<Conversation> = { isPublic: false };
            let metadata = { ...defaultMetadata };

            Object.keys(initialData).forEach((key) => {
                if (key === "metadata") {
                    metadata = { ...defaultMetadata, ...initialData.metadata };
                } else if (metadataFields.includes(key)) {
                    metadata[key] = initialData[key];
                } else {
                    conversationProps[key] = initialData[key];
                }
            });

            conversationProps.metadata = metadata;

            const tempRecordKey = start(conversationProps, "id");
            const conversationId = getPermanentId(tempRecordKey);
            return conversationId;
        },
        [start]
    );

    const updateLabel = useCallback(
        (label: string) => {
            updateField("label", label);
        },
        [updateField]
    );

    const updateIsPublic = useCallback(
        (isPublic: boolean) => {
            updateField("isPublic", isPublic);
        },
        [updateField]
    );

    const updateMetadata = useCallback(
        (metadata: Partial<ConversationMetadata>) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                ...metadata,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const updateCurrentModel = useCallback(
        (modelId: string | undefined) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                currentModel: modelId,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const updateCurrentEndpoint = useCallback(
        (endpointId: string | undefined) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                currentEndpoint: endpointId,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const updateCurrentMode = useCallback(
        (mode: ChatMode) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                currentMode: mode,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const updateConcurrentRecipes = useCallback(
        (recipeIds: string[] | null) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                concurrentRecipes: recipeIds,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const updateBrokerValues = useCallback(
        (values: Record<string, unknown> | null) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                brokerValues: values,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const updateAvailableTools = useCallback(
        (tools: string[] | null) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                available_tools: tools,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const updateModAssistantContext = useCallback(
        (context: string | null) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                ModAssistantContext: context,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const updateModUserContext = useCallback(
        (context: string | null) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                ModUserContext: context,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    const batchUpdate = useCallback(
        (updates: Partial<Conversation>) => {
            const { createdAt, updatedAt, userId, ...safeUpdates } = updates;

            if (safeUpdates.metadata) {
                safeUpdates.metadata = {
                    ...(conversationWithDefaults?.metadata || {}),
                    ...safeUpdates.metadata,
                };
            }

            if (Object.keys(safeUpdates).length > 0) {
                updateFields(safeUpdates);
            }
        },
        [updateFields, conversationWithDefaults]
    );

    const saveConversation = useCallback(async (): Promise<SaveConversationResult> => {
        try {
            const saveResult = await saveAsync();
            return {
                success: saveResult.success,
                tempRecordId: saveResult.result?.tempRecordId,
                recordKey: saveResult.result?.recordKey,
                id: saveResult.result?.data?.id,
                fullRecord: saveResult.result?.data as Conversation,
                error: saveResult.error,
            };
        } catch (error) {
            console.error("Error saving conversation:", error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }, [saveAsync]);

    const resetConversation = useCallback(() => {
        if (currentRecordId) {
            createConversation({});
        }
    }, [currentRecordId, createConversation]);

    const isValidConversation = useMemo((): boolean => {
        return !!currentRecordId;
    }, [currentRecordId]);

    return {
        conversation: conversationWithDefaults,
        conversationId: currentRecordId,
        createConversation,
        updateLabel,
        updateIsPublic,
        updateMetadata,
        updateCurrentModel,
        updateCurrentEndpoint,
        updateCurrentMode,
        updateConcurrentRecipes,
        updateBrokerValues,
        updateAvailableTools,
        updateModAssistantContext,
        updateModUserContext,
        batchUpdate,
        saveConversation,
        resetConversation,
        isValidConversation,
    };
};

export default useConversationCrud;

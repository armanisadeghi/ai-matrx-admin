import { useCallback, useMemo } from "react";
import useCreateUpdateRecord from "../useCreateUpdateRecord";
import { Conversation, ConversationMetadata, ChatMode } from "@/types/chat/chat.types";
import { MatrxRecordId } from "@/types";


interface UseConversationProps {
    // No required props
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
    const {
        start,
        updateField,
        updateFields,
        saveAsync,
        currentRecordId,
        recordDataWithDefaults,
    } = useCreateUpdateRecord({ entityKey: "conversation" });
    
    const conversationWithDefaults = recordDataWithDefaults as Conversation | null;

    // Create a new conversation with default values
    const createConversation = useCallback(
        (initialData: Partial<Conversation> = {}) => {
            const baseData: Partial<Conversation> = {
                isPublic: false,
                ...initialData,
            };
            const conversationId = start(baseData, "id");
            return conversationId;
        },
        [start]
    );

    // Update the label field
    const updateLabel = useCallback(
        (label: string) => {
            updateField("label", label);
        },
        [updateField]
    );

    // Update the isPublic field
    const updateIsPublic = useCallback(
        (isPublic: boolean) => {
            updateField("isPublic", isPublic);
        },
        [updateField]
    );

    // Update the entire metadata object
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

    // Update the currentModel in metadata
    const updateCurrentModel = useCallback(
        (modelId: MatrxRecordId | undefined) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                currentModel: modelId,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    // Update the currentEndpoint in metadata
    const updateCurrentEndpoint = useCallback(
        (endpointId: MatrxRecordId | undefined) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                currentEndpoint: endpointId,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    // Update the currentMode in metadata
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

    // Update the concurrentRecipes in metadata
    const updateConcurrentRecipes = useCallback(
        (recipeIds: MatrxRecordId[] | null) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                concurrentRecipes: recipeIds,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    // Update the brokerValues in metadata
    const updateBrokerValues = useCallback(
        (values: Record<MatrxRecordId, unknown> | null) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                brokerValues: values,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    // Update the availableTools in metadata
    const updateAvailableTools = useCallback(
        (tools: string[] | null) => {
            const updatedMetadata = {
                ...(conversationWithDefaults?.metadata || {}),
                availableTools: tools,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, conversationWithDefaults]
    );

    // Update the ModAssistantContext in metadata
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

    // Update the ModUserContext in metadata
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

    // Batch update multiple fields at once
    const batchUpdate = useCallback(
        (updates: Partial<Conversation>) => {
            // Filter out date fields that we don't want to manually set
            const { createdAt, updatedAt, userId, ...safeUpdates } = updates;
            
            // Special handling for metadata to ensure we merge correctly
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

    // Save the conversation to the database
    const saveConversation = useCallback(async (): Promise<SaveConversationResult> => {
        // For conversation, we don't have required fields like we do for messages
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

    // Reset the conversation
    const resetConversation = useCallback(() => {
        if (currentRecordId) {
            createConversation({});
        }
    }, [currentRecordId, createConversation]);

    // Determine if the conversation is valid
    const isValidConversation = useMemo((): boolean => {
        // For conversations, we just need to make sure we have a record ID
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
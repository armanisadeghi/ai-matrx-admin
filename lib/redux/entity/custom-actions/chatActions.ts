import { EntityFieldKeys, MatrxRecordId } from "@/types/entityTypes";
import { AppDispatch, RootState } from "@/lib/redux";
import { getEntitySlice } from "../entitySlice";
import {
    createConversationAndMessage,
    saveConversationAndMessage,
} from "@/lib/redux/features/aiChats/thunks/entity/createConversationAndMessage";
import { Conversation, Message } from "@/types/chat/chat.types";
import { fetchRelatedRecordsThunk } from "../thunks/fetchRelatedRecordsThunk";
import { createMessageForConversation, saveMessageThunk } from "@/lib/redux/features/aiChats/thunks/entity/createMessageThunk";
import { fetchRelatedMessagesThunk } from "../../features/aiChats/thunks/entity/fetchRelatedMessagesThunk";


export type RuntimeFilter = {
    field: string;
    operator: "eq" | "neq";
    value: unknown;
};

export type RuntimeSort = {
    field: string;
    direction: "asc" | "desc";
};

const DEFAULT_MESSAGE_RUNTIME_FILTERS: RuntimeFilter[] = [
    { field: "role", operator: "neq", value: "system" },
    { field: "displayOrder", operator: "neq", value: 0 },
];

const DEFAULT_MESSAGE_RUNTIME_SORT: RuntimeSort = { field: "displayOrder", direction: "asc" };

export const getChatActions = (dispatch: AppDispatch) => {
    const conversationState = getEntitySlice("conversation");
    const messageState = getEntitySlice("message");
    const conversationActions = conversationState.actions;
    const messageActions = messageState.actions;
    const parentEntityField = "conversationId";

    dispatch(messageActions.setParentEntityField(parentEntityField));
    dispatch(messageActions.setRuntimeFilters(DEFAULT_MESSAGE_RUNTIME_FILTERS));
    dispatch(messageActions.setRuntimeSort(DEFAULT_MESSAGE_RUNTIME_SORT));

    return {
        fetchAllConversations: () => dispatch(conversationActions.fetchAll({})),

        setActiveConversation: (conversationId: string) => {
            dispatch(conversationActions.fetchOneWithFkIfk({ matrxRecordId: `id:${conversationId}` }));
            dispatch(conversationActions.setActiveRecord(`id:${conversationId}`));
            dispatch(messageActions.setActiveParentId(`id:${conversationId}`));
            dispatch(messageActions.addRuntimeFilter({ field: parentEntityField, operator: "eq", value: `id:${conversationId}` }));
        },

        setActiveMessage: (messageId: string) => {
            dispatch(messageActions.setActiveRecord(`id:${messageId}`));
        },

        createConversationAndMessage: (params: { messageContent: string }) =>
            dispatch(createConversationAndMessage({ messageContent: params.messageContent })),

        saveConversationAndMessage: (params: { conversationTempId: MatrxRecordId; messageTempId: MatrxRecordId }) =>
            dispatch(saveConversationAndMessage({ conversationTempId: params.conversationTempId, messageTempId: params.messageTempId })),

        saveMessageForConversation: (params: { messageTempId: MatrxRecordId }) =>
            dispatch(saveMessageThunk({ messageTempId: params.messageTempId })),

        updateConversationFieldSmart: (params: { keyOrId: string; field: string; value: any }) =>
            dispatch(conversationActions.updateFieldSmart(params)),

        updateMessageFieldSmart: (params: { keyOrId: string; field: string; value: any }) =>
            dispatch(messageActions.updateFieldSmart(params)),

        updateNestedConversationFieldSmart: (params: {
            keyOrId: string;
            field: EntityFieldKeys<"conversation">;
            nestedKey: string;
            value: any;
        }) => dispatch(conversationActions.updateNestedFieldSmart(params)),

        updateNestedMessageFieldSmart: (params: { keyOrId: string; field: EntityFieldKeys<"message">; nestedKey: string; value: any }) =>
            dispatch(messageActions.updateNestedFieldSmart(params)),

        updateModel: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: any }) => {
            dispatch(
                conversationActions.updateNestedFieldSmart({
                    keyOrId: params.conversationkeyOrId,
                    field: "metadata" as const,
                    nestedKey: "modelKey",
                    value: params.value,
                })
            );
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId: params.messagekeyOrId,
                    field: "metadata" as const,
                    nestedKey: "modelKey",
                    value: params.value,
                })
            );
        },

        updateEndpoint: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: any }) => {
            dispatch(
                conversationActions.updateNestedFieldSmart({
                    keyOrId: params.conversationkeyOrId,
                    field: "metadata" as const,
                    nestedKey: "currentEndpoint",
                    value: params.value,
                })
            );
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId: params.messagekeyOrId,
                    field: "metadata" as const,
                    nestedKey: "currentEndpoint",
                    value: params.value,
                })
            );
        },

        updateMode: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: any }) => {
            dispatch(
                conversationActions.updateNestedFieldSmart({
                    keyOrId: params.conversationkeyOrId,
                    field: "metadata" as const,
                    nestedKey: "currentMode",
                    value: params.value,
                })
            );
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId: params.messagekeyOrId,
                    field: "metadata" as const,
                    nestedKey: "currentMode",
                    value: params.value,
                })
            );
        },

        updateBrokerValues: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: Record<string, unknown> }) => {
            dispatch(
                conversationActions.updateNestedFieldSmart({
                    keyOrId: params.conversationkeyOrId,
                    field: "metadata" as const,
                    nestedKey: "brokerValues",
                    value: params.value,
                })
            );
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId: params.messagekeyOrId,
                    field: "metadata" as const,
                    nestedKey: "brokerValues",
                    value: params.value,
                })
            );
        },

        updateAvailableTools: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: string[] }) => {
            dispatch(
                conversationActions.updateNestedFieldSmart({
                    keyOrId: params.conversationkeyOrId,
                    field: "metadata" as const,
                    nestedKey: "availableTools",
                    value: params.value,
                })
            );
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId: params.messagekeyOrId,
                    field: "metadata" as const,
                    nestedKey: "availableTools",
                    value: params.value,
                })
            );
        },

        updateModAssistantContext: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: string }) => {
            dispatch(
                conversationActions.updateNestedFieldSmart({
                    keyOrId: params.conversationkeyOrId,
                    field: "metadata" as const,
                    nestedKey: "ModAssistantContext",
                    value: params.value,
                })
            );
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId: params.messagekeyOrId,
                    field: "metadata" as const,
                    nestedKey: "ModAssistantContext",
                    value: params.value,
                })
            );
        },

        updateModUserContext: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: string }) => {
            dispatch(
                conversationActions.updateNestedFieldSmart({
                    keyOrId: params.conversationkeyOrId,
                    field: "metadata" as const,
                    nestedKey: "ModUserContext",
                    value: params.value,
                })
            );
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId: params.messagekeyOrId,
                    field: "metadata" as const,
                    nestedKey: "ModUserContext",
                    value: params.value,
                })
            );
        },
        updateMultipleNestedFields: (params: {
            conversationkeyOrId: string;
            messagekeyOrId: string;
            updates: Array<{ field: EntityFieldKeys<"conversation">; nestedKey: string; value: any }>;
        }) => {
            dispatch(conversationActions.updateMultipleNestedFieldsSmart({ keyOrId: params.conversationkeyOrId, updates: params.updates }));
            dispatch(messageActions.updateMultipleNestedFieldsSmart({ keyOrId: params.messagekeyOrId, updates: params.updates }));
        },

        updateFiles: (params: { keyOrId: string; value: string[] }) => {
            const fullParams = { keyOrId: params.keyOrId, field: "metadata" as const, nestedKey: "files", value: params.value };
            dispatch(messageActions.updateNestedFieldSmart(fullParams));
        },

        setSocketEventName: (params: { eventName: string }) => {
            dispatch(conversationActions.setSocketEventName({ socketEventName: params.eventName }));
            dispatch(messageActions.setSocketEventName({ socketEventName: params.eventName }));
        },

        updateConversationMetadataFieldSmart: (params: { keyOrId: string; nestedKey: string; value: any }) =>
            dispatch(
                conversationActions.updateNestedFieldSmart({
                    keyOrId: params.keyOrId,
                    field: "metadata",
                    nestedKey: params.nestedKey,
                    value: params.value,
                })
            ),

        updateMessageMetadataFieldSmart: (params: { keyOrId: string; nestedKey: string; value: any }) =>
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId: params.keyOrId,
                    field: "metadata",
                    nestedKey: params.nestedKey,
                    value: params.value,
                })
            ),

        directUpdateConversation: (params: { matrxRecordId: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            dispatch(conversationActions.directUpdateRecord(params)),

        directUpdateConversationLabel: (params: { matrxRecordId: MatrxRecordId; label: string }) =>
            dispatch(conversationActions.directUpdateRecord({ matrxRecordId: params.matrxRecordId, data: { label: params.label } })),

        directUpdateConversationIsPublic: (params: { matrxRecordId: MatrxRecordId; isPublic: boolean }) =>
            dispatch(conversationActions.directUpdateRecord({ matrxRecordId: params.matrxRecordId, data: { isPublic: params.isPublic } })),

        directUpdateConversationMetadata: (params: { matrxRecordId: MatrxRecordId; metadata: any }) =>
            dispatch(conversationActions.directUpdateRecord({ matrxRecordId: params.matrxRecordId, data: { metadata: params.metadata } })),

        directUpdateMessage: (params: { matrxRecordId: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            dispatch(messageActions.directUpdateRecord(params)),

        updateConversation: (params: { matrxRecordId: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            dispatch(conversationActions.updateRecord(params)),

        updateMessage: (params: { matrxRecordId: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            dispatch(messageActions.updateRecord(params)),

        updateUnsavedConversationField: (params: { recordId: MatrxRecordId; field: string; value: any }) =>
            dispatch(conversationActions.updateUnsavedField(params)),

        updateUnsavedMessageField: (params: { recordId: MatrxRecordId; field: string; value: any }) =>
            dispatch(messageActions.updateUnsavedField(params)),

        updateUnsavedConversationFields: (params: { updates: Array<{ recordId: MatrxRecordId; field: string; value: any }> }) =>
            dispatch(conversationActions.updateUnsavedFields(params)),

        updateUnsavedMessageFields: (params: { updates: Array<{ recordId: MatrxRecordId; field: string; value: any }> }) =>
            dispatch(messageActions.updateUnsavedFields(params)),

        startConversationUpdate: () => dispatch(conversationActions.startRecordUpdate()),
        startMessageUpdate: () => dispatch(messageActions.startRecordUpdate()),

        startConversationUpdateById: (recordId: MatrxRecordId) => dispatch(conversationActions.startRecordUpdateById(recordId)),
        startMessageUpdateById: (recordId: MatrxRecordId) => dispatch(messageActions.startRecordUpdateById(recordId)),

        deleteConversation: (params: { matrxRecordId: MatrxRecordId }) => dispatch(conversationActions.deleteRecord(params)),

        deleteMessage: (params: { matrxRecordId: MatrxRecordId }) => dispatch(messageActions.deleteRecord(params)),
    };
};

export const getChatActionsWithThunks = () => {
    const conversationState = getEntitySlice("conversation");
    const messageState = getEntitySlice("message");
    const aiModelState = getEntitySlice("aiModel");
    const conversationActions = conversationState.actions;
    const messageActions = messageState.actions;
    const aiModelActions = aiModelState.actions;
    const parentEntityField = "conversationId";

    return {
        // Initial setup (run once, could be moved elsewhere if not needed per call)
        initialize: () => (dispatch: AppDispatch) => {
            dispatch(conversationActions.fetchAll({})); // Change to make this paginated and fetch only the last 10 added by date and figure out how to include the one from the route.
            dispatch(aiModelActions.fetchAll({}));
            dispatch(messageActions.setParentEntityField(parentEntityField));
            dispatch(messageActions.setRuntimeFilters(DEFAULT_MESSAGE_RUNTIME_FILTERS));
            dispatch(messageActions.setRuntimeSort(DEFAULT_MESSAGE_RUNTIME_SORT));
            console.log("INITIALIZE Dispatched Initialization Action.");
        },

        updateConversationCustomData: (params: { keyOrId: string; customData: Record<string, unknown> }) => (dispatch: AppDispatch) => {
            dispatch(conversationActions.updateCustomDataSmart(params));
        },

        updateMessageCustomData: (params: { keyOrId: string; customData: Record<string, unknown> }) => (dispatch: AppDispatch) => {
            dispatch(messageActions.updateCustomDataSmart(params));
        },

        updateNextOrderData:
            (params: { keyOrId?: string; nextDisplayOrderToUse?: number; nextSystemOrderToUse?: number; isNewChat?: boolean }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                console.log("UPDATE NEXT ORDER DATA", params);

                const convKeyOrId = params.keyOrId ?? getState().entities["conversation"].selection.activeRecord;

                const activeMessageRecordKey = getState().entities["message"].selection.activeRecord;
                const activeMessageRecord = getState().entities["message"].records[activeMessageRecordKey] as Message;
                const nextDisplayOrder = params.nextDisplayOrderToUse ?? activeMessageRecord.displayOrder + 2;
                const nextSystemOrder = params.nextSystemOrderToUse ?? activeMessageRecord.systemOrder + 2;

                if (!convKeyOrId || !nextDisplayOrder || !nextSystemOrder) {
                    console.warn("UPDATE NEXT ORDER DATA: Missing required parameters. Received Params:", params);
                    console.log(
                        "- Attempted to use state but failed with activeMessageRecordKey: ",
                        activeMessageRecordKey,
                        "and nextDisplayOrder: ",
                        nextDisplayOrder,
                        "and nextSystemOrder: ",
                        nextSystemOrder
                    );
                    return;
                }

                const customDataParams = {
                    keyOrId: convKeyOrId,
                    customData: {
                        nextDisplayOrderToUse: nextDisplayOrder,
                        nextSystemOrderToUse: nextSystemOrder,
                        isNewChat: params.isNewChat ?? false,
                    },
                };

                dispatch(conversationActions.updateCustomDataSmart(customDataParams));
            },

        fetchAllConversations: () => (dispatch: AppDispatch) => {
            dispatch(conversationActions.fetchAll({}));
        },

        fetchRelatedMessageForConversation: (params: { conversationId: string }) => (dispatch: AppDispatch) => {
            dispatch(
                fetchRelatedRecordsThunk({
                    childEntity: "message",
                    parentId: params.conversationId,
                    childReferenceField: "conversation_id",
                    additionalFilters: [
                        { field: "display_order", operator: "neq", value: 0 },
                        { field: "role", operator: "neq", value: "system" },
                    ],
                    sort: { field: "display_order", direction: "asc" },
                    maxCount: 100,
                })
            );
        },
        fetchRelatedRecordsForActiveConversation: () => (dispatch: AppDispatch, getState: () => RootState) => {
            const activeConversationId = getState().entities["conversation"].selection.activeRecord;
            if (!activeConversationId) return;
            dispatch(
                fetchRelatedRecordsThunk({
                    childEntity: "message",
                    parentId: activeConversationId,
                    childReferenceField: "conversation_id",
                    additionalFilters: [
                        { field: "display_order", operator: "neq", value: 0 },
                        { field: "role", operator: "neq", value: "system" },
                    ],
                    sort: { field: "display_order", direction: "asc" },
                    maxCount: 100,
                })
            );
        },

        setStandardMessageFilterAndSort: () => (dispatch: AppDispatch) => {
            dispatch(messageActions.setRuntimeFilters(DEFAULT_MESSAGE_RUNTIME_FILTERS));
            dispatch(messageActions.setRuntimeSort(DEFAULT_MESSAGE_RUNTIME_SORT));
        },

        createMessageForConversation:
            (params: {
                conversationId: string;
                displayOrder: number;
                systemOrder: number;
                messageOverrides?: Partial<Message>;
                messageContent?: string;
            }) =>
            (dispatch: AppDispatch) =>
                dispatch(
                    createMessageForConversation({
                        conversationId: params.conversationId,
                        displayOrder: params.displayOrder,
                        systemOrder: params.systemOrder,
                        messageOverrides: params.messageOverrides,
                        messageContent: params.messageContent,
                    })
                ),
        createMessageForActiveConversation:
            (params: {
                conversationId: string;
                displayOrder: number;
                systemOrder: number;
                messageOverrides?: Partial<Message>;
                messageContent?: string;
            }) =>
            (dispatch: AppDispatch) =>
                dispatch(
                    createMessageForConversation({
                        conversationId: params.conversationId,
                        displayOrder: params.displayOrder,
                        systemOrder: params.systemOrder,
                        messageOverrides: params.messageOverrides,
                        messageContent: params.messageContent,
                    })
                ),

        saveActiveUnsavedMessage: (params: { messageTempId?: MatrxRecordId }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const activeMessageRecordKey = params.messageTempId ?? getState().entities["message"].selection.activeRecord;
            if (!activeMessageRecordKey) return;
            dispatch(saveMessageThunk({ messageTempId: activeMessageRecordKey }));
        },

        setExternalConversationLoading: (loading: boolean) => (dispatch: AppDispatch) => {
            dispatch(conversationActions.setExternalLoading(loading));
        },

        setExternalMessageLoading: (loading: boolean) => (dispatch: AppDispatch) => {
            dispatch(messageActions.setExternalLoading(loading));
        },

        setActiveConversation: (conversationId: string) => (dispatch: AppDispatch) => {
            // Explicit ID required, no optional pattern here
            const matrxRecordId = `id:${conversationId}`;
            dispatch(conversationActions.fetchOneWithFkIfk({ matrxRecordId }));
            dispatch(conversationActions.setActiveRecord(matrxRecordId));
            dispatch(messageActions.setActiveParentId(matrxRecordId));
            dispatch(messageActions.addRuntimeFilter({ field: parentEntityField, operator: "eq", value: matrxRecordId }));
        },

        coordinateActiveConversationAndMessageFetch: (conversationId: string) => (dispatch: AppDispatch) => {
            const matrxRecordId = `id:${conversationId}`;
            dispatch(conversationActions.fetchOne({ matrxRecordId }));
            dispatch(conversationActions.setActiveRecord(matrxRecordId));
            dispatch(fetchRelatedMessagesThunk({ conversationId }));
        },

        fetchMessagesForActiveConversation: () => (dispatch: AppDispatch, getState: () => RootState) => {
            const activeConversationKey = getState().entities["conversation"].selection.activeRecord;
            if (!activeConversationKey) {
                console.warn("FETCH MESSAGES FOR ACTIVE CONVERSATION: No active conversation found");
                return;
            }
            const activeConversation = getState().entities["conversation"].records[activeConversationKey] as Conversation;
            if (!activeConversation) {
                console.warn("FETCH MESSAGES FOR ACTIVE CONVERSATION: No active conversation found");
                return;
            }
            const activeConversationId = activeConversation.id;
            dispatch(fetchRelatedMessagesThunk({ conversationId: activeConversationId }));
        },

        setActiveMessage: (messageId: string) => (dispatch: AppDispatch) => {
            dispatch(messageActions.setActiveRecord(`id:${messageId}`));
        },

        createConversationAndMessage: (params: { messageContent?: string }) => (dispatch: AppDispatch) => {
            const content = params.messageContent ?? "";
            dispatch(createConversationAndMessage({ messageContent: content }));
        },

        saveConversationAndMessage:
            (params: { conversationTempId?: MatrxRecordId; messageTempId?: MatrxRecordId }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationTempId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messageTempId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;

                return dispatch(saveConversationAndMessage({ conversationTempId: convKeyOrId, messageTempId: msgKeyOrId }));
            },

        updateConversationFieldSmart:
            (params: { keyOrId?: string; field: string; value: any }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = params.keyOrId ?? getState().entities["conversation"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(conversationActions.updateFieldSmart({ keyOrId, ...params }));
            },

        updateMessageFieldSmart:
            (params: { keyOrId?: string; field: string; value: any }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = params.keyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(messageActions.updateFieldSmart({ keyOrId, ...params }));
            },

        updateMessageContent: (params: { keyOrId?: string; value: string }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const keyOrId = params.keyOrId ?? getState().entities["message"].selection.activeRecord;
            if (!keyOrId) {
                console.warn("CHAT ACTIONS THUNK - UPDATE MESSAGE CONTENT: Key or Id was not found");
                return;
            }
            dispatch(messageActions.updateFieldSmart({ keyOrId, field: "content", value: params.value }));
        },

        updateNestedConversationFieldSmart:
            (params: { keyOrId?: string; field: EntityFieldKeys<"conversation">; nestedKey: string; value: any }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = params.keyOrId ?? getState().entities["conversation"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(conversationActions.updateNestedFieldSmart({ keyOrId, ...params }));
            },

        updateNestedMessageFieldSmart:
            (params: { keyOrId?: string; field: EntityFieldKeys<"message">; nestedKey: string; value: any }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = params.keyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(messageActions.updateNestedFieldSmart({ keyOrId, ...params }));
            },

        updateModel:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; value: any }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "currentModel",
                        value: params.value,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "currentModel",
                        value: params.value,
                    })
                );
            },

        updateEndpoint:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; value: any }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "currentEndpoint",
                        value: params.value,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "currentEndpoint",
                        value: params.value,
                    })
                );
            },

        updateMode:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; value: any }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "currentMode",
                        value: params.value,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "currentMode",
                        value: params.value,
                    })
                );
            },

            updateSelectedRecipe:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; recipeId: string }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "selectedRecipe",
                        value: params.recipeId,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "selectedRecipe",
                        value: params.recipeId,
                    })
                );
            },


        updateTechStack:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; libraries: string[] }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "techStack",
                        value: params.libraries,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "techStack",
                        value: params.libraries,
                    })
                );
            },

        updateBrokerValues:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; value: Record<string, unknown> }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "brokerValues",
                        value: params.value,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "brokerValues",
                        value: params.value,
                    })
                );
            },

        updateAvailableTools:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; value: string[] }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "availableTools",
                        value: params.value,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "availableTools",
                        value: params.value,
                    })
                );
            },

        updateModAssistantContext:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; value: string }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "ModAssistantContext",
                        value: params.value,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "ModAssistantContext",
                        value: params.value,
                    })
                );
            },

        updateModUserContext:
            (params: { conversationkeyOrId?: string; messagekeyOrId?: string; value: string }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId: convKeyOrId,
                        field: "metadata",
                        nestedKey: "ModUserContext",
                        value: params.value,
                    })
                );
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId: msgKeyOrId,
                        field: "metadata",
                        nestedKey: "ModUserContext",
                        value: params.value,
                    })
                );
            },

        updateMultipleNestedFields:
            (params: {
                conversationkeyOrId?: string;
                messagekeyOrId?: string;
                updates: Array<{ field: EntityFieldKeys<"conversation">; nestedKey: string; value: any }>;
            }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const convKeyOrId = params.conversationkeyOrId ?? getState().entities["conversation"].selection.activeRecord;
                const msgKeyOrId = params.messagekeyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!convKeyOrId || !msgKeyOrId) return;
                dispatch(conversationActions.updateMultipleNestedFieldsSmart({ keyOrId: convKeyOrId, updates: params.updates }));
                dispatch(messageActions.updateMultipleNestedFieldsSmart({ keyOrId: msgKeyOrId, updates: params.updates }));
            },

        updateFiles: (params: { keyOrId?: string; value: string[] }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const keyOrId = params.keyOrId ?? getState().entities["message"].selection.activeRecord;
            console.log("[CHAT ACTIONS THUNK] updating files", params.value);
            if (!keyOrId) return;
            dispatch(
                messageActions.updateNestedFieldSmart({
                    keyOrId,
                    field: "metadata",
                    nestedKey: "files",
                    value: params.value,
                })
            );
        },

        setSocketEventName: (params: { eventName: string }) => (dispatch: AppDispatch) => {
            dispatch(conversationActions.setSocketEventName({ socketEventName: params.eventName }));
            dispatch(messageActions.setSocketEventName({ socketEventName: params.eventName }));
        },

        setIsStreaming: () => (dispatch: AppDispatch) => {
            console.log("[CHAT ACTIONS THUNK] setting isStreaming");
            dispatch(conversationActions.updateCustomDataSmart({ customData: { isStreaming: true } }));
            dispatch(messageActions.updateCustomDataSmart({ customData: { isStreaming: true } }));
        },

        setIsNotStreaming: () => (dispatch: AppDispatch) => {
            console.log("[CHAT ACTIONS THUNK] setting isNotStreaming");
            dispatch(conversationActions.updateCustomDataSmart({ customData: { isStreaming: false } }));
            dispatch(messageActions.updateCustomDataSmart({ customData: { isStreaming: false } }));
        },

        updateConversationMetadataFieldSmart:
            (params: { keyOrId?: string; nestedKey: string; value: any }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = params.keyOrId ?? getState().entities["conversation"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(
                    conversationActions.updateNestedFieldSmart({
                        keyOrId,
                        field: "metadata",
                        nestedKey: params.nestedKey,
                        value: params.value,
                    })
                );
            },

        updateMessageMetadataFieldSmart:
            (params: { keyOrId?: string; nestedKey: string; value: any }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const keyOrId = params.keyOrId ?? getState().entities["message"].selection.activeRecord;
                if (!keyOrId) return;
                dispatch(
                    messageActions.updateNestedFieldSmart({
                        keyOrId,
                        field: "metadata",
                        nestedKey: params.nestedKey,
                        value: params.value,
                    })
                );
            },

        directUpdateConversation:
            (params: { matrxRecordId?: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = params.matrxRecordId ?? getState().entities["conversation"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(conversationActions.directUpdateRecord({ matrxRecordId, ...params }));
            },

        directUpdateConversationLabel:
            (params: { matrxRecordId?: MatrxRecordId; label: string }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = params.matrxRecordId ?? getState().entities["conversation"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(conversationActions.directUpdateRecord({ matrxRecordId, data: { label: params.label } }));
            },

        directUpdateConversationIsPublic:
            (params: { matrxRecordId?: MatrxRecordId; isPublic: boolean }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = params.matrxRecordId ?? getState().entities["conversation"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(conversationActions.directUpdateRecord({ matrxRecordId, data: { isPublic: params.isPublic } }));
            },

        directUpdateConversationMetadata:
            (params: { matrxRecordId?: MatrxRecordId; metadata: any }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = params.matrxRecordId ?? getState().entities["conversation"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(conversationActions.directUpdateRecord({ matrxRecordId, data: { metadata: params.metadata } }));
            },

        directUpdateMessage:
            (params: { matrxRecordId?: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = params.matrxRecordId ?? getState().entities["message"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(messageActions.directUpdateRecord({ matrxRecordId, ...params }));
            },

        updateConversation:
            (params: { matrxRecordId?: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = params.matrxRecordId ?? getState().entities["conversation"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(conversationActions.updateRecord({ matrxRecordId, ...params }));
            },

        updateMessage:
            (params: { matrxRecordId?: MatrxRecordId; data: Record<string, any>; callbackId?: string }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const matrxRecordId = params.matrxRecordId ?? getState().entities["message"].selection.activeRecord;
                if (!matrxRecordId) return;
                dispatch(messageActions.updateRecord({ matrxRecordId, ...params }));
            },

        updateUnsavedConversationField:
            (params: { recordId?: MatrxRecordId; field: string; value: any }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const recordId = params.recordId ?? getState().entities["conversation"].selection.activeRecord;
                if (!recordId) return;
                dispatch(conversationActions.updateUnsavedField({ recordId, ...params }));
            },

        updateUnsavedMessageField:
            (params: { recordId?: MatrxRecordId; field: string; value: any }) => (dispatch: AppDispatch, getState: () => RootState) => {
                const recordId = params.recordId ?? getState().entities["message"].selection.activeRecord;
                if (!recordId) return;
                dispatch(messageActions.updateUnsavedField({ recordId, ...params }));
            },

        updateUnsavedConversationFields:
            (params: { updates: Array<{ recordId?: MatrxRecordId; field: string; value: any }> }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const activeRecord = getState().entities["conversation"].selection.activeRecord;
                const updatesWithRecordId = params.updates.map((update) => ({
                    recordId: update.recordId ?? activeRecord,
                    field: update.field,
                    value: update.value,
                }));
                if (!updatesWithRecordId.every((update) => update.recordId)) return;
                dispatch(conversationActions.updateUnsavedFields({ updates: updatesWithRecordId }));
            },

        updateUnsavedMessageFields:
            (params: { updates: Array<{ recordId?: MatrxRecordId; field: string; value: any }> }) =>
            (dispatch: AppDispatch, getState: () => RootState) => {
                const activeRecord = getState().entities["message"].selection.activeRecord;
                const updatesWithRecordId = params.updates.map((update) => ({
                    recordId: update.recordId ?? activeRecord,
                    field: update.field,
                    value: update.value,
                }));
                if (!updatesWithRecordId.every((update) => update.recordId)) return;
                dispatch(messageActions.updateUnsavedFields({ updates: updatesWithRecordId }));
            },

        startConversationUpdate: () => (dispatch: AppDispatch) => {
            dispatch(conversationActions.startRecordUpdate());
        },

        startMessageUpdate: () => (dispatch: AppDispatch) => {
            dispatch(messageActions.startRecordUpdate());
        },

        startConversationUpdateById: (recordId?: MatrxRecordId) => (dispatch: AppDispatch, getState: () => RootState) => {
            const id = recordId ?? getState().entities["conversation"].selection.activeRecord;
            if (!id) return;
            dispatch(conversationActions.startRecordUpdateById(id));
        },

        startMessageUpdateById: (recordId?: MatrxRecordId) => (dispatch: AppDispatch, getState: () => RootState) => {
            const id = recordId ?? getState().entities["message"].selection.activeRecord;
            if (!id) return;
            dispatch(messageActions.startRecordUpdateById(id));
        },

        deleteConversation: (params: { matrxRecordId?: MatrxRecordId }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const matrxRecordId = params.matrxRecordId ?? getState().entities["conversation"].selection.activeRecord;
            if (!matrxRecordId) return;
            dispatch(conversationActions.deleteRecord({ matrxRecordId }));
        },

        deleteMessage: (params: { matrxRecordId?: MatrxRecordId }) => (dispatch: AppDispatch, getState: () => RootState) => {
            const matrxRecordId = params.matrxRecordId ?? getState().entities["message"].selection.activeRecord;
            if (!matrxRecordId) return;
            dispatch(messageActions.deleteRecord({ matrxRecordId }));
        },
    };
};

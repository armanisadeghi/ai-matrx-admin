import {  EntityFieldKeys, MatrxRecordId } from "@/types/entityTypes";
import { AppDispatch } from "@/lib/redux";
import { getEntitySlice } from "../entitySlice";
import { createConversationAndMessage, saveConversationAndMessage } from "../../features/aiChats/thunks/entity/createConversationAndMessage";


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

    const parentEntityField = "conversationId";
    const conversationActions = getEntitySlice("conversation").actions;
    const messageActions = getEntitySlice("message").actions;

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

        updateConversationFieldSmart: (params: { keyOrId: string; field: string; value: any }) =>
            dispatch(conversationActions.updateFieldSmart(params)),

        updateMessageFieldSmart: (params: { keyOrId: string; field: string; value: any }) =>
            dispatch(messageActions.updateFieldSmart(params)),

        updateNestedConversationFieldSmart: (params: { keyOrId: string; field: EntityFieldKeys<"conversation">; nestedKey: string; value: any }) =>
            dispatch(conversationActions.updateNestedFieldSmart(params)),

        updateNestedMessageFieldSmart: (params: { keyOrId: string; field: EntityFieldKeys<"message">; nestedKey: string; value: any }) =>
            dispatch(messageActions.updateNestedFieldSmart(params)),

        updateModel: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: any }) => {
            dispatch(conversationActions.updateNestedFieldSmart({ keyOrId: params.conversationkeyOrId, field: "metadata" as const, nestedKey: "modelKey", value: params.value }));
            dispatch(messageActions.updateNestedFieldSmart({ keyOrId: params.messagekeyOrId, field: "metadata" as const, nestedKey: "modelKey", value: params.value }));
        },

        updateEndpoint: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: any }) => {
            dispatch(conversationActions.updateNestedFieldSmart({ keyOrId: params.conversationkeyOrId, field: "metadata" as const, nestedKey: "currentEndpoint", value: params.value }));
            dispatch(messageActions.updateNestedFieldSmart({ keyOrId: params.messagekeyOrId, field: "metadata" as const, nestedKey: "currentEndpoint", value: params.value }));
        },

        updateMode: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: any }) => {
            dispatch(conversationActions.updateNestedFieldSmart({ keyOrId: params.conversationkeyOrId, field: "metadata" as const, nestedKey: "currentMode", value: params.value }));
            dispatch(messageActions.updateNestedFieldSmart({ keyOrId: params.messagekeyOrId, field: "metadata" as const, nestedKey: "currentMode", value: params.value }));
        },

        updateBrokerValues: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: Record<string, unknown> }) => {
            dispatch(conversationActions.updateNestedFieldSmart({ keyOrId: params.conversationkeyOrId, field: "metadata" as const, nestedKey: "brokerValues", value: params.value }));
            dispatch(messageActions.updateNestedFieldSmart({ keyOrId: params.messagekeyOrId, field: "metadata" as const, nestedKey: "brokerValues", value: params.value }));
        },

        updateAvailableTools: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: string[] }) => {
            dispatch(conversationActions.updateNestedFieldSmart({ keyOrId: params.conversationkeyOrId, field: "metadata" as const, nestedKey: "availableTools", value: params.value }));
            dispatch(messageActions.updateNestedFieldSmart({ keyOrId: params.messagekeyOrId, field: "metadata" as const, nestedKey: "availableTools", value: params.value }));
        },

        updateModAssistantContext: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: string }) => {
            dispatch(conversationActions.updateNestedFieldSmart({ keyOrId: params.conversationkeyOrId, field: "metadata" as const, nestedKey: "ModAssistantContext", value: params.value }));
            dispatch(messageActions.updateNestedFieldSmart({ keyOrId: params.messagekeyOrId, field: "metadata" as const, nestedKey: "ModAssistantContext", value: params.value }));
        },

        updateModUserContext: (params: { conversationkeyOrId: string; messagekeyOrId: string; value: string }) => {
            dispatch(conversationActions.updateNestedFieldSmart({ keyOrId: params.conversationkeyOrId, field: "metadata" as const, nestedKey: "ModUserContext", value: params.value }));
            dispatch(messageActions.updateNestedFieldSmart({ keyOrId: params.messagekeyOrId, field: "metadata" as const, nestedKey: "ModUserContext", value: params.value }));
        },
        updateMultipleNestedFields: (params: { conversationkeyOrId: string; messagekeyOrId: string; updates: Array<{ field: EntityFieldKeys<"conversation">; nestedKey: string; value: any }> }) => {
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
            dispatch(conversationActions.updateNestedFieldSmart({ keyOrId: params.keyOrId, field: "metadata", nestedKey: params.nestedKey, value: params.value })),

        updateMessageMetadataFieldSmart: (params: { keyOrId: string; nestedKey: string; value: any }) =>
            dispatch(messageActions.updateNestedFieldSmart({ keyOrId: params.keyOrId, field: "metadata", nestedKey: params.nestedKey, value: params.value })),



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




        deleteConversation: (params: { matrxRecordId: MatrxRecordId }) =>
            dispatch(conversationActions.deleteRecord(params)),

        deleteMessage: (params: { matrxRecordId: MatrxRecordId }) =>
            dispatch(messageActions.deleteRecord(params)),
    };
};


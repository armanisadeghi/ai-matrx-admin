import { useAiModelWithFetch } from "@/lib/redux/entity/hooks/useAllData";
import { useCallback, useEffect } from "react";
import { getChatActions, getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { createConversationSelectors, createMessageSelectors, useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux";
import { ConversationRecordWithKey, MessageRecordWithKey } from "@/types/AutomationSchemaTypes";
import { ConversationMetadata, MessageMetadata } from "@/types/chat/chat.types";
import { useFileManagement } from "./useFileManagement";
import { entityUpdateActionsWithThunks } from "@/lib/redux/entity/slices/updateReducers";

export const useChatBasics = () => {
    const { aiModelRecords: models, fetchAll: fetchModels } = useAiModelWithFetch();

    const chatActions = getChatActionsWithThunks();


    const store = useAppStore();
    const dispatch = useAppDispatch();
    const conversationSelectors = createConversationSelectors;
    const messageSelectors = createMessageSelectors;
    const actions = getChatActions(dispatch);
    const activeConversationRecord = useAppSelector(conversationSelectors.selectActiveRecord) as ConversationRecordWithKey
    const conversationRecordKey = activeConversationRecord?.matrxRecordId;
    const conversationId = activeConversationRecord?.id;
    const activeMessageRecord = useAppSelector(messageSelectors.selectActiveRecord) as MessageRecordWithKey
    const messageRecordKey = activeMessageRecord?.matrxRecordId;
    const messageId = activeMessageRecord?.id;
    const messageMetadata = activeMessageRecord?.metadata as MessageMetadata;
    const conversationMetadata = activeConversationRecord?.metadata as ConversationMetadata;    

    const fileManager = useFileManagement({
        onFilesUpdate: (files) => actions.updateFiles({ keyOrId: messageRecordKey, value: files.map((file) => file.url) }),
    });

    console.log("useChatBasics", {
        conversationRecordKey,
        conversationId,
        messageRecordKey,
        messageId,
    });

    const fetchAllModels = useCallback(() => {
        fetchModels();
    }, [fetchModels]);




    return {
        models,
        fetchAllModels,
        fileManager,
        conversationSelectors,
        messageSelectors,
        actions,
        activeConversationRecord,
        conversationRecordKey,
        conversationId,
        activeMessageRecord,
        messageRecordKey,
        messageId,
        messageMetadata,
        conversationMetadata,
    };
};

export default useChatBasics;

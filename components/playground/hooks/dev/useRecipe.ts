import { createRecordKey, GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { RecipeMessageRecordWithKey, AiAgentRecordWithKey, MessageTemplateDataRequired, AiSettingsDataRequired, RecipeDataRequired } from '@/types/AutomationSchemaTypes';
import React, { useEffect, useCallback } from 'react';

export function useRecipe() {
    const dispatch = useAppDispatch();

    const recipeEntity = useEntityTools('recipe');
    const recipeMessageEntity = useEntityTools('recipeMessage');
    const messageTemplateEntity = useEntityTools('messageTemplate');
    const aiAgentEntity = useEntityTools('aiAgent');
    const aiSettingsEntity = useEntityTools('aiSettings');

    const activeRecipeRecord = useAppSelector(recipeEntity.selectors.selectActiveRecord) as RecipeDataRequired;
    const activeRecipeFieldId = activeRecipeRecord?.id;

    // Messages
    const recipeMessageRecords = useAppSelector((state) => recipeMessageEntity.selectors.selectRecordsByFieldValue(state,'recipeId', activeRecipeFieldId)
    ) as RecipeMessageRecordWithKey[];

    const matchingMessageIds = React.useMemo(
        () => recipeMessageRecords.filter((message) => message?.messageId != null).map((message) => message.messageId),
        [recipeMessageRecords]
    );
    const messageMatrxIds = useAppSelector((state) => messageTemplateEntity.selectors.selectMatrxRecordIdsBySimpleKeys(state, matchingMessageIds));
    const matchingMessages = useAppSelector((state) =>
        messageTemplateEntity.selectors.selectRecordsByKeys(state, messageMatrxIds)
    ) as MessageTemplateDataRequired[];

    // AI Agents & Settings
    const aiAgentRecords = useAppSelector((state) => aiAgentEntity.selectors.selectRecordsByFieldValue(state,'recipeId', activeRecipeFieldId)) as AiAgentRecordWithKey[];

    const aiAgentMetadata = useAppSelector(aiAgentEntity.selectors.selectEntityMetadata);

    const firstAgentRecordKey = React.useMemo(() => {
        if (aiAgentRecords.length > 0) {
            return createRecordKey(aiAgentMetadata.primaryKeyMetadata, { id: aiAgentRecords[0].id });
        }
        return null;
    }, [aiAgentRecords, aiAgentMetadata]);

    // Set first agent as active whenever it changes
    useEffect(() => {
        if (firstAgentRecordKey) {
            dispatch(aiAgentEntity.actions.setActiveRecord(firstAgentRecordKey));
        }
    }, [firstAgentRecordKey, activeRecipeRecord, dispatch]);

    const fetchMessagesPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: messageMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [messageMatrxIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (activeRecipeFieldId && messageMatrxIds.length > 0) {
            dispatch(messageTemplateEntity.actions.getOrFetchSelectedRecords(fetchMessagesPayload));
        }
    }, [dispatch, activeRecipeFieldId, messageTemplateEntity.actions, aiSettingsEntity.actions, messageMatrxIds, fetchMessagesPayload]);

    useEffect(() => {
        if (activeRecipeFieldId) {
            fetchDependentRecords();
        }
    }, [fetchDependentRecords, activeRecipeFieldId, recipeMessageRecords]);

    return {
        recipeMessageRecords,
        matchingMessages,
        aiAgentRecords,
        matchingMessageIds,
        activeRecipeFieldId,
    };
}

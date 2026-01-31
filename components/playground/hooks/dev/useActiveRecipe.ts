import { GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import {
    RecipeMessageDataRequired,
    AiAgentDataRequired,
    MessageBrokerDataRequired,
    MessageTemplateDataRequired,
    AiSettingsDataRequired,
    DataBrokerDataRequired,
    RecipeDataRequired,
    RecipeMessageRecordWithKey,
    AiAgentRecordWithKey,
    AiSettingsRecordWithKey,
    MessageBrokerRecordWithKey,
    DataBrokerRecordWithKey,
} from '@/types/AutomationSchemaTypes';
import React, { useEffect, useCallback } from 'react';

export function useActiveRecipe() {
    const dispatch = useAppDispatch();

    const recipe = useEntityTools('recipe');
    const recipeMessage = useEntityTools('recipeMessage');
    const message = useEntityTools('messageTemplate');
    const messageBroker = useEntityTools('messageBroker');
    const dataBroker = useEntityTools('dataBroker');
    const aiAgent = useEntityTools('aiAgent');
    const aiSettings = useEntityTools('aiSettings');

    const activeRecipeRecord = useAppSelector(recipe.selectors.selectActiveRecord) as RecipeDataRequired;
    const activeRecipeId = activeRecipeRecord?.id;


    // Messages
    const recipeMessages = useAppSelector((state) => recipeMessage.selectors.selectRecordsByFieldValue(state,'recipeId', activeRecipeId)) as RecipeMessageRecordWithKey[];

    const matchingMessageIds = React.useMemo(
        () => recipeMessages.filter((message) => message?.messageId != null).map((message) => message.messageId),
        [recipeMessages]
    );
    const messageMatrxIds = useAppSelector((state) => message.selectors.selectMatrxRecordIdsBySimpleKeys(state, matchingMessageIds));
    const matchingMessages = useAppSelector((state) => message.selectors.selectRecordsByKeys(state, messageMatrxIds)) as MessageTemplateDataRequired[];


    // AI Agents & Settings
    const aiAgents = useAppSelector((state) => aiAgent.selectors.selectRecordsByFieldValue(state,'recipeId', activeRecipeId)) as AiAgentRecordWithKey[];

    const matchingAiSettingsIds = React.useMemo(
        () => aiAgents.filter((agent) => agent?.aiSettingsId != null).map((agent) => agent.aiSettingsId),
        [aiAgents]
    );
    const settingsMatrxIds = useAppSelector((state) => aiSettings.selectors.selectMatrxRecordIdsBySimpleKeys(state, matchingAiSettingsIds));
    const matchingAiSettings = useAppSelector((state) => aiSettings.selectors.selectRecordsByKeys(state, settingsMatrxIds)) as AiSettingsDataRequired[];


    const aiAgentRecords = useAppSelector((state) => aiAgent.selectors.selectRecordsByFieldValue(state,'recipeId', activeRecipeId)) as AiAgentRecordWithKey[];

    // Message Brokers and Data Brokers
    const messageBrokers = useAppSelector((state) => messageBroker.selectors.selectRecordsByFieldValue(state,'messageId', matchingMessageIds)) as MessageBrokerRecordWithKey[];
    
    const matchingBrokerIds = React.useMemo(
        () => messageBrokers.filter((broker) => broker?.brokerId != null).map((broker) => broker.brokerId),
        [messageBrokers]
    );
    const brokerMatrxIds = useAppSelector((state) => dataBroker.selectors.selectMatrxRecordIdsBySimpleKeys(state, matchingBrokerIds));
    const matchingBrokers = useAppSelector((state) => dataBroker.selectors.selectRecordsByKeys(state, brokerMatrxIds)) as DataBrokerRecordWithKey[];

    const fetchMessagesPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: messageMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [messageMatrxIds]
    );

    const fetchSettingsPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: settingsMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [settingsMatrxIds]
    );

    const fetchBrokersPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: brokerMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [brokerMatrxIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (activeRecipeId && messageMatrxIds.length > 0) {
            dispatch(message.actions.getOrFetchSelectedRecords(fetchMessagesPayload));
        }
        if (settingsMatrxIds.length > 0) {
            dispatch(aiSettings.actions.getOrFetchSelectedRecords(fetchSettingsPayload));
        }
        if (brokerMatrxIds.length > 0) {
            dispatch(dataBroker.actions.getOrFetchSelectedRecords(fetchBrokersPayload));
        }
    }, [
        dispatch,
        activeRecipeId,
        message.actions,
        aiSettings.actions,
        dataBroker.actions,
        messageMatrxIds,
        settingsMatrxIds,
        brokerMatrxIds,
        fetchMessagesPayload,
        fetchSettingsPayload,
        fetchBrokersPayload,
    ]);

    useEffect(() => {
        if (activeRecipeId) {
            fetchDependentRecords();
        }
    }, [fetchDependentRecords, activeRecipeId, recipeMessages]);

    return {
        activeRecipeId,
        recipeMessages,
        messages: matchingMessages,
        aiAgents,
        aiSettings: matchingAiSettings,
        messageBrokers,
        brokers: matchingBrokers,
        matchingMessageIds,
        matchingAiSettingsIds,
        matchingBrokerIds,
        aiAgentRecords,
    };
}
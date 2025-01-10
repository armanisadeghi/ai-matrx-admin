import { 
    GetOrFetchSelectedRecordsPayload, 
    useAppDispatch, 
    useAppSelector, 
    useEntityTools 
} from '@/lib/redux';
import { 
    RecipeMessageDataRequired, 
    AiAgentDataRequired, 
    MessageBrokerDataRequired,
    MessageTemplateDataRequired,
    AiSettingsDataRequired,
    DataBrokerDataRequired
} from '@/types';
import React, { useEffect, useCallback } from 'react';

export function useRecipe() {
    const dispatch = useAppDispatch();

    const entityTools = React.useMemo(() => ({
        recipe: useEntityTools('recipe'),
        recipeMessage: useEntityTools('recipeMessage'),
        message: useEntityTools('messageTemplate'),
        messageBroker: useEntityTools('messageBroker'),
        dataBroker: useEntityTools('dataBroker'),
        aiAgent: useEntityTools('aiAgent'),
        aiSettings: useEntityTools('aiSettings')
    }), []);

    const {
        recipe: { selectors: recipeSelectors },
        recipeMessage: { selectors: recipeMessageSelectors },
        message: { selectors: messageSelectors, actions: messageActions },
        messageBroker: { selectors: messageBrokerSelectors },
        dataBroker: { selectors: dataBrokerSelectors, actions: dataBrokerActions },
        aiAgent: { selectors: aiAgentSelectors },
        aiSettings: { selectors: aiSettingsSelectors, actions: aiSettingsActions }
    } = entityTools;

    const activeRecipeId = useAppSelector(recipeSelectors.selectActiveRecordId);
    
    const selectedRecipeMessages = useAppSelector(recipeMessageSelectors.selectSelectedRecords) as RecipeMessageDataRequired[] ?? [];
    const selectedAiAgents = useAppSelector(aiAgentSelectors.selectSelectedRecords) as AiAgentDataRequired[] ?? [];
    const selectedMessageBrokers = useAppSelector(messageBrokerSelectors.selectSelectedRecords) as MessageBrokerDataRequired[] ?? [];
    const selectedMessages = useAppSelector(messageSelectors.selectSelectedRecords) as MessageTemplateDataRequired[] ?? [];
    const selectedAiSettings = useAppSelector(aiSettingsSelectors.selectSelectedRecords) as AiSettingsDataRequired[] ?? [];
    const selectedBrokers = useAppSelector(dataBrokerSelectors.selectSelectedRecords) as DataBrokerDataRequired[] ?? [];

    const matchingMessageIds = React.useMemo(
        () => selectedRecipeMessages
            .filter((message): message is RecipeMessageDataRequired => 
                message != null && 
                typeof message.messageId !== 'undefined' && 
                message.messageId !== null
            )
            .map((message) => message.messageId),
        [selectedRecipeMessages]
    );

    const matchingAiSettingsIds = React.useMemo(
        () => selectedAiAgents
            .filter((agent): agent is AiAgentDataRequired => 
                agent != null && 
                typeof agent.aiSettingsId !== 'undefined' && 
                agent.aiSettingsId !== null
            )
            .map((agent) => agent.aiSettingsId),
        [selectedAiAgents]
    );

    const matchingBrokerIds = React.useMemo(
        () => selectedMessageBrokers
            .filter((broker): broker is MessageBrokerDataRequired => 
                broker != null && 
                typeof broker.brokerId !== 'undefined' && 
                broker.brokerId !== null
            )
            .map((broker) => broker.brokerId),
        [selectedMessageBrokers]
    );

    const fetchMessagesPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: matchingMessageIds,
            fetchMode: 'fkIfk',
        }),
        [matchingMessageIds]
    );

    const fetchSettingsPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: matchingAiSettingsIds,
            fetchMode: 'fkIfk',
        }),
        [matchingAiSettingsIds]
    );

    const fetchBrokersPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: matchingBrokerIds,
            fetchMode: 'fkIfk',
        }),
        [matchingBrokerIds]
    );

    const fetchDependentRecords = useCallback(() => {
        if (matchingMessageIds.length > 0) {
            dispatch(messageActions.getOrFetchSelectedRecords(fetchMessagesPayload));
        }
        if (matchingAiSettingsIds.length > 0) {
            dispatch(aiSettingsActions.getOrFetchSelectedRecords(fetchSettingsPayload));
        }
        if (matchingBrokerIds.length > 0) {
            dispatch(dataBrokerActions.getOrFetchSelectedRecords(fetchBrokersPayload));
        }
    }, [
        dispatch, 
        messageActions, 
        aiSettingsActions,
        dataBrokerActions,
        fetchMessagesPayload, 
        fetchSettingsPayload,
        fetchBrokersPayload
    ]);

    useEffect(() => {
        fetchDependentRecords();
    }, [fetchDependentRecords, activeRecipeId]);

    return {
        activeRecipeId,
        // Junction Tables
        selectedRecipeMessages,
        selectedAiAgents,
        selectedMessageBrokers,
        // Main Entities
        selectedMessages,
        selectedAiSettings,
        selectedBrokers,
        // IDs for reference
        matchingMessageIds,
        matchingAiSettingsIds,
        matchingBrokerIds
    };
}
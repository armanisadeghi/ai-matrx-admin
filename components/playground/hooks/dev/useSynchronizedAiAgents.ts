import { useEffect, useCallback } from 'react';
import { createRecordKey, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { AiAgentDataRequired, AiSettingsDataRequired } from '@/types/AutomationSchemaTypes';
import { useRecipe } from './useRecipe';

export function useSynchronizedAiAgents() {
    const dispatch = useAppDispatch();
    const recipeEntity = useEntityTools('recipe');
    const aiAgentsEntity = useEntityTools('aiAgent');
    const aiSettingsEntity = useEntityTools('aiSettings');

    const activeRecipeRecordId = useAppSelector(recipeEntity.selectors.selectActiveRecordId);
    const { aiAgentRecords } = useRecipe();
    
    // Get the AI agent associated with the active recipe
    const recipeAiAgent = aiAgentRecords.find(agent => agent.recipeId === activeRecipeRecordId);
    
    // Keep track of the current active AI agent
    const activeAiAgent = useAppSelector(aiAgentsEntity.selectors.selectActiveRecord) as AiAgentDataRequired;
    const settingsMetadata = useAppSelector(aiSettingsEntity.selectors.selectEntityMetadata);

    // Synchronize the active AI agent when the recipe changes
    useEffect(() => {
        if (recipeAiAgent && (!activeAiAgent || activeAiAgent.recipeId !== activeRecipeRecordId)) {
            // The new smart action will handle whether this is a record key or simple ID
            dispatch(aiAgentsEntity.actions.setActiveRecordSmart(recipeAiAgent.id));
        }
    }, [activeRecipeRecordId, recipeAiAgent, activeAiAgent, dispatch, aiAgentsEntity.actions]);

    // Synchronize AI settings when the active agent changes
    useEffect(() => {
        if (activeAiAgent?.aiSettingsId) {
            dispatch(aiSettingsEntity.actions.setActiveRecordSmart(activeAiAgent.aiSettingsId));
        }
    }, [activeAiAgent, dispatch, aiSettingsEntity.actions]);

    // Fetch settings data if needed
    const fetchSettingsForActiveAgent = useCallback(() => {
        if (activeAiAgent?.aiSettingsId) {
            const settingsRecordKey = createRecordKey(
                settingsMetadata.primaryKeyMetadata, 
                { id: activeAiAgent.aiSettingsId }
            );
            
            dispatch(aiSettingsEntity.actions.getOrFetchSelectedRecords({
                matrxRecordIds: [settingsRecordKey],
                fetchMode: 'fkIfk'
            }));
        }
    }, [activeAiAgent, dispatch, aiSettingsEntity.actions]);

    useEffect(() => {
        fetchSettingsForActiveAgent();
    }, [activeAiAgent, fetchSettingsForActiveAgent]);

    return {
        activeAiAgent,
        aiAgentRecords,
        fetchSettingsForActiveAgent
    };
}
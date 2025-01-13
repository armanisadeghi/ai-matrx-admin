import { GetOrFetchSelectedRecordsPayload, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import React, { useEffect, useCallback } from 'react';
import { useRecipe } from './useRecipe';
import { AiAgentDataOptional, AiAgentDataRequired, AiSettingsDataRequired, MatrxRecordId } from '@/types';

export function useAiAgents() {
    const dispatch = useAppDispatch();
    const recipeEntity = useEntityTools('recipe');
    const aiAgentsEntity = useEntityTools('aiAgent');
    const aiSettingsEntity = useEntityTools('aiSettings');

    const { aiAgentRecords } = useRecipe();
    const activeAiAgent = useAppSelector(aiAgentsEntity.selectors.selectActiveRecord) as AiAgentDataRequired;

    const matchingAiSettingsIds = React.useMemo(
        () => aiAgentRecords.filter((agent) => agent?.aiSettingsId != null).map((agent) => agent.aiSettingsId),
        [aiAgentRecords]
    );
    const settingsMatrxIds = useAppSelector((state) =>
        aiSettingsEntity.selectors.selectMatrxRecordIdsBySimpleKeys(state, matchingAiSettingsIds)
    ) as MatrxRecordId[];

    const fetchSettingsPayload = React.useMemo<GetOrFetchSelectedRecordsPayload>(
        () => ({
            matrxRecordIds: settingsMatrxIds,
            fetchMode: 'fkIfk',
        }),
        [settingsMatrxIds]
    );

    const fetchSettingsForActiveAgent = useCallback(() => {
        if (settingsMatrxIds.length > 0) {
            dispatch(aiSettingsEntity.actions.getOrFetchSelectedRecords(fetchSettingsPayload));
        }
    }, [dispatch, aiSettingsEntity.actions, settingsMatrxIds, fetchSettingsPayload]);

    const AiSettingsRecords = useAppSelector((state) => aiSettingsEntity.selectors.selectRecordsByKeys(state, settingsMatrxIds)) as AiSettingsDataRequired[];

    useEffect(() => {
        fetchSettingsForActiveAgent();
    }, [activeAiAgent]);

    return {
        aiAgentRecords,
        AiSettingsRecords,
        settingsMatrxIds,
    };
}

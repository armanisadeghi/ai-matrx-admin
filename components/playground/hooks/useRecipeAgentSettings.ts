import { useCallback } from 'react';
import { EntityData, MatrxRecordId } from '@/types';
import { RelationshipProcessingHook, useRelFetchProcessing } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import { getStandardRelationship } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { processReturnResults } from '@/app/entities/hooks/crud/useDirectRelCreate';

type AiSettingsData = {
    id: string;
    aiEndpoint?: string;
    aiModel?: string;
    aiProvider?: string;
    maxTokens?: number;
    presetName?: string;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stream?: boolean;
    responseFormat?: string;
    size?: string;
    quality?: string;
    count?: number;
    audioVoice?: string;
    audioFormat?: string;
    modalities?: Record<string, unknown>;
    tools?: Record<string, unknown>;
    aiProviderReference?: EntityData<'aiProvider'>[];
    aiEndpointReference?: EntityData<'aiEndpoint'>[];
    aiModelReference?: EntityData<'aiModel'>[];
    aiAgentInverse?: EntityData<'aiAgent'>[];
};

type AiAgentData = {
    id: string;
    name: string;
    recipeId?: string;
    aiSettingsId?: string;
    systemMessageOverride?: string;
    aiSettingsReference?: EntityData<'aiSettings'>[];
    recipeReference?: EntityData<'recipe'>[];
};

export function useRecipeAgentSettings(recipeSettingsHook: RelationshipProcessingHook) {
    const dispatch = useAppDispatch();
    const { actions: aiSettingsActions, selectors: aiSettingsSelectors } = useEntityTools('aiSettings');
    const { actions: aiAgentActions, selectors: aiAgentSelectors } = useEntityTools('aiAgent');

    const {
        mapper: settingsMapper,
        JoiningEntityRecords: aiAgents,
        joiningMatrxIds: agentMatrxIds,
        childIds: settingsIds,
        childMatrxIds: settingsMatrxIds,
        childRecords: coreSettings,
        processedChildRecords: processedSettings,
        parentId: recipePkId,
        parentMatrxid: recipeMatrxId,
        deleteChildAndJoin: deleteSettings,
        createRelatedRecords: createRecipeSettingsAgent,
        isLoading: aiSettingsIsLoading,
        loadingState: aiSettingsLoadingState,
    } = recipeSettingsHook;


    const handleError = useCallback((error: Error) => {
        console.error('Error creating settings and agent:', error);
    }, []);

    const createNewSettingsData = useCallback(
        async (
            settingsData: AiSettingsData,
            agentData: AiAgentData,
            filter?: boolean
        ): Promise<{
            aiSettingsRecord: AiSettingsData;
            aIAgentRecord: AiAgentData;
            newAiSettingsMatrxId: MatrxRecordId;
            newAiAgentRecordId: MatrxRecordId;
        }> => {
            const data = {
                child: settingsData,
                joining: agentData,
            };

            try {
                const result = await createRecipeSettingsAgent(
                    data,
                    {
                        showIndividualToasts: false,
                        showCombinedToast: false,
                    },
                    filter
                );

                if (!result) {
                    throw new Error('Failed to create related records: No result returned');
                }

                const {
                    childRecord: aiSettingsRecord,
                    joinRecord: aIAgentRecord,
                    childMatrxRecordId: newAiSettingsMatrxId,
                    joinMatrxRecordId: newAiAgentRecordId,
                } = processReturnResults([result]);

                dispatch(aiSettingsActions.addToSelection(newAiSettingsMatrxId));
                dispatch(aiAgentActions.addToSelection(newAiAgentRecordId));

                return {
                    aiSettingsRecord: aiSettingsRecord as AiSettingsData,
                    aIAgentRecord: aIAgentRecord as AiAgentData,
                    newAiSettingsMatrxId,
                    newAiAgentRecordId,
                };
            } catch (error) {
                handleError(error as Error);
                throw error;
            }
        },
        [createRecipeSettingsAgent, dispatch, aiSettingsActions, handleError]
    );

    return {
        settingsMapper,
        aiAgents,
        agentMatrxIds,
        settingsIds,
        settingsMatrxIds,
        coreSettings,
        processedSettings,
        recipePkId,
        recipeMatrxId,
        deleteSettings,
        createNewSettingsData,
        aiSettingsIsLoading,
        aiSettingsLoadingState,
    };
}

export type UseRecipeAgentSettingsHook = ReturnType<typeof useRecipeAgentSettings>;

export function useRelatedAiSettings(recipeMatrxId: MatrxRecordId) {
    const relDef = getStandardRelationship('aiAgent');
    const relationshipHook = useRelFetchProcessing(relDef, recipeMatrxId);
    return useRecipeAgentSettings(relationshipHook);
}
